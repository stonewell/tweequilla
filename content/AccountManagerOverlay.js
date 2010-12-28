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

if (!tweequilla)
  var tweequilla = {};

tweequilla.newAccountWindowOpen = function _newAccountWindowOpen()
{
  try {
    newAccountWindow = window.openDialog("chrome://tweequilla/content/newAccount.xul", "_blank",
        "chrome,extrachrome,menubar,resizable=yes,scrollbars=yes,status=yes",
        "some info");
  }
  catch (e) {dump("failed to open new account window\n");}
}

tweequilla.overrideAccountManager = function _overrideAccountManager()
{
  // override the account tree to allow us to revise the panels
  let _gAccountTree_build = gAccountTree._build;
  gAccountTree._build = function _build()
  {
    _gAccountTree_build();
    let mainTreeChildren = document.getElementById("account-tree-children").childNodes;
    for (let i = 0; i < mainTreeChildren.length; i++)
    {
      let node = mainTreeChildren[i];
      try {
        if (node._account && node._account.incomingServer.type == 'twitter')
        {
          // remove unwanted panes
          let treeChildrenNode = node.getElementsByTagName("treechildren")[0];
          let nodeChildren = treeChildrenNode.childNodes;
          let ewsServerNode = null
          //  scan backwards to find the ewsServerNode first
          for (let j = nodeChildren.length - 1; j >= 0; j--)
          {
            let row = nodeChildren[j];
            let pageTag = row.getAttribute('PageTag');
            if (pageTag == 'am-offline.xul' ||
                pageTag == 'am-junk.xul' ||
                pageTag == 'am-mdn.xul' ||
                pageTag == 'am-smime.xul')
            {
              treeChildrenNode.removeChild(row);
            }
          }
        }
      } catch (e) {Components.utils.reportError(e);}
    }
  }
  gAccountTree._build();

  // override the saveAccount function so that we can save the token secret
  //  to the password manager.
  let _saveAccountOld = saveAccount;
  saveAccount = function _saveAccount(accountValues, account)
  { try {
    dump("saveAccount override\n");
    _saveAccountOld(accountValues, account);
    if (account && account.incomingServer.type == "twitter")
    {
      dump("This is a twitter account\n");
      let dummy;
      let secret;
      if ( (dummy = accountValues["dummy"]) &&
           (secret = dummy["accessTokenSecret"]) &&
           secret.length)
      {
        dump("secret is " + secret + "\n");
        // We need to save the secret, but not in the preferences. So we will add this
        //  to the password manager. If for some reason the account dialog is cancelled, then
        //  this just becomes an unused password which we should clean up later.
        Components.utils.import("resource://tweequilla/oauthTokenMgr.jsm");
        let username = account.incomingServer.username;
        dump("username is " + username + "\n");
        let pwdMgr = new oauthTokenMgr("tweequilla", username);
        pwdMgr.store(secret);
      }
    }
  } catch(e) {dump(e + "\n");}}
}

window.addEventListener("load", tweequilla.overrideAccountManager, false);
