/*
 ***** BEGIN LICENSE BLOCK *****
 *
 * Copyright 2010 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */
 
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource:///modules/XPCOMUtils.jsm");

var gType = "twitter";

function IncomingServer() {
  Cu.import("resource://tweequilla/twitterIncomingServer.jsm");
  TwitterIncomingServer.call(this);
}

IncomingServer.prototype = {
  classDescription: "Twitter Incoming Server",
  classID:          Components.ID("{A6CA1F3D-73F3-4764-A6DC-61D495618533}"),
  contractID:       "@mozilla.org/messenger/server;1?type=" + gType,

  // If SkinkGlue is not installed, then don't lie about the interface. This leads to bug 659606
  QueryInterface: XPCOMUtils.generateQI(
                    Cc["@mesquilla.com/sgincomingserver;1"] ? [Ci.nsIMsgIncomingServer, Ci.msqISgIncomingServer] : []),
}

function MsgService() {
  Cu.import("resource://tweequilla/twitterService.jsm");
  TwitterService.call(this);
}

MsgService.prototype = {
    classDescription: "Twitter Server Service",
    classID:          Components.ID("{23BA7D0B-0DC2-48d1-AD03-02AC35707618}"),
    contractID:       "@mozilla.org/messenger/messageservice;1?type" + gType,
    QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgProtocolInfo, Ci.nsIMsgMessageService, Ci.nsIProtocolHandler, Ci.msqISgService])
}

function MsgProtocolInfo() {
  Cu.import("resource://tweequilla/twitterService.jsm");
  TwitterService.call(this);
}

MsgProtocolInfo.prototype = {
    classDescription: "Twitter Server Protocol Info Service",
    classID:          Components.ID("{A6E4587C-3316-4309-B5CB-67A0431EF849}"),
    contractID:       "@mozilla.org/messenger/protocol/info;1?type=" + gType,
    QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgProtocolInfo, Ci.nsIMsgMessageService, Ci.nsIProtocolHandler, Ci.msqISgService])
}

function NetworkProtocolHandler() {
  Cu.import("resource://tweequilla/twitterService.jsm");
  TwitterService.call(this);
}

NetworkProtocolHandler.prototype = {
    classDescription: "Twitter Network Protocol Service",
    classID:          Components.ID("{7D03740F-D990-44db-AFB1-77C7F005330A}"),
    contractID:       "@mozilla.org/network/protocol;1?name=" + gType,
    QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgProtocolInfo, Ci.nsIMsgMessageService, Ci.nsIProtocolHandler, Ci.msqISgService])
}

function MessageProtocolHandler() {
  Cu.import("resource://tweequilla/twitterService.jsm");
  TwitterService.call(this);
}

MessageProtocolHandler.prototype = {
    classDescription: "Twitter Message Service",
    classID:          Components.ID("{DCE1D1D4-9A57-4a01-915B-86CAE416CEE0}"),
    contractID:       "@mozilla.org/messenger/messageservice;1?type=" + gType + "-message",
    QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgProtocolInfo, Ci.nsIMsgMessageService, Ci.nsIProtocolHandler, Ci.msqISgService])
}

function NetworkMsgProtocolHandler() {
  Cu.import("resource://tweequilla/twitterService.jsm");
  TwitterService.call(this);
}

NetworkMsgProtocolHandler.prototype = {
    classDescription: "Twitter Message Protocol Service",
    classID:          Components.ID("{852415D6-724F-453e-9967-FC4775C1A614}"),
    contractID:       "@mozilla.org/network/protocol;1?name=" + gType + "-message",
    QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgProtocolInfo, Ci.nsIMsgMessageService, Ci.nsIProtocolHandler, Ci.msqISgService])
}

// hooks to get the chrome package name for the account manager panels
function AccountManagerServerPanel() {}

AccountManagerServerPanel.prototype = {
  name: "twitterserver",
  chromePackageName: "tweequilla", 
  showPanel: function showPanel(server) {
    if (server.type == gType)
      return true;
    return false;
  },

  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIMsgAccountManagerExtension]),
  classDescription: "Twitter server pane",
  classID: Components.ID("{3C8A4E09-523D-41a8-87F0-E301A86CBCD8}"),
  contractID: "@mozilla.org/accountmanager/extension;1?name=twitterserver",

  _xpcom_categories: [{category: "mailnews-accountmanager-extensions",
                       entry: "twitter server pane"}]
};

function AccountManagerAuthPanel() {}

AccountManagerAuthPanel.prototype = {
  name: "twitterauth",
  chromePackageName: "tweequilla", 
  showPanel: function showPanel(server) {
    if (server.type == gType)
      return true;
    return false;
  },

  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIMsgAccountManagerExtension]),
  classDescription: "Twitter auth pane",
  classID: Components.ID("{0FB11087-47AF-4c70-BF56-66D264D4B63E}"),
  contractID: "@mozilla.org/accountmanager/extension;1?name=twitterauth",

  _xpcom_categories: [{category: "mailnews-accountmanager-extensions",
                       entry: "twitter authorization pane"}]
};

// RDF resource factory for a folder
function ResourceFactory() {
  Cu.import("resource://tweequilla/twitterFolder.jsm");
  TwitterFolder.call(this);
}

ResourceFactory.prototype = 
{
  /// XPCOM glue
  classDescription: "Twitter Message Folder",
  classID:          Components.ID("{FD87427E-8F1A-4566-B941-1BF1DEB7B60A}"),
  contractID:       "@mozilla.org/rdf/resource-factory;1?name=" + gType,
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgFolder, Ci.nsIDBChangeListener,
                                           Ci.nsIUrlListener, Ci.nsIJunkMailClassificationListener,
                                           Ci.nsIMsgTraitClassificationListener, Ci.nsIRDFResource,
                                           Ci.msqISgMailFolder, Ci.msqISgJsOverride]),
}

function Protocol() {
  Cu.import("resource://tweequilla/twitterProtocol.jsm");
  TwitterProtocol.call(this);
}

Protocol.prototype = 
{
  /// XPCOM glue
  classDescription: "Twitter Protocol",
  classID:          Components.ID("{5C51C3A9-FD5E-4b87-AA47-7BF268C59AD2}"),
  contractID:       "@mesquilla.com/sgprotocol;1?type=" + gType,
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIChannel, Ci.nsIRequest, Ci.msqISgProtocol,
                                           Ci.nsIMsgHeaderSink, Ci.nsIStreamListener]),
}

function Url() {
  Cu.import("resource://tweequilla/twitterUrl.jsm");
  TwitterUrl.call(this);
}

Url.prototype = 
{
  /// XPCOM glue
  classDescription: "Twitter Url",
  classID:          Components.ID("{6C51C3A9-FC5E-4b97-AA47-7BF268C59AD2}"),
  contractID:       "@mesquilla.com/sgurl;1?type=" + gType,
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIMsgMailNewsUrl, Ci.nsIURI, Ci.nsIURL])
}

// Note that the modules seem to be loaded after the components, so you cannot access anything
//  in the modules during initial creation of the component definitions.

var components = [IncomingServer, MsgService, MsgProtocolInfo, NetworkProtocolHandler,
                  MessageProtocolHandler, NetworkMsgProtocolHandler, AccountManagerServerPanel,
                  AccountManagerAuthPanel, ResourceFactory, Protocol, Url];  

if (XPCOMUtils.generateNSGetFactory)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);
