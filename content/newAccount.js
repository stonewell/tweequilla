/*
 * ***** BEGIN LICENSE BLOCK *****
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
 * The Original Code is Mozilla Communicator client code, released
 * March 31, 1998.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998-1999
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Manuel Reimer <Manuel.Reimer@gmx.de>
 *   R. Kent James <kent@caspia.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * This function is adapted from AccountWizard.js by R. Kent James
 *
 * ***** END LICENSE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;

var contentWindow;

// event handlers
function onLoad() {
  dump("onLoad\n");
}

function onNewCancel()
{
  dump("onNewCancel\n");
}

function onNewAccept()
{
  dump("onNewAccept\n");
  try {

    // transfer all attributes from the user interface

    let accountData = {
      type: "twitter",
      server: {},
      identity: null
    };

    accountData.server.hostName = "twitter.com";
    accountData.server.port = 80;
    accountData.server.username = document.getElementById("server.realUsername").value;
    accountData.server.accessToken = document.getElementById("server.accessToken").value;
    dump("accessToken is " + accountData.server.accessToken + "\n");
    accountData.server.type = "twitter";
    let am = Cc["@mozilla.org/messenger/account-manager;1"]
               .getService(Ci.nsIMsgAccountManager);
    let account = am.createAccount();
    account.incomingServer = am.createIncomingServer(accountData.server.username,
                                                     accountData.server.hostName,
                                                     accountData.server.type);
    finishAccount(account, accountData) 
    return true;
  } catch (e) {dump(e + "\n");}

}

// given an accountData structure, copy the data into the
// given account, incoming server, and so forth
function finishAccount(account, accountData)
{ try {
  if (accountData.server) {

    var destServer = account.incomingServer;
    var srcServer = accountData.server;
    copyObjectToInterface(destServer, srcServer, true);

    // also save the secret
    let secret = document.getElementById("dummy.accessTokenSecret").value;
    dump("secret is " + secret + "\n");
    // We need to save the secret, but not in the preferences. So we will add this
    //  to the password manager.
    Components.utils.import("resource://tweequilla/oauthTokenMgr.jsm");
    let username = account.incomingServer.username;
    dump("username is " + username + "\n");
    let pwdMgr = new oauthTokenMgr("tweequilla", username);
    pwdMgr.store(secret);

    account.incomingServer.valid = true;
    // hack to cause an account loaded notification now the server is valid
    account.incomingServer = account.incomingServer;
  }

} catch (e) {dump("finishAccount: " + e + "\n");}}

// copy over all attributes from dest into src that already exist in src
// the assumption is that src is an XPConnect interface full of attributes
// @param useGenericFallback if we can't set an attribute directly on src, then fall back
//        and try setting it generically.
function copyObjectToInterface(dest, src, useGenericFallback) 
{
  if (!dest) return;
  if (!src) return;

  var attribute;
  for (attribute in src) 
  {
    if (dest.__lookupSetter__(attribute))
    {
      if (dest[attribute] != src[attribute])
        dest[attribute] = src[attribute];
    } 
    else if (useGenericFallback) // fall back to setting the attribute generically
      setGenericAttribute(dest, src, attribute);
  } // for each attribute in src we want to copy
}

// Helper method used by copyObjectToInterface which attempts to set dest[attribute] as a generic
// attribute on the xpconnect object, src.
// This routine skips any attribute that begins with ServerType- 
function setGenericAttribute(dest, src, attribute)
{
  if (!(/^ServerType-/i.test(attribute)) && src[attribute])
  {
    switch (typeof src[attribute])
    {
      case "string":
        dest.setUnicharValue(attribute, src[attribute]);
        break;
      case "boolean":
        dest.setBoolValue(attribute, src[attribute]);
        break;
      case "number":
        dest.setIntValue(attribute, src[attribute]);
        break;
      default:
        dump("Error: No Generic attribute " + attribute + " found for: " + dest + "\n");
        break;
    }
  }
}
