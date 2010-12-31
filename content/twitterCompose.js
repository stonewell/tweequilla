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
 
 // Twitter message compose

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function dl(t) {dump(t + "\n");}

function onLoad()
{
  let hdr = window.arguments[0];
  let compType = window.arguments[1];
  let initialText = "";
  let messageElement = document.getElementById('tweequilla-message');
  let twitterType = "status";
  // set the initial text based on the type
  if (compType == Ci.nsIMsgCompType.Reply ||
      compType == Ci.nsIMsgCompType.ReplyToSender)
  {
    initialText = hdr.author + ": ";
    twitterType = "reply";
  }
  else if (compType == Ci.nsIMsgCompType.ForwardAsAttachment ||
           compType == Ci.nsIMsgCompType.ForwardInline)
  {
    initialText = "RT " + hdr.author + ": " + hdr.subject;
    twitterType = "retweet";
    messageElement.disabled = true;
  }
  messageElement.value = initialText;
  messageElement.twitterType = twitterType;
  if (hdr)
    messageElement.inReplyTo = hdr.messageId;
  let currentLength = initialText.length
  let remainingLength = 140 - currentLength;
  if (twitterType != "retweet");
    document.getElementById('tweequilla-length').value = remainingLength;
  let server = hdr ? hdr.folder.server : null;
  setPopupAccounts(server);
}

function onAccept()
{
  statusUpdate();
}

function onExtra1(event)
{
  // currently not used, but keep for if we figure out how to allow the
  //  window to stay open
  dl("onExtra1");
  statusUpdate();
}

function statusKeypress(event)
{
  let currentLength = event.target.value.length;
  if (event.charCode && currentLength >= 140)
    event.preventDefault();
}

function onInput(event)
{
  let messageBox = document.getElementById('tweequilla-message');
  let currentLength = messageBox.value.length;
  let remainingLength = 140 - currentLength;
  document.getElementById('tweequilla-length').value = remainingLength;
}

function setPopupAccounts(aServer)
{
  let dropdown = document.getElementById('tweequilla-select-account');
  let popup = document.getElementById('tweequilla-accounts');
  while (popup.firstChild)
    popup.removeChild(popup.firstChild);
  let textbox = document.getElementById('tweequilla-account');

  let am = Cc["@mozilla.org/messenger/account-manager;1"]
             .getService(Ci.nsIMsgAccountManager);
  let accounts = am.accounts;
  // show all of the accounts by type
  let numAccounts = accounts.Count();
  let setDefaultAccount = false;
  if (aServer)
  {
    setDefaultAccount = true;
    textbox.value = aServer.prettyName;
    textbox.server = aServer;
  }

  for (var i = 0; i < numAccounts; i++)
  {
    let account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
    // if we find a twitter account, then add it
    if (account.incomingServer.type == "twitter")
    {
      let accountName = account.incomingServer.prettyName;
      if (!setDefaultAccount)
      {
        setDefaultAccount = true;
        textbox.value = accountName;
        textbox.server = account.incomingServer;
      }
      let accountElement = document.createElement('menuitem');
      accountElement.setAttribute('label', accountName);
      accountElement.setAttribute('oncommand', 'selectMenuitem(event);');
      accountElement.server = account.incomingServer;
      popup.appendChild(accountElement);
    }
  }
}

function selectMenuitem(event)
{
  let textbox = document.getElementById('tweequilla-account');
  let server = event.target.server;
  textbox.server = server;
  textbox.value = server.prettyName;
}

function statusUpdate()
{
  let messageBox = document.getElementById('tweequilla-message');
  let accountBox = document.getElementById('tweequilla-account');

  let server = accountBox.server;
  server instanceof Ci.msqIOverride;

  server.jsParent.wrappedJSObject.sendStatusUpdate
    (messageBox.value, messageBox.twitterType, messageBox.inReplyTo);
  messageBox.value = null;
}

