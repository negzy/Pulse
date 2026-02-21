/**
 * Pure validation and slot logic for the scheduler (testable without Chrome).
 */
(function (root) {
  'use strict';

  var MAX_QUEUED_PER_COMMUNITY = 3;
  var MAX_SCHEDULED_PER_DAY = 3;
  var MIN_BUFFER_MS = 2 * 60 * 60 * 1000;

  function dateKey(isoOrDate) {
    var d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function activeStatuses() {
    return ['QUEUED', 'SCHEDULED', 'PAUSED'];
  }

  /**
   * @param {{ communityId: string, groupSlug?: string, id?: string, scheduledAt: string }} newPost
   * @param {Array<{ id?: string, communityId: string, groupSlug?: string, scheduledAt: string, status: string }>} existingPosts
   * @returns {{ ok: boolean, errors: string[] }}
   */
  function validateScheduleConstraints(newPost, existingPosts) {
    var errors = [];
    var active = existingPosts.filter(function (p) { return activeStatuses().indexOf(p.status) !== -1; });
    var others = newPost.id ? active.filter(function (p) { return p.id !== newPost.id; }) : active;

    // Check per-community limit: match by groupSlug if available, otherwise by communityId
    var sameCommunity = others.filter(function (p) {
      if (newPost.groupSlug && p.groupSlug) {
        return p.groupSlug === newPost.groupSlug;
      }
      return p.communityId === newPost.communityId;
    });
    if (sameCommunity.length >= MAX_QUEUED_PER_COMMUNITY) {
      errors.push('Community limit reached: max ' + MAX_QUEUED_PER_COMMUNITY + ' queued posts for this community.');
    }

    var day = dateKey(newPost.scheduledAt);
    var sameDay = others.filter(function (p) { return dateKey(p.scheduledAt) === day; });
    if (sameDay.length >= MAX_SCHEDULED_PER_DAY) {
      errors.push('Daily limit reached: max ' + MAX_SCHEDULED_PER_DAY + ' scheduled posts per day.');
    }

    var at = new Date(newPost.scheduledAt).getTime();
    for (var i = 0; i < others.length; i++) {
      var otherAt = new Date(others[i].scheduledAt).getTime();
      if (Math.abs(at - otherAt) < MIN_BUFFER_MS) {
        errors.push('Too close to another post: keep at least 2 hours between scheduled posts.');
        break;
      }
    }

    return { ok: errors.length === 0, errors: errors };
  }

  /**
   * @param {Date} preferredAt
   * @param {Array<{ scheduledAt: string, status: string }>} existingPosts
   * @returns {Date}
   */
  function computeNextAvailableSlot(preferredAt, existingPosts) {
    var active = existingPosts.filter(function (p) { return activeStatuses().indexOf(p.status) !== -1; });
    var candidate = new Date(preferredAt.getTime());

    while (true) {
      var day = dateKey(candidate);
      var sameDay = active.filter(function (p) { return dateKey(p.scheduledAt) === day; });
      if (sameDay.length >= MAX_SCHEDULED_PER_DAY) {
        candidate.setDate(candidate.getDate() + 1);
        candidate.setHours(0, 0, 0, 0);
        continue;
      }

      var tooClose = false;
      for (var i = 0; i < active.length; i++) {
        var otherAt = new Date(active[i].scheduledAt).getTime();
        if (Math.abs(candidate.getTime() - otherAt) < MIN_BUFFER_MS) {
          tooClose = true;
          candidate = new Date(Math.min(candidate.getTime(), otherAt) + MIN_BUFFER_MS);
          break;
        }
      }
      if (!tooClose) return candidate;
    }
  }

  var api = {
    validateScheduleConstraints: validateScheduleConstraints,
    computeNextAvailableSlot: computeNextAvailableSlot,
    dateKey: dateKey,
  };

  if (typeof root !== 'undefined') {
    root.SkoolPulse = root.SkoolPulse || {};
    root.SkoolPulse.SchedulerValidation = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : this);
