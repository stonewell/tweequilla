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
 
// adapted from SocialMail

var EXPORTED_SYMBOLS = ["oauthTokenMgr"];

/* CONSTRUCTOR */

// applicatiion is the name of the extension that would be meaningful to the user.
// secret is the token access secret. The access token itself is stored in preferences.
function oauthTokenMgr(application, username)
{
  this.mService  = "http://twitter.com";
  this.mRealm    = application;
  this.mUsername = username;
  this.pwdMgr    = Components.classes["@mozilla.org/login-manager;1"]
                                     .getService(Components.interfaces.nsILoginManager);  

  this.store = function _store(secret) {
    var nsLoginInfo   = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                                   Components.interfaces.nsILoginInfo, "init");  

    var loginInfo = new nsLoginInfo(this.mService, null, this.mRealm, this.mUsername, secret, "", ""); 
    this._search(loginInfo);
  }
  
  this.retrieve = function _retrieve() {
    var logins = this.pwdMgr.findLogins({}, this.mService, null, this.mRealm);             
    var secret = null;
    for (var i = 0; i < logins.length; i++) {
      if (logins[i].username != this.mUsername)
        continue;
      secret = logins[i].password;  
      return secret;  
    }
    // secret not found
    return null;
  }

  this.delete = function _delete() {
    this._search();
  }  

  this._search = function _search(data) {
    //for (name in this)
    //  dump(name + " = " + this[name] + "\n");
    var logins = this.pwdMgr.findLogins({}, this.mService, null, this.mRealm);  
    for (var i = 0; i < logins.length; i++)
    {
      //dump("Does <" + logins[i].username + "> == <" + this.mUsername + "> ?\n");
      if (logins[i].username == this.mUsername)
        this.pwdMgr.removeLogin(logins[i]);
    }  
    if (data != null) {
      this.pwdMgr.addLogin(data); 
    }
  }
}
