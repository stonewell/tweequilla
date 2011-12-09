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
 * Portions created by the Initial Developer are Copyright (C) 2011
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

const Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/AddonUpdateChecker.jsm");
Cu.import("resource://tweequilla/Utils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
var gStatusElement = null; // status bar label element
var gInstructions = null; // instructions element
var gStrings = Cc["@mozilla.org/intl/stringbundle;1"]
                .getService(Ci.nsIStringBundleService)
                .createBundle("chrome://tweequilla/locale/extension.properties");
let gState = "initial";

// constants from XPIProvider.jsm
const REQ_VERSION                     = 2;
const PREF_MATCH_OS_LOCALE            = "intl.locale.matchOS";
const PREF_SELECTED_LOCALE            = "general.useragent.locale";
const PREF_EM_UPDATE_URL              = "extensions.update.url";

var gAsyncDriver = new Utils.AsyncDriver();

function dl(t) {
  dump(t + "\n");
}

function onAccept(e)
{
  if (gState == "needUpdatePermission")
  {
    gState = "haveUpdatePermission";
    document.getElementById('accept').hidden = true;
    gAsyncDriver.nextStep();
    return false;
  }
  if (gState == "needEnablePermission")
  {
    gState = "haveEnablePermission";
    document.getElementById('accept').hidden = true;
    gAsyncDriver.nextStep();
    return false;
  }

  return true;
}

function onLoad(e)
{
  gStatusElement = document.getElementById('statusText');
  gInstructions = document.getElementById('instructions');
  document.getElementById('accept').hidden = true;
  gAsyncDriver.runAsync(SkinkGlueLoader.getSkinkGlue());
}

SkinkGlueLoader = {
  // main loop generator
  getSkinkGlue: function getSkinkGlue()
  { try {

    // We only get here if SkinkGlue was not found. First, let's check the local status
    let sgAddon = { // a minimal Addon object representing the SkinkGlue addon
      id: "skinkglue@mesquilla.com",
      type: "extension",
      version: "0",
    }

    let installedAddon = null;
    AddonManager.getAddonByID(sgAddon.id, 
      function onGotAddon(aAddon)
      {
        installedAddon = aAddon;
        gAsyncDriver.nextStep();
      }
    );
    yield;

    let status = null;
    if (!installedAddon)
    {
      gStatusElement.label = gStrings.GetStringFromName('skinkGlueMissing');
      status = 'needInstall';
    }
    else if (!installedAddon.isCompatible)
    {
      gStatusElement.label = gStrings.GetStringFromName('skinkGlueIncompatible');
      status = 'needUpdate';
    }
    else if (installedAddon.userDisabled)
    {
      gStatusElement.label = gStrings.GetStringFromName('skinkGlueDisabled');
      status = 'needEnabling';
    }
    else
    {
      gStatusElement.label = gStrings.GetStringFromName('skinkGlueFailing');
      status = 'addonFailure';
    }

    let updateResult = null;
    let requestError = false;
    if (status == 'needInstall' || status == 'needUpdate' || status == 'addonFailure')
    {
      // see if we have an available update from the Mozilla site
      gInstructions.value = gStrings.GetStringFromName('checkingAMO');
      let updateURL = Services.prefs.getCharPref(PREF_EM_UPDATE_URL);

      const UPDATE_TYPE_NEWVERSION = 64;
      let url = escapeAddonURI(sgAddon, updateURL, UPDATE_TYPE_NEWVERSION);

      AddonUpdateChecker.checkForUpdates(sgAddon.id, sgAddon.type, null, url,
        {
          onUpdateCheckComplete: function onUpdateCheckComplete(results)
          {
            updateResult = results && results.length ? results[0] : null;
            gAsyncDriver.nextStep();
          },
          onUpdateCheckError: function onUpdateCheckError(aStatus)
          {
            requestError = true;
            gAsyncDriver.nextStep();
          }
        }
      );
      yield;

      if (requestError)
        status = 'requestError';
      else if (!updateResult || !updateResult.updateURL || !updateResult.updateURL.length)
        status = 'noAvailableUpdate';
      else
        status = 'haveAvailableUpdate';
    }

    // now we wait for permission
    switch (status)
    {
      case 'requestError':
        gInstructions.value = gStrings.GetStringFromName('requestError');
        gState = "done";
        document.getElementById('accept').hidden = false;
        document.getElementById('cancel').hidden = true;
        return;
      case 'haveAvailableUpdate':
        gInstructions.value = gStrings.GetStringFromName('loadSkinkGlue');
        gState = "needUpdatePermission";
        document.getElementById('accept').hidden = false;
        yield;
        break;
      case 'needEnabling':
        gInstructions.value = gStrings.GetStringFromName('enableSkinkGlue');
        gState = "needEnablePermission";
        document.getElementById('accept').hidden = false;
        yield;
        break;
      case 'noAvailableUpdate':
        gInstructions.value = gStrings.GetStringFromName('skinkGlueNotAvailable');
        gState = "done";
        document.getElementById('accept').hidden = false;
        document.getElementById('cancel').hidden = true;
        return;
    }

    if (gState == 'haveEnablePermission')
    {
      installedAddon.userDisabled = false;
      gInstructions.value = gStrings.GetStringFromName('needRestartEnable');
      gState = "done";
      document.getElementById('accept').hidden = false;
      document.getElementById('cancel').hidden = true;
      gStatusElement.label = '';
    }

    if (gState == 'haveUpdatePermission')
    {
      // Now let's do the install
      gAsyncDriver.needsYield = true;
      let addonInstall = null;
      AddonManager.getInstallForURL(
        updateResult.updateURL,
        function (aInstall)
        {
          addonInstall = aInstall;
          gAsyncDriver.nextStep();
        },
        "application/x-xpinstall", updateResult.updateHash,
        "New Account Types", null, updateResult.version, null
      );
      if (gAsyncDriver.needsYield)
      {
        gAsyncDriver.needsYield = false;
        yield;
      }

      // now we have the install, make it happen
      let installListener = {
        onInstallEnded: function onInstallEnded(aInstall) {
          gState = "done";
          document.getElementById('accept').hidden = false;
          document.getElementById('cancel').hidden = true;
          gStatusElement.label = '';
          gInstructions.value = gStrings.GetStringFromName('needRestartInstall');
          addonInstall.removeListener(this);
        },
        onDownloadCancelled: function onDownloadCancelled(aInstall) {
          gState = "done";
          document.getElementById('accept').hidden = false;
          document.getElementById('cancel').hidden = true;
          gInstructions.value = gStrings.GetStringFromName('skinkGlueNotInstalled');
          addonInstall.removeListener(this);
        },
      };
      addonInstall.addListener(installListener);
      AddonManager.installAddonsFromWebpage("application/x-xpinstall", window, null, [addonInstall]);
    }

  } catch (e) {Utils.re(e);}},

}

// functions from XPIProvider.jsm

/**
 * Replaces %...% strings in an addon url (update and updateInfo) with
 * appropriate values.
 *
 * @param  aAddon
 *         The AddonInternal representing the add-on
 * @param  aUri
 *         The uri to escape
 * @param  aUpdateType
 *         An optional number representing the type of update, only applicable
 *         when creating a url for retrieving an update manifest
 * @param  aAppVersion
 *         The optional application version to use for %APP_VERSION%
 * @return the appropriately escaped uri.
 */
function escapeAddonURI(aAddon, aUri, aUpdateType, aAppVersion)
{ try{
  var addonStatus = aAddon.userDisabled || aAddon.softDisabled ? "userDisabled"
                                                               : "userEnabled";

  if (!aAddon.isCompatible)
    addonStatus += ",incompatible";
  if (aAddon.blocklistState == Ci.nsIBlocklistService.STATE_BLOCKED)
    addonStatus += ",blocklisted";
  if (aAddon.blocklistState == Ci.nsIBlocklistService.STATE_SOFTBLOCKED)
    addonStatus += ",softblocked";

  try {
    var xpcomABI = Services.appinfo.XPCOMABI;
  } catch (ex) {
    xpcomABI = UNKNOWN_XPCOM_ABI;
  }

  let uri = aUri.replace(/%ITEM_ID%/g, aAddon.id);
  uri = uri.replace(/%ITEM_VERSION%/g, aAddon.version);
  uri = uri.replace(/%ITEM_STATUS%/g, addonStatus);
  uri = uri.replace(/%APP_ID%/g, Services.appinfo.ID);
  uri = uri.replace(/%APP_VERSION%/g, aAppVersion ? aAppVersion :
                                                    Services.appinfo.version);
  uri = uri.replace(/%REQ_VERSION%/g, REQ_VERSION);
  uri = uri.replace(/%APP_OS%/g, Services.appinfo.OS);
  uri = uri.replace(/%APP_ABI%/g, xpcomABI);
  uri = uri.replace(/%APP_LOCALE%/g, getLocale());
  uri = uri.replace(/%CURRENT_APP_VERSION%/g, Services.appinfo.version);

  // If there is an updateType then replace the UPDATE_TYPE string
  if (aUpdateType)
    uri = uri.replace(/%UPDATE_TYPE%/g, aUpdateType);

  // If this add-on has compatibility information for either the current
  // application or toolkit then replace the ITEM_MAXAPPVERSION with the
  // maxVersion
  let app = aAddon.matchingTargetApplication;
  if (app)
    var maxVersion = app.maxVersion;
  else
    maxVersion = "";
  uri = uri.replace(/%ITEM_MAXAPPVERSION%/g, maxVersion);

  // Replace custom parameters (names of custom parameters must have at
  // least 3 characters to prevent lookups for something like %D0%C8)
  var catMan = null;
  uri = uri.replace(/%(\w{3,})%/g, function(aMatch, aParam) {
    if (!catMan) {
      catMan = Cc["@mozilla.org/categorymanager;1"].
               getService(Ci.nsICategoryManager);
    }

    try {
      var contractID = catMan.getCategoryEntry(CATEGORY_UPDATE_PARAMS, aParam);
      var paramHandler = Cc[contractID].getService(Ci.nsIPropertyBag2);
      return paramHandler.getPropertyAsAString(aParam);
    }
    catch(e) {
      return aMatch;
    }
  });

  // escape() does not properly encode + symbols in any embedded FVF strings.
  return uri.replace(/\+/g, "%2B");
} catch(e) {Utils.re(e);}}

/**
 * Gets the currently selected locale for display.
 * @return  the selected locale or "en-US" if none is selected
 */
function getLocale() {
  if (Prefs.getBoolPref(PREF_MATCH_OS_LOCALE, false))
    return Services.locale.getLocaleComponentForUserAgent();
  let locale = Prefs.getComplexValue(PREF_SELECTED_LOCALE, Ci.nsIPrefLocalizedString);
  if (locale)
    return locale;
  return Prefs.getCharPref(PREF_SELECTED_LOCALE, "en-US");
}

/**
 * A helpful wrapper around the prefs service that allows for default values
 * when requested values aren't set.
 */
var Prefs = {
  /**
   * Gets a preference from the default branch ignoring user-set values.
   *
   * @param  aName
   *         The name of the preference
   * @param  aDefaultValue
   *         A value to return if the preference does not exist
   * @return the default value of the preference or aDefaultValue if there is
   *         none
   */
  getDefaultCharPref: function(aName, aDefaultValue) {
    try {
      return Services.prefs.getDefaultBranch("").getCharPref(aName);
    }
    catch (e) {
    }
    return aDefaultValue;
  },

  /**
   * Gets a string preference.
   *
   * @param  aName
   *         The name of the preference
   * @param  aDefaultValue
   *         A value to return if the preference does not exist
   * @return the value of the preference or aDefaultValue if there is none
   */
  getCharPref: function(aName, aDefaultValue) {
    try {
      return Services.prefs.getCharPref(aName);
    }
    catch (e) {
    }
    return aDefaultValue;
  },

  /**
   * Gets a complex preference.
   *
   * @param  aName
   *         The name of the preference
   * @param  aType
   *         The interface type of the preference
   * @param  aDefaultValue
   *         A value to return if the preference does not exist
   * @return the value of the preference or aDefaultValue if there is none
   */
  getComplexValue: function(aName, aType, aDefaultValue) {
    try {
      return Services.prefs.getComplexValue(aName, aType).data;
    }
    catch (e) {
    }
    return aDefaultValue;
  },

  /**
   * Gets a boolean preference.
   *
   * @param  aName
   *         The name of the preference
   * @param  aDefaultValue
   *         A value to return if the preference does not exist
   * @return the value of the preference or aDefaultValue if there is none
   */
  getBoolPref: function(aName, aDefaultValue) {
    try {
      return Services.prefs.getBoolPref(aName);
    }
    catch (e) {
    }
    return aDefaultValue;
  },

  /**
   * Gets an integer preference.
   *
   * @param  aName
   *         The name of the preference
   * @param  defaultValue
   *         A value to return if the preference does not exist
   * @return the value of the preference or defaultValue if there is none
   */
  getIntPref: function(aName, defaultValue) {
    try {
      return Services.prefs.getIntPref(aName);
    }
    catch (e) {
    }
    return defaultValue;
  },

  /**
   * Clears a preference if it has a user value
   *
   * @param  aName
   *         The name of the preference
   */
  clearUserPref: function(aName) {
    if (Services.prefs.prefHasUserValue(aName))
      Services.prefs.clearUserPref(aName);
  }
}

window.addEventListener("load", function(e) { onLoad(e); }, false);
