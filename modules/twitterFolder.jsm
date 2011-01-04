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

function re(error)
{
  if (error)
    dump('javascript error: ' + error + '\n');
  let jsFrame;
  if (!error || !(jsFrame = error.stack))
    jsFrame = Components.stack;
  while (jsFrame)
  {
    dump(jsFrame.toString() + '\n');
    jsFrame = jsFrame.caller;
  }
  if (error)
  {
    Cu.reportError(error);
    throw(error);
  }
}

function dl(t) {
  dump(t + "\n");
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
  this.__proto__.__proto__ = folder;

  folder.saveServerType("twitter");

  // define the overrides
  // Get the parent cpp class to allow calling overridden base functions
  this.jsFolder = new TwitterFolderOverride(folder);
  folder.jsParent = this.jsFolder;
  folder.override("msqSgMailFolderOverridable::UpdateFolder");
  folder.override("msqSgMailFolderOverridable::GetSubFolders");

}

function TwitterFolderOverride(aFolder) {
  this.wrappedJSObject = this;
  // initialization of member variables
  this.baseFolder = aFolder;
  this.mNeedFolderLoadedEvent = false;
  this.needsBaseFolders = true;
}

TwitterFolderOverride.prototype = 
{
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgFolder]),

  // **** nsIMsgFolder overrides
  updateFolder: function _updateFolder(aWindow)
  { try {
    let server = this.baseFolder.server;
    this.mNeedFolderLoadedEvent = true;
    server instanceof Ci.msqIOverride;
    let twh = server.jsParent.wrappedJSObject.serverHelper;

    // todo: use the context only to pass context, not a new FolderListener instance?
    let listener = new FolderListener(this.baseFolder);

    // determine the action to take
    let action = null;
    try {
      action = this.baseFolder.getStringProperty("TwitterAction");
    } catch(e) {}
    if (action == "UserTimeline")
      twh.statuses.user_timeline(listener.callback, listener.errorCallback, this, "json");
    else if (action == "FriendsTimeline")
      twh.statuses.friends_timeline(listener.callback, listener.errorCallback, this, "json");
    else if (action == "HomeTimeline")
      twh.statuses.home_timeline(listener.callback, listener.errorCallback, this, "json");
    else if (action == "Mentions")
      twh.statuses.mentions(listener.callback, listener.errorCallback, this, "json");
    else if (action == "RetweetsOfMe")
      twh.statuses.retweets_of_me(listener.callback, listener.errorCallback, this, "json");
    else if (action == "RetweetedByMe")
      twh.statuses.retweeted_by_me(listener.callback, listener.errorCallback, this, "json");
    else if (action == "Lists")
      twh.lists.get(listener.listsCallback, listener.errorCallback, this, "json", server.username);
    else if (action == "ListTimeline")
      twh.lists.timeline(listener.callback, listener.errorCallback, this, "json",
                         server.username, this.baseFolder.getStringProperty("ListId"), null, 2);
    else if (action == "Nothing") // mostly for debugging
      this.notifyFolderLoaded();
    else
      throw("Unrecognized twitter action");

  } catch(e) {re(e);}},

  get subFolders()
  { try {
    let base = this.baseFolder.base.QueryInterface(Ci.nsIMsgFolder);
    if (base.isServer && this.needsBaseFolders)
    {
      this.needsBaseFolders = false;
      this.makeStandardFolders(base);
    }
    let subFolders = base.subFolders;
    return subFolders;
  } catch(e) {re(e);}},

  // **** local methods
  // create if needed standard Twitter folders
  makeStandardFolders: function _makeStandardFolders(aRootMsgFolder)
  { try {

    function makeFolder(aName, aTwitterAction)
    {
      let msgFolder;
      try 
      {
        msgFolder = aRootMsgFolder.getChildNamed(aName);
      } 
      catch (e)
      {
        msgFolder = aRootMsgFolder.addSubfolder(aName);
        msgFolder.setFlag(Ci.nsMsgFolderFlags.CheckNew);
      }
      msgFolder.setStringProperty("TwitterAction", aTwitterAction);
      return msgFolder;
    }
      
    let sentMsgFolder = makeFolder("My Tweets", "UserTimeline");
    sentMsgFolder.setFlag(Ci.nsMsgFolderFlags.SentMail);

    makeFolder("Timeline", "HomeTimeline");
    makeFolder("Mentions", "Mentions");
    makeFolder("Retweets of me", "RetweetsOfMe");
    makeFolder("Retweeted by me", "RetweetedByMe");
    makeFolder("My Lists", "Lists");
  } catch (e) {re(e);}},

  reconcileFolder: function _reconcileFolder(aJso)
  {
    for (item in aJso)
      this.reconcileItem(aJso[item]);
  },

  reconcileItem: function _reconcileItem(aJsItem)
  { try {
    /*
    for (name1 in aJsItem)
    {
     dump(name1 + ": " + aJsItem[name1] + "\n");
     if (name1 == "user")
       for (name2 in aJsItem[name1])
         dump(name1 + "." + name2 + ": " + aJsItem[name1][name2] + "\n");
    }
    */
    // add to database if needed
    let db = this.baseFolder.msgDatabase;
    let existingMsg = db.getMsgHdrForMessageID(aJsItem.id_str);
    if (existingMsg)
    {
      //dump("found existing message, subject is " + existingMsg.subject + "\n");
      // update items that might change
      existingMsg.markFlagged(aJsItem.favorited);
      return;
    }
    // add new hdr to the database
    let fi = db.dBFolderInfo;
    let nextKey = fi.highWater + 1;
    let newMessage = db.CreateNewHdr(nextKey);
    fi.highWater = nextKey;

    // For retweets, we will use the original message, but keep a retweet
    //  field with the screen name of the retweeter, and keep the date
    //  of the retweet

    newMessage.date = 1000 * Date.parse(aJsItem.created_at);
    newMessage.messageId = aJsItem.id_str;
    newMessage.markFlagged(aJsItem.favorited);

    if (aJsItem.retweeted_status)
    {
      newMessage.setProperty("retweet", "@" + aJsItem.user.screen_name);
      aJsItem = aJsItem.retweeted_status;
    }

    newMessage.author = "@" + aJsItem.user.screen_name;
    newMessage.setUint32Property("notAPhishMessage", 1);
    newMessage.subject = mimeEncodeSubject(aJsItem.text, 'UTF-8');

    let inReplyTo = aJsItem.in_reply_to_status_id_str;
    if (inReplyTo && inReplyTo.length)
      newMessage.setReferences(inReplyTo);
    dump("\nAdding new message with subject <" + newMessage.mime2DecodedSubject + "> key " + nextKey + "\n");
    db.AddNewHdrToDB(newMessage, true);
    return;
  } catch(e) {re(e)}},

  // aJsLists: the lists json from twitter
  // aJsFolder: the local js version of the Lists folder (parent to the lists)
  reconcileLists: function _reconcileLists(aJsLists, aJsFolder)
  {
    let skinkFolder = aJsFolder.baseFolder;

    // Get a list of existing subfolders
    let subfolders = skinkFolder.subfolders;
    let subfoldersFound = {};
    while (subfolders && subfolders.hasMoreElements())
    {
      let folder = subfolders.getNext()
                             .QueryInterface(Ci.nsIMsgFolder);
      subfoldersFound[folder.name] = false;
    }

    // Find and add if needed the lists
    for (index in aJsLists)
    {
      let name = aJsLists[index].name;
      let newFolder;
      try {
        newFolder = skinkFolder.getChildNamed(name);
      } catch(e) {
        newFolder = skinkFolder.addSubfolder(name);
        newFolder.setFlag(Ci.nsMsgFolderFlags.CheckNew);
      }
      newFolder.setStringProperty("TwitterAction", "ListTimeline");
      newFolder.setStringProperty("ListId", aJsLists[index].id_str);
      subfoldersFound[name] = true;
      //dl('Found list ' + name + ' at ' + index);
    }

    // delete any subfolders that no longer exist
    for (name in subfoldersFound)
    {
      if (!subfoldersFound[name])
      {
        try {
          let folderToDelete = skinkFolder.getChildNamed(name);
          if (!folderToDelete.getFlag(Ci.nsMsgFolderFlags.Virtual))
            skinkFolder.propagateDelete(folderToDelete, true, null);
        } catch(e) {}
      }
    }
  },

  notifyFolderLoaded: function _notifyFolderLoaded()
  { try {
    if (this.mNeedFolderLoadedEvent)
    {
      this.baseFolder.NotifyFolderEvent(gFolderLoadedAtom);
      this.mNeedFolderLoadedEvent = false;
    }
  } catch(e) {re(e);}},

}

