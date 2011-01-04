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

var EXPORTED_SYMBOLS = ["TwitterProtocol"];

// Create the twitter service
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const CC = Components.Constructor

const Timer = CC("@mozilla.org/timer;1", "nsITimer", "initWithCallback");
function doAfterReturn(aThis, method) {
  let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  timer.initWithCallback( function() {method.apply(aThis)},
                          0, Ci.nsITimer.TYPE_ONE_SHOT);                          
}

Cu.import("resource:///modules/XPCOMUtils.jsm");

function re(e) {
  dump(e + "\n");
}

function dl(t) {
  dump(t + "\n");
}

function TwitterProtocol()
{ try {
  //dl("TwitterProtocol");
  let protocol = Cc["@mesquilla.com/sgprotocol;1"]
              .createInstance(Ci.nsIChannel);
  protocol instanceof Ci.nsIRequest;
  protocol instanceof Ci.nsIStreamListener;
  protocol instanceof Ci.nsIMsgHeaderSink;
  protocol instanceof Ci.msqISgProtocol;
  protocol instanceof Ci.msqIOverride;
  this.sgprotocol = protocol;
  this.__proto__.__proto__ = protocol;

  // define the overrides
  this.jsProtocol = new TwitterProtocolOverride(protocol);
  protocol.jsParent = this.jsProtocol;
  protocol.override("msqSgProtocolOverridable::AsyncOpen");
  //protocol.override("msqSgProtocol::OnEndMsgHeaders");
  //protocol.override("msqSgServiceOverridable::DisplayMessage");

} catch(e) {re(e); throw e;}}

function TwitterProtocolOverride(aProtocol) {
  this.wrappedJSObject = this;
  // initialization of member variables
  this.compositeProtocol = aProtocol;
  this.mChannelContext = null;
  this.mHeaderSink = null;
  //dl("new TwitterProtocolOverride, protocol is " + aProtocol);
}

TwitterProtocolOverride.prototype = 
{
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIChannel, Ci.nsIRequest, Ci.nsIStreamListener, Ci.nsIMsgHeaderSink]),

  // nsIChannel overrides
  asyncOpen: function _asyncOpen(aStreamListener, aContext)
  {
    //dl("TwitterProtocolOverride.asyncOpen");
    this.mChannelContext = aContext;

    // We'll just push out the subject as the body for now

    // We may need to setup a stream converter to generate header responses
    // todo: vary this by type of operation
    let mimeStreamConverterListener = null;
    try {
      mimeStreamConverterListener = aStreamListener.QueryInterface(Ci.nsIMimeStreamConverter);
    } catch (e) {}
    //dl("mimeStreamConverter is " + mimeStreamConverterListener);

    if (!mimeStreamConverterListener)
    {
      let converterService = Cc["@mozilla.org/streamConverters;1"]
                               .getService(Ci.nsIStreamConverterService);
      let converterListener = converterService.asyncConvertData("message/rfc822", "*/*", aStreamListener, this.compositeProtocol);
      this.compositeProtocol.setChannelListener(converterListener);
    }
    else
      this.compositeProtocol.setChannelListener(aStreamListener);
    doAfterReturn(this, this.onBody);
  },

  // nsIMsgHeaderSink overrides
  onEndMsgHeaders: function _onEndMsgHeaders(aUrl)
  {
    //dl("TwitterProtocolOverride.onEndMsgHeaders");
    this.compositeProtocol.onEndMsgHeaders(aUrl);
  },
 
   // local functions
  onBody: function _onBody()
  { try {
    //dl("TwitterProtocolOverride.onBody");
    let protocol = this.compositeProtocol;
    let uri = protocol.URI;
    uri instanceof Ci.nsIMsgMessageUrl;
    let msgHdr = uri.messageHeader;
    //dl("subject is " + msgHdr.mime2DecodedSubject);
    // we need to locate the message header
    let pipe = Cc["@mozilla.org/pipe;1"].createInstance(Ci.nsIPipe);
    pipe.init(false, false, 0, 0xffffffff, null);
    let inputStream = pipe.inputStream;
    let outputStream = pipe.outputStream;
    protocol.contentType = "text/plain; charset=UTF-8";

    // generate fake headers for an RS-822 message
    let fakeHeaders = "";
    function addHeader(name, value) {
      fakeHeaders += name + ": " + value + "\r\n";
    }
    addHeader("MIME-Version", "1.0");
    addHeader("Content-Type", "text/plain; charset=UTF-8");
    addHeader("From", msgHdr.author);

    // We'll detect links, and separate those from the subject shown in the header pane
    let linkRex = /http:\/\/[=a-zA-Z0-9\.\-\/\?]+/;
    let subject = msgHdr.mime2DecodedSubject;
    let retweet = msgHdr.getProperty("retweet");
    let link = subject.match(linkRex);
    if (link && link.length)
    {
      addHeader("content-base", link);
      subject = subject.replace(linkRex, "");
    }
    addHeader("subject", mimeEncodeSubject(subject, "UTF-8"));
    if (retweet && retweet.length)
      addHeader("retweet", retweet);

    // add the body and the body separator
    fakeHeaders += "\r\n";
    fakeHeaders += gUnicodeConverter.ConvertFromUnicode(subject) + gUnicodeConverter.Finish();
    fakeHeaders += "\r\n";

    //dump("fakeHeaders: \n" + fakeHeaders);

    protocol.onStartRequest(protocol, this.mChannelContext);
    let count = outputStream.write(fakeHeaders, fakeHeaders.length);
    try {
      protocol.onDataAvailable(protocol, null, inputStream, 0, count);
    } catch(e) {dl(e);}
    outputStream.close();
    inputStream.close();
    protocol.onStopRequest(protocol, this.mChannelContext, 0);
    if (protocol.msgHeaderSink)
      protocol.msgHeaderSink.onEndMsgDownload(uri);
  } catch(e) {re(e)}},
}

var gUnicodeConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                  .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
gUnicodeConverter.charset = "UTF-8";

// adapted from FeedItem.js
function mimeEncodeSubject(aSubject, aCharset)
{
  // Get the mime header encoder service
  var mimeEncoder = Components.classes["@mozilla.org/messenger/mimeconverter;1"]
                              .getService(Components.interfaces.nsIMimeConverter);

  // This routine sometimes throws exceptions for mis-encoded data so
  // wrap it with a try catch for now..
  var newSubject;
  try
  {
    newSubject = mimeEncoder.encodeMimePartIIStr_UTF8(aSubject, false, aCharset, 9, 141);
  }
  catch (ex)
  {
    dl('mime encoder failed ' + ex);
    newSubject = aSubject;
  }

  return newSubject;
}

