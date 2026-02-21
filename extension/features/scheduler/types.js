/**
 * Scheduler feature types and constants.
 */
(function (global) {
  'use strict';

  var PostStatus = {
    QUEUED: 'QUEUED',
    SCHEDULED: 'SCHEDULED',
    PUBLISHED: 'PUBLISHED',
    FAILED: 'FAILED',
    PAUSED: 'PAUSED',
  };

  var MAX_QUEUED_PER_COMMUNITY = 3;
  var MAX_SCHEDULED_PER_DAY = 3;
  var MIN_BUFFER_MS = 2 * 60 * 60 * 1000; // 2 hours
  var MAX_RETRIES = 2;

  global.SkoolPulse = global.SkoolPulse || {};
  global.SkoolPulse.SchedulerTypes = {
    PostStatus: PostStatus,
    MAX_QUEUED_PER_COMMUNITY: MAX_QUEUED_PER_COMMUNITY,
    MAX_SCHEDULED_PER_DAY: MAX_SCHEDULED_PER_DAY,
    MIN_BUFFER_MS: MIN_BUFFER_MS,
    MAX_RETRIES: MAX_RETRIES,
  };
})(typeof window !== 'undefined' ? window : self);
