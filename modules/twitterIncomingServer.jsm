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
 
 var EXPORTED_SYMBOLS = ["TwitterIncomingServer"];

// Create a new twitter server, with an underlying nsIMsgIncomingServer base
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

// twitter helper for this server
var gTwitterHelper = null;

Cu.import("resource:///modules/XPCOMUtils.jsm");
Cu.import("resource://tweequilla/twitterHelper.jsm");
Cu.import("resource://tweequilla/twitterConsumer.jsm");
Cu.import("resource://tweequilla/oauthTokenMgr.jsm");

function re(error)
{
  dump('javascript error: ' + error + '\n');
  let jsFrame = error.stack;
  if (!jsFrame)
    jsFrame = Components.stack;
  while (jsFrame)
  {
    dump(jsFrame.toString() + '\n');
    jsFrame = jsFrame.caller;
  }
  Cu.reportError(error);
  throw(error);
}

function dl(t) {
  dump(t + "\n");
}

function TwitterIncomingServer()
{ try {
  let server = Cc["@mesquilla.com/sgincomingserver;1"]
                 .createInstance(Ci.nsIMsgIncomingServer);
  server instanceof Ci.msqISgIncomingServer;
  server instanceof Ci.msqIOverride;
  //dl("Ci.msqISgIncomingServer is " + Ci.msqISgIncomingServer);
  //dl("Ci.msqIOverride is " + Ci.msqIOverride);
  //if (server instanceof Ci.msqIOverride)
  //  dl("server is an msqIOverride");
  //else
  //  dl("!server is NOT an msqIOverride");
  this.__proto__.__proto__ = server;

  // define the overrides
  this.jsServer = new TwitterIncomingServerOverride(server);
  server.jsParent = this.jsServer;
  server.override("msqSgIncomingServerOverridable::GetNewMessages");
  server.override("msqSgIncomingServerOverridable::PerformBiff");
  server.override("msqSgIncomingServerOverridable::GetLocalPath");
  server.override("msqSgIncomingServerOverridable::GetServerRequiresPasswordForBiff");
  server.override("msqSgIncomingServerOverridable::GetCanSearchMessages");
  server.override("msqSgIncomingServerOverridable::GetCanHaveFilters");

  // initializations
  server.saveLocalStoreType("twitter");
  server.saveAccountManagerChrome("am-serverwithnoidentities.xul");

} catch(e) {re(e);}}

function TwitterIncomingServerOverride(aIncomingServer) {
  // initialization of member variables
  this.wrappedJSObject = this;
  this.baseServer = aIncomingServer;
}

