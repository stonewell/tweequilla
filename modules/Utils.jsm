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
 
var EXPORTED_SYMBOLS = ["Utils"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;
const CE = Components.Exception;

function _AsyncDriver()
{
  this.curGenerator = null;
  // If a callback is called before the yield, then we generate an error. So
  //  we have to track if a yield is needed.
  this.needsYield = false;
}

_AsyncDriver.prototype = 
{
  nextStep: function asc_nextStep()
  {
    if (this.needsYield)
    {
      this.needsYield = false;
      return true;
    }
    try {
      this.curGenerator.next();
      return true;
    }
    catch (ex) {
      if (ex != StopIteration) {
        Cu.reportError('TweeQuilla generator exception: ' + ex + '\n');
      }
    }
    return false;
  },
  runAsync: function asc_runAsync(aGenerator)
  {
    this.curGenerator = aGenerator;
    this.nextStep();
  }
}

Utils = {
  se: function se(error) // string error
  {
    let jsFrame;
    let str = 'javascript error: ' + error + '\n';
    if (error)
    {
      str += ' file: ' + error.fileName + ' line: ' + error.lineNumber + '\n';
      let jsFrame = error.stack;
    }
    if (!jsFrame)
      jsFrame = Components.stack;
    while (jsFrame)
    {
      str += jsFrame.toString() + '\n';
      jsFrame = jsFrame.caller;
    }
    return str;
  },

  re: function re(error)
  {
    let strError= this.se(error);
    dump(strError + '\n');
    Cu.reportError(strError);
    throw error;
  },

  AsyncDriver: _AsyncDriver,
}
