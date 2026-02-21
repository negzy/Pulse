/**
 * Motivation state machine: ACTIVE | AT_RISK | INACTIVE | DETENTION.
 */
(function (global) {
  'use strict';

  var Types = global.SkoolPulse && global.SkoolPulse.MotivationTypes;
  var Storage = global.SkoolPulse && global.SkoolPulse.MotivationStorage;
  if (!Types || !Storage) return;

  var MotivationState = Types.MotivationState;
  var INACTIVE_DAYS_THRESHOLD = Types.INACTIVE_DAYS_THRESHOLD || 2;
  var SNOOZE_HOURS = Types.SNOOZE_HOURS || 24;
  var dayMs = 24 * 60 * 60 * 1000;

  function getMotivationState(context, cb) {
    Storage.load(function (err, data) {
      if (err) return cb(err, { state: MotivationState.ACTIVE });

      var now = Date.now();
      if (context.hasOverdueTasks) {
        Storage.save({ motivationState: MotivationState.DETENTION }, function () {
          cb(null, { state: MotivationState.DETENTION });
        });
        return;
      }

      var startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      var startOfYesterday = new Date(startOfToday.getTime() - dayMs);
      var lastActiveAt = data.lastActiveAt;

      var hadActivityToday = lastActiveAt !== null && lastActiveAt >= startOfToday.getTime();
      var hadActivityYesterday = lastActiveAt !== null && lastActiveAt >= startOfYesterday.getTime();

      var daysSince = 0;
      if (lastActiveAt != null) {
        var startOfLastActive = new Date(lastActiveAt);
        startOfLastActive.setHours(0, 0, 0, 0);
        daysSince = Math.floor((startOfToday.getTime() - startOfLastActive.getTime()) / dayMs);
      } else {
        daysSince = 999;
      }

      if (daysSince >= INACTIVE_DAYS_THRESHOLD && !hadActivityToday && !hadActivityYesterday) {
        Storage.save({ motivationState: MotivationState.INACTIVE }, function () {
          cb(null, { state: MotivationState.INACTIVE });
        });
        return;
      }

      if (!context.hadActivityToday && !hadActivityToday) {
        Storage.save({ motivationState: MotivationState.AT_RISK }, function () {
          cb(null, { state: MotivationState.AT_RISK });
        });
        return;
      }

      Storage.save({ motivationState: MotivationState.ACTIVE }, function () {
        cb(null, { state: MotivationState.ACTIVE });
      });
    });
  }

  function shouldShowComebackModal(context, cb) {
    Storage.load(function (err, data) {
      if (err) return cb(err, false);
      var now = Date.now();
      if (context.hasOverdueTasks) return cb(null, false);
      if (data.motivationState !== MotivationState.INACTIVE) return cb(null, false);
      if (data.snoozeUntil != null && now < data.snoozeUntil) return cb(null, false);
      cb(null, true);
    });
  }

  function recordActivity(activityEvent, cb) {
    cb = typeof cb === 'function' ? cb : function () {};
    var at = (activityEvent && activityEvent.at != null) ? activityEvent.at : Date.now();
    Storage.save({ lastActiveAt: at }, cb);
  }

  function setSnooze(lastPromptAt, cb) {
    cb = typeof cb === 'function' ? cb : function () {};
    var until = Date.now() + SNOOZE_HOURS * 60 * 60 * 1000;
    var updates = { snoozeUntil: until };
    if (lastPromptAt != null) updates.lastComebackPromptAt = lastPromptAt;
    Storage.save(updates, cb);
  }

  function recordComebackPromptShown(cb) {
    cb = typeof cb === 'function' ? cb : function () {};
    Storage.save({ lastComebackPromptAt: Date.now() }, cb);
  }

  global.SkoolPulse.MotivationEngine = {
    getMotivationState: getMotivationState,
    shouldShowComebackModal: shouldShowComebackModal,
    recordActivity: recordActivity,
    setSnooze: setSnooze,
    recordComebackPromptShown: recordComebackPromptShown,
    MotivationState: MotivationState,
  };
})(typeof window !== 'undefined' ? window : self);
