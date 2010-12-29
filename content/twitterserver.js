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
 
// adapted from SocialMail addon

if (!tweequilla)
  var tweequilla = {};

var gAccount = null;

tweequilla.twitterserver = function _twitterserver() {
  let Ci = Components.interfaces;
  let Cc = Components.classes;
  let Cu = Components.utils;

  Cu.import("resource://tweequilla/twitterHelper.jsm");
  Cu.import("resource://tweequilla/twitterConsumer.jsm");
  Cu.import("resource://tweequilla/oauthTokenMgr.jsm");

  var me = {};

  me.twitterConsumer = new TwitterConsumer();
  me.twh = new TwitterHelper(me.twitterConsumer, null, "twitter");

  me.requestOAuthToken = function _requestOAuthToken()
  {
    var twh = tweequilla.twitterserver.twh;
    var callback = function _callback(url)
    {
      dump("requestOAuthToken callback\n");
      Cc["@mozilla.org/messenger;1"]
        .createInstance(Ci.nsIMessenger)
        .launchExternalURL(url);
    };
    twh.getAuthUrl(callback);
    document.getElementById("step3btn").disabled = false;
  }

  me.requestOAuthAccess = function _requestOAuthAccess()
  {
    var twh = tweequilla.twitterserver.twh;
    var oauth_verifier = document.getElementById("oathPin").value;
    var callback = function _callback(consumer, screen_name)
    { try {
      dump("requestOathAccess callback\n");
      if (screen_name != "")
      {
        //consumer is complete, save the accesstoken and secret
        var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
        document.getElementById("server.realUsername").value = screen_name;
        dump("accessToken is " + consumer.accessToken + "\n");
        dump("accessTokenSecret is " + consumer.accessTokenSecret + "\n");
        dump("screen_name is " + screen_name + "\n");
        dump("storing in pwdMgr\n");
        var pwdMgr = new oauthTokenMgr("tweequilla", screen_name);
        pwdMgr.store(consumer.accessTokenSecret);
        document.getElementById("server.accessToken").value = consumer.accessToken;
        document.getElementById("dummy.accessTokenSecret").value = consumer.accessTokenSecret;
        alert("Twitter Registration Succeeded");
      }
      else
      {
        alert("Twitter Registration Failed");
      }
    } catch (e) {dump(e) + "\n";}};
    twh.getAccessToken(oauth_verifier, callback);
    document.getElementById("oathPin").value = "";
    document.getElementById("step3btn").disabled = true;
  }

  // need to move this to after onAccept
  me.onSave = function _onSave()
  {
    try {
    dump("twitterserver onSave\n");
    /*
    Components.utils.import("resource://tweequilla/oauthTokenMgr.jsm");

    // We need to save the secret, but not in the preferences. So we will add this
    //  to the password manager. If for some reason the account dialog is cancelled, then
    //  this just becomes an unused password which we should clean up later.

    let username = document.getElementById("server.realUsername").value;
    var pwdMgr = new oauthTokenMgr("tweequilla", username);
    let secret = document.getElementById("dummy.accessTokenSecret").value;
    if (secret.length > 0)
      pwdMgr.store(secret);
    dump("accessTokenSecret2 is " + pwdMgr.retrieve() + "\n");
    */
    } catch (e) {dump(e) + "\n";}
  }

  return me;
}()
