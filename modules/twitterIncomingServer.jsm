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

function re(e) {
  dump(e + "\n");
}

function dl(t) {
  dump(t + "\n");
}

function TwitterIncomingServer()
{
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
  this.jsServer = new TwitterIncomingServerOverride(this);
  server.jsParent = this.jsServer;
  //server.override("msqSgMailIncomingServerOverridable::UpdateFolder");

  // initializations
  server.saveLocalStoreType("twitter");
  server.saveAccountManagerChrome("am-serverwithnoidentities.xul");

}

function TwitterIncomingServerOverride(aIncomingServer) {
  // initialization of member variables
  this.wrappedJSObject = this;
  this.baseServer = aIncomingServer;
}

TwitterIncomingServerOverride.prototype = 
{
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgIncomingServer]),

  // **** nsIMsgIncomingServer overrides

  // **** local methods
  sendStatusUpdate: function _sendStatusUpdate(text)
  {
    this.serverHelper().statuses.update(this.normalCallback, this.errorCallback, null, 'json', text);
  },

  serverHelper: function _serverHelper()
  {
    if (gTwitterHelper)
      return gTwitterHelper;
    let twitterConsumer = new TwitterConsumer();
    // get the authorization token and secret
    let server = this.baseServer;
    let token = server.getUnicharValue("accessToken");
    //dump("token is " + token + "\n");
    //dump("username is " + server.username + "\n");
    let pwdMgr = new oauthTokenMgr("tweequilla", server.username);
    let secret = pwdMgr.retrieve();
    //dump("secret is " + secret + "\n");
    twitterConsumer.accessToken = token;
    twitterConsumer.accessTokenSecret = secret;
    let gTwitterHelper = new TwitterHelper(twitterConsumer, null, "twitter");
    return gTwitterHelper;
  },

  normalCallback: function _normalCallback()
  {
    dl('Normal twitter callback');
  },

  errorCallback: function _errorCallback()
  {
    dl('Error twitter callback');
  },
  
}
