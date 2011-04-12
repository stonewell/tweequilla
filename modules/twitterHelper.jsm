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
 * The Original Code is PlanTwit.
 *
 * The Initial Developer of the Original Code is
 * Pages Jaunes.
 * Portions created by the Initial Developer are Copyright (C) 2008-2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Daniel Glazman <daniel.glazman@disruptive-innovations.com>, Original author
 *   Kent James <kent@caspia.com>
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

var EXPORTED_SYMBOLS = ["TwitterHelper"];

Components.utils.import("resource://tweequilla/oauth.jsm");

if (typeof JSON == "undefined")
  Components.utils.import("resource://gre/modules/JSON.jsm");

function dl(t) {
  dump(t + "\n");
}

/* CONSTRUCTOR */

function TwitterHelper(consumer, aThrobber, aServiceStr)
{
  this.mConsumer = consumer;
  //this.mAuthorization = btoa(aAccount + ":" + aPassword);

  this.mThrobber = aThrobber;

  this.mServiceName = aServiceStr;
  switch (aServiceStr)
  {
    case "twitter":
      this.mBaseURL = "http://api.twitter.com/1/"; 
      break;
    case "identi.ca":
      this.mBaseURL = "http://identi.ca/api/"; 
      break;
    default:
      throw("TwitterHelper: bad service string");
      break;
  }

  this.statuses._self = this;
  this.users._self = this;
  this.direct_messages._self = this;
  this.friendships._self = this;
  this.friends._self = this;
  this.followers._self = this;
  this.account._self = this;
  this.favorites._self = this;
  this.notifications._self = this;
  this.blocks._self = this;
  this.help._self = this;
  this.lists._self = this;
  this.searches._self = this;
}

/* PRIVATE */

TwitterHelper.prototype._localizedError  = 
function _localizedError(aServiceName, aStringName)
{
  var s = "";
  switch (aStringName)
  {
    case "resp304": s = "Not Modified: there was no new data to return."; break;
    case "resp400": s = "Bad Request: your request is invalid, did you exceed the rate limit?"; break;
    case "resp401": s = "Not Authorized: either you need to provide authentication credentials, or the credentials provided aren't valid."; break;
    case "resp403": s = "Forbidden: access denied to requested data."; break;
    case "resp404": s = "Not Found: either you're requesting an invalid URI or the resource in question doesn't exist (ex: no such user). "; break;
    case "resp500": s = "Internal Server Error"; break;
    case "resp502": s = "Bad Gateway: returned if the service is down or being upgraded."; break;
    case "resp503": s = "Service Unavailable: the servers are up, but are overloaded with requests.  Try again later."; break;

    case "MissingIdParameter": s = "Missing id parameter"; break;
    case "EmptyStatus":        s = "Cannot update with empty status"; break;
    case "EmptyDMRecipient":   s = "Empty recipient for Direct Message"; break;
    case "EmptyDMText":        s = "Empty text for Direct Message"; break;
    case "MissingUserForFriendshipTest": s = "Cannot test friendship because one user parameter is missing"; break;
    case "WrongDevice":        s = "Trying to update unknown device"; break;
    case "NothingToUpdateProfileColors": s = "Nothing to update, all colors are empty"; break;
    default: break;
  }

  Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Components.interfaces.nsIPromptService)
    .alert(null, aServiceName, s);
}

