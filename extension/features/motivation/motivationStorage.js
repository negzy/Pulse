/**
 * Persistence for motivation state. Uses chrome.storage.local.
 */
(function (global) {
  'use strict';

  var MotivationState = (global.SkoolPulse && global.SkoolPulse.MotivationTypes && global.SkoolPulse.MotivationTypes.MotivationState) || { ACTIVE: 'ACTIVE', AT_RISK: 'AT_RISK', INACTIVE: 'INACTIVE', DETENTION: 'DETENTION' };

  var KEY = 'skoolPulse_motivation';
  var DEFAULTS = {
    lastActiveAt: null,
    motivationState: MotivationState.ACTIVE,
    lastComebackPromptAt: null,
    snoozeUntil: null,
  };

  function load(cb) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([KEY], function (items) {
        var raw = items[KEY];
        cb(null, raw ? Object.assign({}, DEFAULTS, raw) : Object.assign({}, DEFAULTS));
      });
    } else {
      cb(null, Object.assign({}, DEFAULTS));
    }
  }

  function save(data, cb) {
    cb = typeof cb === 'function' ? cb : function () {};
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([KEY], function (items) {
        var current = items[KEY] ? Object.assign({}, DEFAULTS, items[KEY]) : Object.assign({}, DEFAULTS);
        chrome.storage.local.set({ [KEY]: Object.assign({}, current, data) }, cb);
      });
    } else {
      cb();
    }
  }

  global.SkoolPulse = global.SkoolPulse || {};
  global.SkoolPulse.MotivationStorage = { load: load, save: save, DEFAULTS: DEFAULTS };
})(typeof window !== 'undefined' ? window : self);
