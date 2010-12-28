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
 
 var EXPORTED_SYMBOLS = ["TwitterService"];

// Create the twitter service
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource:///modules/XPCOMUtils.jsm");
//Cu.import("resource://tweequilla/twitterHelper.jsm");
//Cu.import("resource://tweequilla/twitterConsumer.jsm");
//Cu.import("resource://tweequilla/oauthTokenMgr.jsm");

function re(e) {
  dump(e + "\n");
}

function dl(t) {
  dump(t + "\n");
}

//dl("\nLoading twitterService.jsm");

var gService;
function getService()
{ try {
  if (!gService)
  {
    gService = Cc["@mesquilla.com/sgservice;1"]
                  .createInstance(Ci.nsIMsgMessageService);
    gService instanceof Ci.nsIMsgProtocolInfo;
    gService instanceof Ci.nsIProtocolHandler;
    gService instanceof Ci.msqIOverride;
    gService instanceof Ci.msqISgService;
    //dl("gService1 is " + gService);
    gService.type = "twitter";
  }
  return gService;
} catch(e) {re(e); throw e;}}

function TwitterService()
{ try {
  let service = getService();
  this.sgService = service;
  this.__proto__.__proto__ = service;

  // define the overrides
  this.jsService = new TwitterServiceOverride(this);
  service.jsParent = this.jsService;
  service.override("msqSgServiceOverridable::DisplayMessage");

} catch(e) {re(e); throw e;}}

function TwitterServiceOverride(aService) {
  this.wrappedJSObject = this;
  // initialization of member variables
  this.composite = aService;
}

TwitterServiceOverride.prototype = 
{
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgMessageService, Ci.nsIMsgProtocolInfo, Ci.nsIProtocolHandler]),

/* void DisplayMessage (in string aMessageURI, in nsISupports aDisplayConsumer, in nsIMsgWindow aMsgWindow, in nsIUrlListener aUrlListener, in string aCharsetOverride, out nsIURI aURL); */
/*
  void DisplayMessage(in string aMessageURI, 
            in nsISupports aDisplayConsumer, 
            in nsIMsgWindow aMsgWindow,
            in nsIUrlListener aUrlListener, 
            in string aCharsetOverride,
            out nsIURI aURL);
*/
  DisplayMessage: function _DisplayMessage(aMessageURI, aDisplayConsumer, aMsgWindow, aUrlListener, aCharsetOverride, aURL)
  { try {
    //dump("twitterService.DisplayMessage uri <" + aMessageURI + ">\n");

    // debug create of a channel
    let channel = Cc["@mesquilla.com/sgprotocol;1?type=twitter"]
                    .createInstance(Ci.nsIChannel);
    //dl("Channel is " + channel);
    // make a url object
    let iSgService = this.composite.base.QueryInterface(Ci.msqISgService);
    let url = iSgService.prepareUrl(aMessageURI, aUrlListener, aMsgWindow);
    //dl("url spec is " + url.spec);
    iSgService.fetchMessageUrl(url, aDisplayConsumer, aMsgWindow, aUrlListener);
    aURL = url;
  } catch(e) {re(e)}},

}