TwitterHelper.prototype._onreadystatechangeTwitter  = 
function _onreadystatechangeTwitter(aXmlRequest, aCallback, aErrorCallback, aContext, aTwitterHelper)
{
  if (aXmlRequest.readyState == "4")
  {
    if (this.mThrobber)
      this.mThrobber.setAttribute("hidden", "true");

    // http://apiwiki.twitter.com/REST+API+Documentation#HTTPStatusCodes
    switch(aXmlRequest.status)
    {
      case 200: // OK
        if (aCallback)
        {
          if (aXmlRequest.responseXML)
            aCallback(aTwitterHelper, aXmlRequest.responseXML, aContext);
          else
          {
            //dump("response is " + aXmlRequest.responseText + "\n");
            try {
              var responseJSON = (JSON.parse ? JSON.parse(aXmlRequest.responseText)
                                             : JSON.fromString(aXmlRequest.responseText));
            }
            catch(e) {
              Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService)
                .alert(null, aTwitterHelper.mServiceName, "Cannot parse JSON answer");
              return;
            }
            /*
            function showObject(aObject)
            {
              if ( aObject && ((typeof aObject) == "object"))
              {
                dump("{ ");
                for (name in aObject)
                {
                  dump(name + ": ");
                  showObject(aObject[name]);
                }
                dump("}\n");
              }
              else
                dump(aObject + ",\n");
            }
            showObject(responseJSON);
            /**/
            aCallback(aTwitterHelper, responseJSON, aContext);
          }
        }
        break;
      case 304: // NOT MODIFIED
      case 400: // BAD REQUEST
      case 401: // NOT AUTHORIZED
      case 403: // FORBIDDEN
      case 404: // NOT FOUND
      case 500: // INTERNAL SERVER ERROR
      case 502: // BAD GATEWAY
      case 503: // SERVICE UNAVAILABLE
        //aTwitterHelper._localizedError(aTwitterHelper.mServiceName, "resp" + aXmlRequest.status);
        if (aErrorCallback)
          aErrorCallback(aTwitterHelper, aXmlRequest, aContext);
        break;
      default: break;
    }
  }
}

TwitterHelper.prototype._getXmlRequest  = 
function _getXmlRequest(aFeedURL, aCallback, aErrorCallback, aContext)
{
  if (this.mThrobber)
    this.mThrobber.removeAttribute("hidden");

  // we can't use |new XMLHttpRequest()| in a JS module...
  var xmlRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                     .createInstance(Components.interfaces.nsIXMLHttpRequest);
  var _self = this;
  xmlRequest.onreadystatechange = function _onreadystatechange()
  {
    _self._onreadystatechangeTwitter(xmlRequest, aCallback, aErrorCallback, aContext, _self);
  };
  xmlRequest.mozBackgroundRequest = true;
  xmlRequest.open("GET", aFeedURL, true);
  //xmlRequest.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2005 00:00:00 GMT");
  xmlRequest.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
  if (xmlRequest.channel instanceof Components.interfaces.nsISupportsPriority)
    xmlRequest.channel.priority = Components.interfaces.nsISupportsPriority.PRIORITY_LOWEST;

  return xmlRequest;
}

TwitterHelper.prototype._postXmlRequest  = 
function _postXmlRequest(aFeedURL, aCallback, aErrorCallback, aContext)
{
  if (this.mThrobber)
    this.mThrobber.removeAttribute("hidden");

  // we can't use |new XMLHttpRequest()| in a JS module...
  var xmlRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                     .createInstance(Components.interfaces.nsIXMLHttpRequest);

  var _self = this;
  xmlRequest.onreadystatechange = function _onreadystatechange()
  {
    _self._onreadystatechangeTwitter(xmlRequest, aCallback, aErrorCallback, aContext, _self);
  };
 
  xmlRequest.mozBackgroundRequest = true;
  xmlRequest.open("POST", aFeedURL, true);
  xmlRequest.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2005 00:00:00 GMT");

  return xmlRequest;
}

TwitterHelper.prototype._sendRequest  = 
function _sendRequest(aURL, aCallback, aErrorCallback, aAuthenticated, aContext)
{
  var message = { action: aURL
                , method: "GET"
                , parameters: []
                };
  OAuth.completeRequest(message, this.mConsumer);
  var url = OAuth.addToURL(message.action, message.parameters);
  var xmlRequest = this._getXmlRequest(url, aCallback, aErrorCallback, aContext);
  //if (aAuthenticated)
    //xmlRequest.setRequestHeader("Authorization", "Basic " + this.mAuthorization);
  //XXX OAUTH Integration point
  
  xmlRequest.send(null);
}

TwitterHelper.prototype._sendPostRequest  = 
function _sendPostRequest(aURL, aCallback, aErrorCallback, aAuthenticated, aContext)
{
  var message = { action: aURL
                , method: "POST"
                , parameters: []
                };
  OAuth.completeRequest(message,this.mConsumer);
  var url = OAuth.addToURL(message.action,message.parameters);
     
  var xmlRequest = this._postXmlRequest(url, aCallback, aErrorCallback, aContext);
  //if (aAuthenticated)
  //  xmlRequest.setRequestHeader("Authorization", "Basic " + this.mAuthorization);
  xmlRequest.setRequestHeader("Content-length", 0);
  //XXX OAUTH Integration point
  xmlRequest.send(null);
}