TwitterIncomingServerOverride.prototype = 
{
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgIncomingServer]),

  // **** nsIMsgIncomingServer overrides
  getNewMessages: function _getNewMessages(aFolder, aMsgWindow, aUrlListener)
  { try {
    //dl('getNewMessages for folder ' + aFolder.name);
    let subfolders = Cc["@mozilla.org/supports-array;1"]
                       .createInstance(Ci.nsISupportsArray);
    aFolder.ListDescendents(subfolders);
    //dl('found ' + subfolders.Count() + ' descendents');
    for (let index = 0; index < subfolders.Count(); index++)
    {
      let folder = subfolders.QueryElementAt(index, Ci.nsIMsgFolder);
      if (folder.getFlag(Ci.nsMsgFolderFlags.CheckNew))
      {
        //dl('need to update folder ' + folder.name);
        folder.updateFolder(aMsgWindow);
      }
    }
  } catch(e) {re(e);}},

  performBiff: function _performBiff(aMsgWindow)
  { try {
    //dl('performBiff');
    let server = this.baseServer;
    server.getNewMessages(server.rootMsgFolder, aMsgWindow, null);
  } catch(e) {re(e);}},

  get serverRequiresPasswordForBiff()
  {
    return false;
  },

  get localPath()
  { try {
    let server = this.baseServer;

    let serverPath;
    try {
      serverPath = server.getFileValue("directory-rel", "directory");
    } catch (e) {}
    if (serverPath)
      return serverPath;

    let protocolInfo = Cc["@mozilla.org/messenger/protocol/info;1?type=" + server.type]
                         .getService(Ci.nsIMsgProtocolInfo);
    let defaultLocalPath = protocolInfo.defaultLocalPath;
    // Create if needed. Normal error is file exists
    try {
      defaultLocalPath.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
    } catch(e) {}
    if (!defaultLocalPath.exists())
      throw "Local path for twitter account could not be created";

    serverPath = defaultLocalPath.clone();
    serverPath.append(server.realUsername + '@' + server.hostName);
    // Create if missing. Normal error is directory exists, which implies that
    //  we are recreating a twitter account, and will then use the old account
    //  directory.
    try {
      serverPath.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
    } catch (e) {}
    if (!serverPath.exists())
      throw ('could not create account path for twitter account');

    server.localPath = serverPath;
    return serverPath;
  }  catch(e) {re(e);}},

  get canSearchMessages()
  {
    return true;
  },

  get canHaveFilters()
  {
    return false;
  },

  // **** local methods
  
  /**
   * Send a tweet (status, reply, or retweet)
   *
   * aText (string): the text of the tweet
   * aType (string): the type of tweet
   *                   null or "status" : simple status update
   *                   "reply"          : reply to existing tweet
   *                   "retweet"        : retweet of existing tweet
   * aInReplyTo    : for reply or retweet, the status id of the original tweet
   */
  sendStatusUpdate: function _sendStatusUpdate(aText, aType, aInReplyTo)
  {
    if (!aType || aType == "status")
      return this.serverHelper.statuses.update
        (this.normalCallback, this.errorCallback, null, 'json', aText);
    if (aType == "reply")
      return this.serverHelper.statuses.update
        (this.normalCallback, this.errorCallback, null, 'json', aText, aInReplyTo);
    if (aType == "retweet")
      return this.serverHelper.statuses.retweet 
        (this.normalCallback, this.errorCallback, null, 'json', aInReplyTo);
    else
      throw "Unknown status update type";
  },

  get serverHelper()
  {
    if (gTwitterHelper)
      return gTwitterHelper;
    let twitterConsumer = new TwitterConsumer();
    // get the authorization token and secret
    let server = this.baseServer;
    let token = server.getUnicharValue("accessToken");
    let pwdMgr = new oauthTokenMgr("tweequilla", server.username);
    let secret = pwdMgr.retrieve();
    twitterConsumer.accessToken = token;
    twitterConsumer.accessTokenSecret = secret;
    let gTwitterHelper = new TwitterHelper(twitterConsumer, null, "twitter");
    return gTwitterHelper;
  },

  normalCallback: function _normalCallback()
  {
    dl('Normal twitter callback');
  },

  errorCallback: function _errorCallback(aTwitterHelper, aXmlRequest, aContext)
  {
    re('Error twitter callback status is ' + aXmlRequest.status);
    dl(aXmlRequest.responseText);
  },
  
}

// json pretty print from http://stackoverflow.com/questions/130404/javascript-data-formatting-pretty-printer
function dumpObjectIndented(obj, indent)
{
  var result = "";
  if (indent == null) indent = "";

  for (var property in obj)
  {
    var value = obj[property];
    if (typeof value == 'string')
      value = "'" + value + "'";
    else if (typeof value == 'object')
    {
      if (value instanceof Array)
      {
        // Just let JS convert the Array to a string!
        value = "[ " + value + " ]";
      }
      else
      {
        // Recursive dump
        // (replace "  " by "\t" or something else if you prefer)
        var od = DumpObjectIndented(value, indent + "  ");
        // If you like { on the same line as the key
        //value = "{\n" + od + "\n" + indent + "}";
        // If you prefer { and } to be aligned
        value = "\n" + indent + "{\n" + od + "\n" + indent + "}";
      }
    }
    result += indent + "'" + property + "' : " + value + ",\n";
  }
  return result.replace(/,\n$/, "");
}
