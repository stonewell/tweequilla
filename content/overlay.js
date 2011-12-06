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

    // look for skink glue, and initiate download if missing
    if (loadSkinkGlue())
      return;

    // add observer to catch message display
    this.observerService = Cc["@mozilla.org/observer-service;1"]
                            .getService(Ci.nsIObserverService);
    this.observerService.addObserver(this, "MsgMsgDisplayed", false);

    //
    // We have saved account changes since tweequilla was installed in the
    // preferences extensions.tweequilla.mail.account.*  What we will
    // do here is to check to see if there is a twitter account that
    // we know about, but is not loaded. That should be because the account
    // was deleted when the profile was run without tweequilla enabled. See
    // mozilla bug 592710.
    //
    this.rootBranch = Cc["@mozilla.org/preferences-service;1"]
                        .getService(Ci.nsIPrefBranch2);
    let tqAccountBranch = this.rootBranch.getBranch("extensions.tweequilla.mail.account.");
    let mailAccountBranch = this.rootBranch.getBranch("mail.account.");
    let children = tqAccountBranch.getChildList("", {});
    let accountsToAdd = [];
    for each (let pref in children)
    {
      // look for a server and check if it exists and is twitter
      if (/^account\d+\.server/.test(pref))
      {
        let server = tqAccountBranch.getCharPref(pref);
        let isTwitter = false; 
        try {
          isTwitter = (this.rootBranch.getCharPref('mail.server.' + server + '.type') == 'twitter')
        } catch(e) {}
        if (isTwitter) {
          let accountKey = /^account\d+/.exec(pref)[0];
          let existingAccount = accountManager.getAccount(accountKey);
          if (!existingAccount)
            accountsToAdd.push(accountKey);
        }
      }
    }
    // now add any missing accounts
    let accounts;
    if (accountsToAdd.length)
    {
      accountManager.UnloadAccounts();
      accounts = this.rootBranch.getCharPref('mail.accountmanager.accounts');
    }
    let accountKey;
    for each (accountKey in accountsToAdd)
    {
      // add the saved account
      for each (let pref in children)
      {
        let prefAccountKey = /^account\d+/.exec(pref)[0];
        if (prefAccountKey == accountKey)
        {
          copyPref(tqAccountBranch, mailAccountBranch, pref);
        }
      }
      if (accounts.length)
        accounts += ',';
      accounts += accountKey;
    }
    if (accountsToAdd.length)
    {
      this.rootBranch.setCharPref('mail.accountmanager.accounts', accounts);
      // This is ugly, causes an assertion that a duplicate folder listener is added. I
      //  think this is a core bug, that UnloadAccounts() leaves a listener dangling. So
      //  I remove it manually prior to reloading the accounts.
      let mailSession = Cc["@mozilla.org/messenger/services/session;1"]
                          .getService(Ci.nsIMsgMailSession);
      mailSession.RemoveFolderListener(accountManager);
      accountManager.LoadAccounts();
      gFolderTreeView._rebuild();
    }

    // track any additional changes
    this.rootBranch.addObserver("mail.account", this, false);

    // add the tweequilla toolbar button to the default for the toolbar
    if (this.rootBranch.getBoolPref('extensions.tweequilla.firstRun'))
    {
      let toolbar = document.getElementById("mail-bar3");
      let curSet = toolbar.currentSet;
      if (curSet.indexOf("tweequilla-statusupdate") == -1)
      {
        // Place the button before the urlbar
        let set = (curSet.indexOf("gloda-search") != -1) ? 
                     curSet.replace(/gloda-search/, "tweequilla-statusupdate,gloda-search") :
                     curSet + ",tweequilla-statusupdate";
        toolbar.setAttribute("currentset", set);
        toolbar.currentSet = set;
        document.persist("mail-bar3", "currentset");
        // If you don't do the following call, funny things happen
        try {
          BrowserToolboxCustomizeDone(true);
        }
        catch (e) { }
      }
      this.rootBranch.setBoolPref('extensions.tweequilla.firstRun', false);
    }
    setToolbarAccounts();
  }

  function onUnload() {
    this.observerService.removeObserver(this, "MsgMsgDisplayed");
    this.rootBranch.removeObserver("mail.account.", this);
  }

  function loadSkinkGlue() {
    // Ask the user if we can load the SkinkGlue application
    if (!Cc["@mesquilla.com/sgincomingserver;1"])
    {
      window.openDialog("chrome://tweequilla/content/loadSkinkGlue.xul", "_blank",
                        "chrome,dialog=yes");
      return true;
    }
    return false;
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
    let popup = document.getElementById('tweequilla-accounts');
    if (!popup) // twitter toolbar is not showing
      return;
    let dropdown = document.getElementById('tweequilla-select-account');
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
    // don't allow more than 140 character
    if (event.charCode &&  event.target.value.length >= 140)
      event.preventDefault();
  }

  function observe(subject, topic, data)
  {
    if (topic == "nsPref:changed")
    {
      // Our goal is to keep a copy of any twitter accounts in our extension preferences,
      // to allow us to reload any accounts that disappear when the user disables
      // then re-enables this extension, or the extension fails due to compatibility.
      let tqBranch = Cc["@mozilla.org/preferences-service;1"]
                         .getService(Ci.nsIPrefService)
                         .getBranch("extensions.tweequilla.");

      // save account changes that we see
      copyPref(this.rootBranch, tqBranch, data);
      setToolbarAccounts();
    }

    // only function for twitter messages
    if (topic == 'MsgMsgDisplayed' && data.match(/^twitter-message/))
    {
      // XXX todo: why add content only to remove it here?

      // get the message header
      let hdr = messenger.messageServiceFromURI(data).messageURIToMsgHdr(data);
      // try to find a URL spec
      let link = hdr.mime2DecodedSubject.match(/http:\/\/[=a-zA-Z0-9\.\-\/\?]+/);
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
  }

  // wrap function composeMsgByType so that we can do Twitter-specific messages
  let composeMsgByType_original = composeMsgByType;
  composeMsgByType = function _composeMsgByType(aCompType, aEvent)
  {
    let msgFolder;
    try {
      msgFolder = GetFirstSelectedMsgFolder();
    } catch (e) {}

    if (!(msgFolder && msgFolder.server.type == "twitter"))
      return composeMsgByType_original(aCompType, aEvent);

    let hdr;
    try {
      hdr = gDBView.hdrForFirstSelectedMessage;
    } catch(e) {}

    let composeWindow = window.openDialog("chrome://tweequilla/content/twitterCompose.xul", "_blank",
        "chrome,menubar,resizable=yes,scrollbars=no,status=no",
        hdr, aCompType);
  }

  // make sure that we have the retweeter header in mailnews.headers.extraExpandedHeaders
  let prefBranch = Cc["@mozilla.org/preferences-service;1"]
                     .getService(Ci.nsIPrefBranch);
  let expandedHeaders = prefBranch.getCharPref("mailnews.headers.extraExpandedHeaders");
  if (expandedHeaders.indexOf("retweet") == -1)
  {
    expandedHeaders = "retweet " + expandedHeaders;
    prefBranch.setCharPref("mailnews.headers.extraExpandedHeaders", expandedHeaders);
  }

  // Copies a preference from one branch to another 
  function copyPref(srcBranch, destBranch, aData)
  {
    // save account changes that we see
    let type = srcBranch.getPrefType(aData);
    let value;
    switch (type)
    {
      case Ci.nsIPrefBranch.PREF_INVALID:
        destBranch.clearUserPref(aData);
        break;
      case  Ci.nsIPrefBranch.PREF_STRING:
        value = srcBranch.getCharPref(aData);
        destBranch.setCharPref(aData, value);
        break;
      case Ci.nsIPrefBranch.PREF_INT:
        value = srcBranch.getIntPref(aData);
        destBranch.setIntPref(aData, value);
        break;
      case Ci.nsIPrefBranch.PREF_BOOL:
        value = srcBranch.getBoolPref(aData);
        destBranch.setBoolPref(aData, value);
        break;
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