TwitterHelper.prototype._addParamToQueryURL  = 
function _addParamToQueryURL(aURL, aPreCondition, aParam, aStringParam)
{
  var url = aURL;
  if (aParam)
  {
    if (aPreCondition)
      url += "&";
    else
      url += "?";
    url += aStringParam + "=" + escape(aParam.toString().replace( / /g, "+"));
  }
  return url;
}

/* MEMBERS */

TwitterHelper.prototype.statuses        = { };
TwitterHelper.prototype.users           = { };
TwitterHelper.prototype.direct_messages = { };
TwitterHelper.prototype.friendships     = { };
TwitterHelper.prototype.friends         = { };
TwitterHelper.prototype.followers       = { };
TwitterHelper.prototype.account         = { };
TwitterHelper.prototype.favorites       = { };
TwitterHelper.prototype.notifications   = { };
TwitterHelper.prototype.blocks          = { };
TwitterHelper.prototype.help            = { };
TwitterHelper.prototype.lists           = { };
TwitterHelper.prototype.searches        = { };

/* STATUSES REQUESTS */

TwitterHelper.prototype.statuses.friends_timeline  = 
function statuses_friends_timeline(aCallback, aErrorCallback, aContext, aFormat, aSinceId, aCount, aPage)
{
  var feedURL = this._self.mBaseURL + "statuses/friends_timeline." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aSinceId, "since_id");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId, aCount, "count");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId || aCount, aPage, "page");
  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.home_timeline  = 
function statuses_home_timeline(aCallback, aErrorCallback, aContext, aFormat, aSinceId, aCount, aPage)
{
  //dump("statuses_home_timeline\n");
  var feedURL = this._self.mBaseURL + "statuses/home_timeline." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aSinceId, "since_id");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId, aCount, "count");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId || aCount, aPage, "page");
  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.retweets_of_me  = 
function statuses_retweets_of_me(aCallback, aErrorCallback, aContext, aFormat, aSinceId, aCount, aPage)
{
  var feedURL = this._self.mBaseURL + "statuses/retweets_of_me." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aSinceId, "since_id");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId, aCount, "count");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId || aCount, aPage, "page");
  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.retweeted_by_me  = 
function statuses_retweeted_by_me(aCallback, aErrorCallback, aContext, aFormat, aSinceId, aCount, aPage)
{
  var feedURL = this._self.mBaseURL + "statuses/retweeted_by_me." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aSinceId, "since_id");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId, aCount, "count");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId || aCount, aPage, "page");
  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.retweet  = 
