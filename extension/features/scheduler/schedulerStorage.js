/**
 * CRUD for ScheduledPost. Uses chrome.storage.local (works in all extension contexts).
 */
(function (global) {
  'use strict';

  var KEY = 'skoolPulse_scheduledPosts';

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getAll(cb) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([KEY], function (items) {
        var list = items[KEY];
        cb(null, Array.isArray(list) ? list : []);
      });
    } else {
      cb(null, []);
    }
  }

  function getById(id, cb) {
    getAll(function (err, list) {
      if (err) return cb(err);
      var post = list.filter(function (p) { return p.id === id; })[0];
      cb(null, post || null);
    });
  }

  function getActive() {
    return ['QUEUED', 'SCHEDULED', 'PAUSED'];
  }

  function create(post, cb) {
    var doc = {
      id: post.id || generateId(),
      communityId: post.communityId,
      communityName: post.communityName || '',
      groupSlug: post.groupSlug || null,
      title: post.title != null ? post.title : '',
      content: post.content || '',
      gifUrl: post.gifUrl || null,
      scheduledAt: post.scheduledAt,
      status: post.status || 'QUEUED',
      createdAt: post.createdAt || new Date().toISOString(),
      updatedAt: post.updatedAt || new Date().toISOString(),
      retryCount: post.retryCount != null ? post.retryCount : 0,
      lastError: post.lastError || null,
    };
    getAll(function (err, list) {
      if (err) return cb(err);
      list.push(doc);
      setAll(list, function (e) { cb(e, doc); });
    });
  }

  function update(id, updates, cb) {
    cb = typeof cb === 'function' ? cb : function () {};
    getAll(function (err, list) {
      if (err) return cb(err);
      var idx = list.findIndex(function (p) { return p.id === id; });
      if (idx === -1) return cb(new Error('Post not found'));
      var next = Object.assign({}, list[idx], updates, { updatedAt: new Date().toISOString() });
      list[idx] = next;
      setAll(list, function (e) { cb(e, next); });
    });
  }

  function remove(id, cb) {
    cb = typeof cb === 'function' ? cb : function () {};
    getAll(function (err, list) {
      if (err) return cb(err);
      var filtered = list.filter(function (p) { return p.id !== id; });
      setAll(filtered, cb);
    });
  }

  function setAll(list, cb) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [KEY]: list }, cb);
    } else {
      cb();
    }
  }

  global.SkoolPulse = global.SkoolPulse || {};
  global.SkoolPulse.SchedulerStorage = {
    getAll: getAll,
    getById: getById,
    getActive: getActive,
    create: create,
    update: update,
    remove: remove,
  };
})(typeof window !== 'undefined' ? window : self);
