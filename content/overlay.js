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

 
var tweequilla = (function _tweequilla() {

  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;

  function dl(text) { dump(text + '\n'); }

  function onLoad() {

    // add observer to catch message display
    let observerService = Cc["@mozilla.org/observer-service;1"]
                            .getService(Ci.nsIObserverService);
    observerService.addObserver(tweequilla, "MsgMsgDisplayed", false);
    setToolbarAccounts();
  }

  function onUnload() {
    // remove observer to catch message display
    let observerService = Cc["@mozilla.org/observer-service;1"]
                            .getService(Ci.nsIObserverService);
    observerService.removeObserver(tweequilla, "MsgMsgDisplayed");
  }

  function showContextMenu(event) {
    // show or hide the menuitem based on what the context menu is on
    // see http://kb.mozillazine.org/Adding_items_to_menus
    let indices = gFolderDisplay.selectedIndices;
    document.getElementById("context-tweequilla").hidden = (indices.length == 0);
  }

  function onMenuItemCommand(e) {
    dl('onMenuItemCommand');
  }

  function setToolbarAccounts()
  {
    let dropdown = document.getElementById('tweequilla-select-account');
    let popup = document.getElementById('tweequilla-accounts');
    while (popup.firstChild)
      popup.removeChild(popup.firstChild);
    let textbox = document.getElementById('tweequilla-status-input');

    let am = Cc["@mozilla.org/messenger/account-manager;1"]
               .getService(Ci.nsIMsgAccountManager);
    let accounts = am.accounts;
    // show all of the accounts by type
    let numAccounts = accounts.Count();
    let setDefaultAccount = false;
    for (var i = 0; i < numAccounts; i++) {
      let account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
      // if we find a twitter account, then add it
      if (account.incomingServer.type == "twitter")
      {
        let accountName = account.incomingServer.prettyName;
        dl('found twitter account ' + accountName);
        if (!setDefaultAccount)
        {
          setDefaultAccount = true;
          textbox.emptyText = accountName;
          //textbox.value = "ABC";
          //textbox.value = "";
          dl('set emptytext to ' + accountName);
          textbox.account = account;
        }
        let accountElement = document.createElement('menuitem');
        accountElement.setAttribute('label', accountName);
        accountElement.setAttribute('oncommand', 'tweequilla.selectMenuitem(event);');
        accountElement.account = account;
        popup.appendChild(accountElement);
      }
      else
        dl('found non-twitter account');
    }
  }

  function selectMenuitem(event)
  {
    let textbox = document.getElementById('tweequilla-status-input');
    let account = event.target.account;
    textbox.account = account;
    textbox.emptyText = account.incomingServer.prettyName;
  }

  function statusUpdate()
  {
    let textbox = document.getElementById('tweequilla-status-input');
    let server = textbox.account.incomingServer;
    dl('sendStatusUpdate to ' + server.prettyName);
    let text = textbox.value;
    server instanceof Ci.msqIOverride;
    server.jsParent.wrappedJSObject.sendStatusUpdate(text);
    textbox.value = null;
  }

  function statusKeypress(event) {
    if (event.keyCode == KeyEvent.DOM_VK_RETURN)
    {
      dl('detected return');
      statusUpdate();
    }
  }

  function observe(subject, topic, data) {
    // only function for twitter messages
    if (!data.match(/^twitter-message/))
      return;

    // test of url load.
    // Adapted from FeedSetContentView
    // XXX todo: why add content only to remove it here?

    // get the message header
    let hdr = messenger.messageServiceFromURI(data).messageURIToMsgHdr(data);
    if (hdr)
      dl("subject is " + hdr.subject);
    // try to find a URL spec
    let link = hdr.subject.match(/http:\/\/[=a-zA-Z0-9\.\-\/\?]+/);
    dl("link is " + link);
    if (link)
    {
      var contentWindowDoc = window.top.content.document;
      var divHTML = new XPCNativeWrapper(contentWindowDoc,
                          "getElementsByClassName()")
                          .getElementsByClassName("moz-text-html")[0];
      var divPLAIN = new XPCNativeWrapper(contentWindowDoc,
                          "getElementsByClassName()")
                          .getElementsByClassName("moz-text-plain")[0];
      if (divHTML)
        divHTML.parentNode.removeChild(divHTML);
      if (divPLAIN)
        divPLAIN.parentNode.removeChild(divPLAIN);

      document.getElementById("messagepane")
              .loadURI(link, null, null);
    }
  }

  // publically accessible items
  let pub = {};
  pub.onLoad = onLoad;
  pub.onUnload = onUnload;
  pub.showContextMenu = showContextMenu;
  pub.onMenuItemCommand = onMenuItemCommand;
  pub.observe = observe;
  pub.statusKeypress = statusKeypress;
  pub.selectMenuitem = selectMenuitem;

  return pub;
})();

window.addEventListener("load", function(e) { tweequilla.onLoad(e); }, false);
window.addEventListener("unload", function(e) { tweequilla.onUnload(e); }, false);