function statuses_retweet(aCallback, aErrorCallback, aContext, aFormat, aStatusId)
{
  var feedURL = this._self.mBaseURL + "statuses/retweet/" + aStatusId + "." + aFormat;

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.user_timeline  = 
function statuses_user_timeline(aCallback, aErrorCallback, aContext, aFormat, aUserId, aSinceId, aCount, aPage)
{
  var feedURL;
  if (aUserId)
    feedURL = this._self.mBaseURL + "statuses/user_timeline/" + aUserId + "." + aFormat;
  else
    feedURL = this._self.mBaseURL + "statuses/user_timeline." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aSinceId, "since_id");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId, aCount, "count");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId || aCount, aPage, "page");

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.friends  = 
function statuses_friends(aCallback, aErrorCallback, aContext, aFormat, aUserId, aPage)
{
  var feedURL;
  if (aUserId)
    feedURL = this._self.mBaseURL + "statuses/friends/" + aUserId + "." + aFormat;
  else
    feedURL = this._self.mBaseURL + "statuses/friends." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aPage, "page");

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.mentions  = 
function statuses_mentions(aCallback, aErrorCallback, aContext, aFormat, aUserId, aSinceId, aCount, aPage)
{
  var feedURL;
  if (aUserId)
    feedURL = this._self.mBaseURL + "statuses/mentions/" + aUserId + "." + aFormat;
  else
    feedURL = this._self.mBaseURL + "statuses/mentions." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aSinceId, "since_id");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId, aCount, "count");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId || aCount, aPage, "page");

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.followers  = 
function statuses_followers(aCallback, aErrorCallback, aContext, aFormat, aUserId, aPage)
{
  var feedURL;
  if (aUserId)
    feedURL = this._self.mBaseURL + "statuses/followers/" + aUserId + "." + aFormat;
  else
    feedURL = this._self.mBaseURL + "statuses/followers." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aPage, "page");

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.show  = 
function statuses_show(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  if (!aId)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL = this._self.mBaseURL + "statuses/show." + aFormat;
  feedURL += "?id=" + aId;

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.replies  = 
function statuses_replies(aCallback, aErrorCallback, aContext, aFormat, aSince, aSinceId, aPage)
{
  var feedURL = this._self.mBaseURL + "statuses/replies." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aSince, "since");
  feedURL = this._self._addParamToQueryURL(feedURL, aSince, aSinceId, "since_id");
  feedURL = this._self._addParamToQueryURL(feedURL, aSince || aSinceId, aPage, "page");

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.destroy  = 
function statuses_destroy(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  if (!aId)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL = this._self.mBaseURL + "statuses/destroy/" + aId + "." + aFormat;

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.statuses.public_timeline  = 
function statuses_public_timeline(aCallback, aErrorCallback, aContext, aFormat)
{
  var feedURL = this._self.mBaseURL + "statuses/public_timeline." + aFormat;
  this._self._sendRequest(feedURL, aCallback, aErrorCallback, false, aContext);
}

TwitterHelper.prototype.statuses.update  = 
function statuses_update(aCallback, aErrorCallback, aContext, aFormat, aText, aInReplyToStatusId)
{
  if (!aText)
  {
    this._self._localizedError(this._self.mServiceName, "EmptyStatus");
    return;
  }

  var feedURL = this._self.mBaseURL + "statuses/update." + aFormat;
  feedURL += "?status=" + escape(aText);
  feedURL = this._self._addParamToQueryURL(feedURL, true, aInReplyToStatusId, "in_reply_to_status_id");

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* USERS REQUESTS */

TwitterHelper.prototype.users.show  = 
function users_show(aCallback, aErrorCallback, aContext, aFormat, aUserId, aEmail)
{
  if (!aUserId && !aEmail)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL;
  if (!aEmail)
    feedURL = this._self.mBaseURL + "users/show/" + aUserId + "." + aFormat;
  else
  {
    feedURL = this._self.mBaseURL + "users/show." + aFormat;
    feedURL = this._self._addParamToQueryURL(feedURL, false, aEmail, "email");
  }

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* DIRECT_MESSAGES REQUESTS */

TwitterHelper.prototype.direct_messages.inbox  = 
function direct_messages_inbox(aCallback, aErrorCallback, aContext, aFormat, aSince, aSinceId, aPage)
{
  var feedURL = this._self.mBaseURL + "direct_messages." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aSince, "since");
  feedURL = this._self._addParamToQueryURL(feedURL, aSince, aSinceId, "since_id");
  feedURL = this._self._addParamToQueryURL(feedURL, aSince || aSinceId, aPage, "page");

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.direct_messages.sent  = 
function direct_messages_sent(aCallback, aErrorCallback, aContext, aFormat, aSince, aSinceId, aPage)
{
  var feedURL = this._self.mBaseURL + "direct_messages/sent." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aSince, "since");
  feedURL = this._self._addParamToQueryURL(feedURL, aSince, aSinceId, "since_id");
  feedURL = this._self._addParamToQueryURL(feedURL, aSince || aSinceId, aPage, "page");

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.direct_messages.new  = 
function direct_messages_new(aCallback, aErrorCallback, aContext, aFormat, aUser, aText)
{
  if (!aUser)
  {
    this._self._localizedError(this._self.mServiceName, "EmptyDMRecipient");
    return;
  }
  if (!aText)
  {
    this._self._localizedError(this._self.mServiceName, "EmptyDMText");
    return;
  }
  var feedURL = this._self.mBaseURL + "direct_messages/new." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aUser, "user");
  feedURL = this._self._addParamToQueryURL(feedURL, true,  aText, "text");

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.direct_messages.destroy  = 
function direct_messages_destroy(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  if (!aId)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL = this._self.mBaseURL + "direct_messages/destroy/" + aId + "." + aFormat;

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* FRIENDSHIPS REQUESTS */

TwitterHelper.prototype.friendships.create  = 
function friendships_create(aCallback, aErrorCallback, aContext, aFormat, aId, aFollow)
{
  if (!aId)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL = this._self.mBaseURL + "friendships/create/" + aId + "." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aFollow, "follow");

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.friendships.destroy  = 
function friendships_destroy(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  if (!aId)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL = this._self.mBaseURL + "friendships/destroy/" + aId + "." + aFormat;

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.friendships.exists  = 
function friendships_exists(aCallback, aErrorCallback, aContext, aFormat, aUserA, aUserB)
{
  if (!aUserA || !aUserB)
  {
    this._self._localizedError(this._self.mServiceName, "MissingUserForFriendshipTest");
    return;
  }

  var feedURL = this._self.mBaseURL + "friendships/exists." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aUserA, "user_a");
  feedURL = this._self._addParamToQueryURL(feedURL, true,  aUserB, "user_b");

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* FRIENDS REQUESTS */

TwitterHelper.prototype.friends.ids  = 
function friends_ids(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  var feedURL;
  if (aId)
    feedURL = this._self.mBaseURL + "friends/ids/" + aId + "." + aFormat;
  else
    feedURL = this._self.mBaseURL + "friends/ids." + aFormat;

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* FOLLOWERS REQUESTS */

TwitterHelper.prototype.followers.ids  = 
function followers_ids(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  var feedURL;
  if (aId)
    feedURL = this._self.mBaseURL + "followers/ids/" + aId + "." + aFormat;
  else
    feedURL = this._self.mBaseURL + "followers/ids." + aFormat;

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* ACCOUNT REQUESTS */

TwitterHelper.prototype.account.verify_credentials  = 
function account_verify_credentials(aCallback, aErrorCallback, aContext, aFormat)
{
  var feedURL = this._self.mBaseURL + "account/verify_credentials." + aFormat;

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.account.end_session  = 
function account_end_session(aCallback, aErrorCallback, aContext, aFormat)
{
  var feedURL = this._self.mBaseURL + "account/end_session." + aFormat;

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.account.update_delivery_device  = 
function account_update_delivery_device(aCallback, aErrorCallback, aContext, aFormat, aDevice)
{
  if (aDevice !=  "sms" && aDevice !=  "im" && aDevice !=  "none")
  {
    this._self._localizedError(this._self.mServiceName, "WrongDevice");
    return;
  }
  var feedURL = this._self.mBaseURL + "account/update_delivery_device." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aDevice, "device");

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.account.update_profile_colors  = 
function account_update_profile_colors(aCallback, aErrorCallback, aContext, aFormat,
                                       aBackgroundColor, aTextColor, aLinkColor,
                                       aSidebarFillColor, aSidebarBorderColor)
{
  if (!aBackgroundColor && !aTextColor && !aLinkColor && !aSidebarFillColor && !aSidebarBorderColor)
  {
    this._self._localizedError(this._self.mServiceName, "NothingToUpdateProfileColors");
    return;
  }

  var feedURL = this._self.mBaseURL + "account/update_profile_colors." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false,
                                     aBackgroundColor, "profile_background_color");
  feedURL = this._self._addParamToQueryURL(feedURL, aBackgroundColor,
                                     aTextColor, "profile_text_color");
  feedURL = this._self._addParamToQueryURL(feedURL, aBackgroundColor || aTextColor,
                                     aLinkColor, "profile_link_color");
  feedURL = this._self._addParamToQueryURL(feedURL, aBackgroundColor || aTextColor || aLinkColor,
                                     aSidebarFillColor, "profile_sidebar_fill_color");
  feedURL = this._self._addParamToQueryURL(feedURL, aBackgroundColor || aTextColor || aLinkColor || aSidebarFillColor,
                                     aSidebarBorderColor, "profile_sidebar_border_color");

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.account.rate_limit_status  = 
function account_rate_limit_status(aCallback, aErrorCallback, aContext, aFormat)
{
  var feedURL = this._self.mBaseURL + "account/rate_limit_status." + aFormat;

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.account.update_profile  = 
function account_update_profile(aCallback, aErrorCallback, aContext, aFormat, aName, aEmail, aUrl, aLocation, aDescription)
{
  var feedURL = this._self.mBaseURL + "account/update_profile." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false,
                                     aName, "name");
  feedURL = this._self._addParamToQueryURL(feedURL, aName,
                                     aEmail, "email");
  feedURL = this._self._addParamToQueryURL(feedURL, aName || aEmail,
                                     aUrl, "url");
  feedURL = this._self._addParamToQueryURL(feedURL, aName || aEmail || aUrl,
                                     aLocation, "location");
  feedURL = this._self._addParamToQueryURL(feedURL, aName || aEmail || aUrl || aLocation,
                                     aDescription, "description");

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* FAVORITES REQUESTS */

TwitterHelper.prototype.favorites.favorites  = 
function favorites_favorites(aCallback, aErrorCallback, aContext, aFormat, aUserId, aPage)
{
  var feedURL;
  if (aUserId)
    feedURL = this._self.mBaseURL + "favorites/" + aUserId + "." + aFormat;
  else
    feedURL = this._self.mBaseURL + "favorites." + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aPage, "page");

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.favorites.create  = 
function favorites_create(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  if (!aId)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL = this._self.mBaseURL + "favorites/create/" + aId + "." + aFormat;

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.favorites.destroy  = 
function favorites_destroy(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  if (!aId)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL = this._self.mBaseURL + "favorites/destroy/" + aId + "." + aFormat;

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* NOTIFICATIONS REQUEST */

TwitterHelper.prototype.notifications.follow  = 
function notifications_follow(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  if (!aId)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL = this._self.mBaseURL + "notifications/follow/" + aId + "." + aFormat;

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.notifications.leave  = 
function notifications_leave(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  if (!aId)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL = this._self.mBaseURL + "notifications/leave/" + aId + "." + aFormat;

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* BLOCKS REQUESTS */

TwitterHelper.prototype.blocks.create  = 
function blocks_create(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  if (!aId)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL = this._self.mBaseURL + "blocks/create/" + aId + "." + aFormat;

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.blocks.destroy  = 
function blocks_destroy(aCallback, aErrorCallback, aContext, aFormat, aId)
{
  if (!aId)
  {
    this._self._localizedError(this._self.mServiceName, "MissingIdParameter");
    return;
  }

  var feedURL = this._self.mBaseURL + "blocks/destroy/" + aId + "." + aFormat;

  this._self._sendPostRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* HELP REQUESTS */

TwitterHelper.prototype.help.test  = 
function help_test(aCallback, aErrorCallback, aContext, aFormat)
{
  var feedURL = this._self.mBaseURL + "help/test." + aFormat;

  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* LIST REQUESTS */

TwitterHelper.prototype.lists.get =
function lists_get(aCallback, aErrorCallback, aContext, aFormat, aUser)
{
//http://api.twitter.com/version/:user/lists.format
  let feedURL = this._self.mBaseURL + aUser + "/lists." + aFormat;
  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.lists.timeline  = 
function lists_timeline(aCallback, aErrorCallback, aContext, aFormat, aUser, aListId, aSinceId, aCount, aPage)
{
  // http://api.twitter.com/version/:user/lists/:id/statuses.format
  var feedURL = this._self.mBaseURL + aUser + "/lists/" + aListId + "/statuses." + aFormat;
  //dl('lists_timeline feedURL is ' + feedURL);

  feedURL = this._self._addParamToQueryURL(feedURL, false, aSinceId, "since_id");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId, aCount, "per_page");
  feedURL = this._self._addParamToQueryURL(feedURL, aSinceId || aCount, aPage, "page");
  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* SEARCH REQUESTS */

TwitterHelper.prototype.searches.get =
function searches_get(aCallback, aErrorCallback, aContext, aFormat)
{
//http://api.twitter.com/version/saved_searches.format
  let feedURL = this._self.mBaseURL + "saved_searches." + aFormat;
  //dump("searches feedURL is " + feedURL + "\n");
  
  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

TwitterHelper.prototype.searches.timeline  = 
function searches_timeline(aCallback, aErrorCallback, aContext, aFormat, aQuery, aSinceId, aCount, aPage)
{
  // http://search.twitter.com/search.format
  var feedURL = "http://search.twitter.com/search."  + aFormat;

  feedURL = this._self._addParamToQueryURL(feedURL, false, aQuery, "q");
  feedURL = this._self._addParamToQueryURL(feedURL, aQuery, aSinceId, "since_id");
  feedURL = this._self._addParamToQueryURL(feedURL, aQuery || aSinceId, aCount, "rpp");
  feedURL = this._self._addParamToQueryURL(feedURL, aQuery || aSinceId || aCount, aPage, "page");
  this._self._sendRequest(feedURL, aCallback, aErrorCallback, true, aContext);
}

/* UTILITIES */

TwitterHelper.prototype.isMention  = 
function _isMention(aText)
{
  var matches = aText.match( /(@\w*)/g );

  for (var i = 0; i < matches.length; i++)
    if (matches[i] == "@" + this.mAccount)
      return true;
  return false;    
}

TwitterHelper.prototype.getAuthUrl  = 
function _getAuthUrl(callback)
{
  let consumer = this.mConsumer;
  //we are trying to get a new token so clear out the old stuff
  consumer.accessToken =  "";
  consumer.accessTokenSecret =  "";
  
  var message = { action: consumer.serviceProvider.requestTokenURL
                , method: "GET"
                , parameters: [] };
  OAuth.completeRequest(message, consumer);
  var aCallback = function _callback(answer) {
    consumer.accessToken = getURLParam(answer, "oauth_token");
    consumer.accessTokenSecret = getURLParam(answer, "oauth_token_secret");
    callback(consumer.serviceProvider.userAuthorizationURL + "?oauth_token=" + consumer.accessToken);
  };
  
  var url = OAuth.addToURL(message.action, message.parameters);
  var xmlRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                             .createInstance(Components.interfaces.nsIXMLHttpRequest);
  var _self = this;
  xmlRequest.onreadystatechange = function() { if(this.readyState == 4) aCallback(this.responseText) };
  xmlRequest.mozBackgroundRequest = true;
  xmlRequest.open("GET", url, true);
  xmlRequest.send();
}

TwitterHelper.prototype.getAccessToken  = 
function _getAccessToken(verifier, callback)
{
  let consumer = this.mConsumer;
  var message = { action: consumer.serviceProvider.accessTokenURL
                , method: "GET"
                , parameters: []
                };
        
  OAuth.setParameter(message, "oauth_verifier", verifier);
  OAuth.completeRequest(message, consumer);
  var aCallback = function _callback(answer)
  {
    consumer.accessToken = getURLParam(answer, "oauth_token");
    consumer.accessTokenSecret = getURLParam(answer, "oauth_token_secret");
    var screen_name = getURLParam(answer, "screen_name");
    callback(consumer, screen_name);
  };

  var url = OAuth.addToURL(message.action, message.parameters);
  var xmlRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                             .createInstance(Components.interfaces.nsIXMLHttpRequest);
  //var _self = this; // RKJ: is this needed? I see no reference
  xmlRequest.onreadystatechange = function _onreadystatechange()
  {
    if(this.readyState == 4)
      aCallback(this.responseText)
  };
  xmlRequest.mozBackgroundRequest = true;
  xmlRequest.open("GET", url, true);
  xmlRequest.send();
}

function getURLParam(url, strParamName)
{
  var strReturn = "";
  var strHref = url;
  var strQueryString = url;
  var aQueryString = strQueryString.split("&");
  for ( var iParam = 0; iParam < aQueryString.length; iParam++ )
  {
    if (aQueryString[iParam].indexOf(strParamName + "=") > -1 )
    {
      var aParam = aQueryString[iParam].split("=");
      strReturn = aParam[1];
      break;
    }
  }
  return unescape(strReturn);
}
