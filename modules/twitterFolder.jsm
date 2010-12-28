/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is TweeQuilla.
 *
 * The Initial Developer of the Original Code is
 * R. Kent James <kent@caspia.com>.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
 
 var EXPORTED_SYMBOLS = ["TwitterFolder"];

// Create a new twitter folder, with an underlying nsIMsgFolder base
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource:///modules/XPCOMUtils.jsm");
Cu.import("resource://tweequilla/twitterHelper.jsm");
Cu.import("resource://tweequilla/twitterConsumer.jsm");
Cu.import("resource://tweequilla/oauthTokenMgr.jsm");

function createAtom(aName)
{
  return Cc["@mozilla.org/atom-service;1"]
    .getService(Ci.nsIAtomService).getAtom(aName);
}

var gFolderLoadedAtom = createAtom("FolderLoaded");

function re(e) {
  dump(e + "\n");
}

function TwitterFolder()
{
  let folder = Cc["@mesquilla.com/sgmailfolder;1"]
                 .createInstance(Ci.nsIMsgFolder);
  folder instanceof Ci.nsIDBChangeListener;
  folder instanceof Ci.nsIUrlListener;
  folder instanceof Ci.nsIJunkMailClassificationListener;
  folder instanceof Ci.nsIMsgTraitClassificationListener;
  folder instanceof Ci.nsIRDFResource;
  folder instanceof Ci.msqISgMailFolder;
  folder instanceof Ci.msqIOverride;
  this.sgFolder = folder;
  this.__proto__.__proto__ = folder;

  folder.saveServerType("twitter");

  // define the overrides
  // Get the parent cpp class to allow calling overridden base functions
  this.jsFolder = new TwitterFolderOverride(this);
  folder.jsParent = this.jsFolder;
  folder.override("msqSgMailFolderOverridable::UpdateFolder");

}

function TwitterFolderOverride(aFolder) {
  this.wrappedJSObject = this;
  // initialization of member variables
  this.compositeFolder = aFolder;
  this.mNeedFolderLoadedEvent = false;
}

TwitterFolderOverride.prototype = 
{
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgFolder]),

  // **** nsIMsgFolder overrides
  updateFolder: function _updateFolder(aWindow)
  { try {
    let server = this.compositeFolder.sgFolder.server;
    this.mNeedFolderLoadedEvent = true;
    let twitterConsumer = new TwitterConsumer();
    // get the authorization token and secret
    let token = server.getUnicharValue("accessToken");
    //dump("token is " + token + "\n");
    //dump("username is " + server.username + "\n");
    let pwdMgr = new oauthTokenMgr("tweequilla", server.username);
    let secret = pwdMgr.retrieve();
    //dump("secret is " + secret + "\n");
    twitterConsumer.accessToken = token;
    twitterConsumer.accessTokenSecret = secret;
    let twh = new TwitterHelper(twitterConsumer, null, "twitter");
    // todo: use the context only to pass context, not a new FolderListener instance?
    let listener = new FolderListener(this.compositeFolder);

    // determine the action to take
    let action = null;
    try {
      action = this.compositeFolder.sgFolder.getStringProperty("TwitterAction");
    } catch(e) {}
    //dump("TwitterAction <" + action + "> for folder " + this.compositeFolder.sgFolder.name + "\n");
    if (!action || action == "UserTimeline")
      twh.statuses.user_timeline(listener.callback, listener.errorCallback, this.compositeFolder, "json");
    else if (action == "FriendsTimeline")
      twh.statuses.friends_timeline(listener.callback, listener.errorCallback, this.compositeFolder, "json");
    else
      dump("Unrecognized twitter action\n");

  } catch(e) {re(e);}},

  // **** local methods
  reconcileFolder: function _reconcileFolder(aJso)
  {
    for (item in aJso)
      this.reconcileItem(aJso[item]);
  },

  reconcileItem: function _reconcileItem(aJsItem)
  { try {
    dump("reconcile item:\n");
    /*
    for (name1 in aJsItem)
    {
     dump(name1 + ": " + aJsItem[name1] + "\n");
     if (name1 == "user")
       for (name2 in aJsItem[name1])
         dump(name1 + "." + name2 + ": " + aJsItem[name1][name2] + "\n");
    }
    */
    dump("twitter status text: " + aJsItem.text + "\n");
    // add to database if needed
    let db = this.compositeFolder.sgFolder.msgDatabase;
    let existingMsg = db.getMsgHdrForMessageID(aJsItem.id_str);
    if (existingMsg)
    {
      dump("found existing message, subject is " + existingMsg.subject + "\n");
      return;
    }
    // add new hdr to the database
    let fi = db.dBFolderInfo;
    let nextKey = fi.highWater + 1;
    let newMessage = db.CreateNewHdr(nextKey);
    fi.highWater = nextKey;
    newMessage.subject = aJsItem.text;
    newMessage.messageId = aJsItem.id_str;
    newMessage.date = 1000 * Date.parse(aJsItem.created_at);
    newMessage.author = "@" + aJsItem.user.screen_name;
    newMessage.setUint32Property("notAPhishMessage", 1);
    dump("\nAdding new message with subject <" + newMessage.subject + "> key " + nextKey + "\n");
    db.AddNewHdrToDB(newMessage, true);
    return;
  } catch(e) {re(e)}},

  notifyFolderLoaded: function _notifyFolderLoaded()
  { try {
    if (this.mNeedFolderLoadedEvent)
    {
      dump("sending FolderLoaded event\n");
      this.compositeFolder.sgFolder.NotifyFolderEvent(gFolderLoadedAtom);
      this.mNeedFolderLoadedEvent = false;
    }
    else
      dump("FolderLoaded not needed\n");
  } catch(e) {re(e);}},

}

function FolderListener(aFolder)
{
  dump("new FolderListener for aFolder " + aFolder + "\n");
  this.compositeFolder = aFolder;
}

FolderListener.prototype =
{
  callback: function __callback(aTwh, aJson, aContext)
  {
    //dump("FolderListener regular callback aContext <" + aContext + ">\n");
    let folder = aContext;
    //dump("FolderListener.callback for folder " + folder.sgFolder.name + "\n");
    /*
    for (name in aJson)
    {
      dump(name + ":(" + typeof(aJson[name]) + ") ");
      if (typeof(aJson[name]) == "object")
      {
        for (name1 in aJson[name])
          dump("\n" + name1 + ": " + aJson[name][name1]);
      }
      else
        dump(aJson[name]);
      dump("\n");
    }
    */
    folder.jsFolder.reconcileFolder(aJson);
    folder.jsFolder.notifyFolderLoaded();
  },
  errorCallback: function _errorCallback() { dump("errorCallback\n");},
}
