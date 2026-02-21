/**
 * Motivation feature types and constants.
 * @module features/motivation/types
 */
(function (global) {
  'use strict';

  var MotivationState = {
    ACTIVE: 'ACTIVE',
    AT_RISK: 'AT_RISK',
    INACTIVE: 'INACTIVE',
    DETENTION: 'DETENTION',
  };

  var INACTIVE_DAYS_THRESHOLD = 2;
  var SNOOZE_HOURS = 24;

  global.SkoolPulse = global.SkoolPulse || {};
  global.SkoolPulse.MotivationTypes = {
    MotivationState: MotivationState,
    INACTIVE_DAYS_THRESHOLD: INACTIVE_DAYS_THRESHOLD,
    SNOOZE_HOURS: SNOOZE_HOURS,
  };
})(typeof window !== 'undefined' ? window : self);