function FolderListener(aFolder)
{
  this.baseFolder = aFolder;
}

FolderListener.prototype =
{
  callback: function __callback(aTwh, aJson, jsFolder)
  {
    jsFolder.reconcileFolder(aJson);
    jsFolder.notifyFolderLoaded();
  },
  errorCallback: function _errorCallback(aTwitterHelper, aXmlRequest, aContext)
  {
    re('Error twitter callback status is ' + aXmlRequest.status);
  },
  listsCallback: function _listsCallback(aTwh, aJson, jsFolder)
  {
    //dl('listsCallback');
    jsFolder.reconcileLists(aJson.lists, jsFolder);
    jsFolder.notifyFolderLoaded();
  },

}

var gUnicodeConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                  .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
gUnicodeConverter.charset = "UTF-8";

// adapted from FeedItem.js
function mimeEncodeSubject(aSubject, aCharset)
{
  // Get the mime header encoder service
  var mimeEncoder = Components.classes["@mozilla.org/messenger/mimeconverter;1"]
                              .getService(Components.interfaces.nsIMimeConverter);

  // This routine sometimes throws exceptions for mis-encoded data so
  // wrap it with a try catch for now..
  var newSubject;
  try
  {
    newSubject = mimeEncoder.encodeMimePartIIStr_UTF8(aSubject, false, aCharset, 9, 141);
  }
  catch (ex)
  {
    dl('mime encoder failed ' + ex);
    newSubject = aSubject;
  }

  return newSubject;
}
