/**
 * Scheduler service: validation, next slot, alarms, publish.
 */
(function (global) {
  'use strict';

  var Types = global.SkoolPulse && global.SkoolPulse.SchedulerTypes;
  var Storage = global.SkoolPulse && global.SkoolPulse.SchedulerStorage;
  var Validation = global.SkoolPulse && global.SkoolPulse.SchedulerValidation;
  if (!Types || !Storage) return;

  var PostStatus = Types.PostStatus;
  var MAX_RETRIES = Types.MAX_RETRIES;

  function activeStatuses() {
    return [PostStatus.QUEUED, PostStatus.SCHEDULED, PostStatus.PAUSED];
  }

  function dateKey(isoOrDate) {
    var d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function validateScheduleConstraints(newPost, existingPosts) {
    return Validation ? Validation.validateScheduleConstraints(newPost, existingPosts) : { ok: true, errors: [] };
  }

  function computeNextAvailableSlot(preferredAt, existingPosts) {
    return Validation ? Validation.computeNextAvailableSlot(preferredAt, existingPosts) : new Date(preferredAt.getTime());
  }

  /**
   * Set chrome alarm for the next due scheduled post. Call from background.
   * @param {Array<{ id: string, scheduledAt: string, status: string }>} existingPosts
   */
  function scheduleNextAlarm(existingPosts) {
    if (typeof chrome === 'undefined' || !chrome.alarms) return;

    var due = existingPosts
      .filter(function (p) { return p.status === PostStatus.SCHEDULED || p.status === PostStatus.QUEUED; })
      .map(function (p) { return { id: p.id, at: new Date(p.scheduledAt).getTime() }; })
      .filter(function (p) { return p.at > Date.now(); })
      .sort(function (a, b) { return a.at - b.at; })[0];

    chrome.alarms.clear('skoolPulse_publish');
    if (due) {
      chrome.alarms.create('skoolPulse_publish', { when: due.at });
    }
  }

  /**
   * Attempt to publish a scheduled post. On failure, increment retryCount and set lastError.
   * @param {string} postId
   * @param {function(Error?, { success: boolean, errorCode?: string, errorMessage?: string }?)} cb
   */
  function publishScheduledPost(postId, cb) {
    Storage.getById(postId, function (err, post) {
      if (err || !post) return cb(err || new Error('Post not found'));

      function fail(code, message) {
        var retryCount = Math.min((post.retryCount || 0) + 1, MAX_RETRIES);
        Storage.update(postId, {
          status: retryCount >= MAX_RETRIES ? PostStatus.FAILED : PostStatus.SCHEDULED,
          retryCount: retryCount,
          lastError: { code: code, message: message || '' },
        }, function () {
          cb(null, { success: false, errorCode: code, errorMessage: message });
        });
      }

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'publishScheduledPost',
          postId: postId,
          title: post.title,
          content: post.content,
          communityId: post.communityId,
        }, function (response) {
          if (chrome.runtime.lastError) {
            fail('SEND_ERROR', chrome.runtime.lastError.message);
            return;
          }
          if (response && response.success) {
            Storage.update(postId, { status: PostStatus.PUBLISHED, lastError: null }, function () {
              cb(null, { success: true });
            });
          } else {
            fail((response && response.errorCode) || 'UNKNOWN', response && response.errorMessage);
          }
        });
      } else {
        fail('AUTH_REQUIRED', 'Not on Skool or not logged in.');
      }
    });
  }

  global.SkoolPulse.SchedulerService = {
    validateScheduleConstraints: validateScheduleConstraints,
    computeNextAvailableSlot: computeNextAvailableSlot,
    scheduleNextAlarm: scheduleNextAlarm,
    publishScheduledPost: publishScheduledPost,
    activeStatuses: activeStatuses,
    dateKey: dateKey,
  };
})(typeof window !== 'undefined' ? window : self);
