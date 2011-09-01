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
 * ***** END LICENSE BLOCK ***** */
 
 /*
 * This file is derived from am-server.js
 */

var gServer;
var gObserver;

function onSave()
{
}

function onInit(aPageId, aServerId)
{
  var Ci = Components.interfaces;
  //dump('am-twitterserver.js onInit\n');

  initServerType();

  onCheckItem("server.biffMinutes", "server.doBiff");
}

function onPreInit(account, accountValues)
{
  var type = parent.getAccountValue(account, accountValues, "server", "type", null, false);
  hideShowControls(type);

  gObserver= Components.classes["@mozilla.org/observer-service;1"].
             getService(Components.interfaces.nsIObserverService);
  gObserver.notifyObservers(null, "charsetmenu-selected", "other");

  gServer = account.incomingServer;
}

function initServerType()
{
  var serverType = document.getElementById("server.type").getAttribute("value");
  var propertyName = "serverType-" + serverType;

  /*
  var messengerBundle = document.getElementById("bundle_messenger");
  try {
    var verboseName = messengerBundle.getString(propertyName);
  } catch (e) {dump(e);}
  */
  var verboseName = "Twitter";

  setDivText("servertype.verbose", verboseName);

}

function setDivText(divname, value) 
{
  var div = document.getElementById(divname);
  if (!div) 
    return;
  div.setAttribute("value", value);
}

function onCheckItem(changeElementId, checkElementId)
{
  /**/
    var element = document.getElementById(changeElementId);
    var notify = document.getElementById(checkElementId);
    var checked = notify.checked;

    if(checked && !getAccountValueIsLocked(notify))
      element.removeAttribute("disabled");
    else
      element.setAttribute("disabled", "true");
}

/**
 * Called when someone changes the biff-minutes value.  We'll check whether it's
 * zero, and if so, disable the biff checkbox as well, otherwise enable the box
 *
 * @param aValue  the new value for the textbox
 */
function onBiffMinChange(aValue)
{
  document.getElementById("server.doBiff").checked = (aValue != 0);
}
