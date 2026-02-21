'use strict';

importScripts(
  'features/scheduler/types.js',
  'features/scheduler/schedulerValidation.js',
  'features/scheduler/schedulerStorage.js',
  'features/scheduler/schedulerService.js'
);

var PostStatus = self.SkoolPulse && self.SkoolPulse.SchedulerTypes && self.SkoolPulse.SchedulerTypes.PostStatus;
var Storage = self.SkoolPulse && self.SkoolPulse.SchedulerStorage;
var SchedulerService = self.SkoolPulse && self.SkoolPulse.SchedulerService;

function scheduleNextAlarm() {
  if (!Storage || !SchedulerService) return;
  chrome.storage.local.get(['skoolPulse_schedulerPaused'], function (items) {
    if (items.skoolPulse_schedulerPaused) {
      chrome.alarms.clear('skoolPulse_publish');
      return;
    }
    Storage.getAll(function (err, posts) {
      if (err || !posts) return;
      SchedulerService.scheduleNextAlarm(posts);
    });
  });
}

function runPublishForPost(post, cb) {
  if (!post || !post.id) return cb(new Error('Invalid post'));
  var slug = post.groupSlug || post.communityId || '';
  var url = 'https://www.skool.com/' + slug;
  chrome.tabs.create({ url: url }, function (tab) {
    if (chrome.runtime.lastError || !tab || !tab.id) {
      return cb(new Error('Could not open tab'));
    }
    var isPostNow = post.id === 'post-now';
    function sendToTab() {
      chrome.tabs.sendMessage(tab.id, {
        action: 'publishScheduledPost',
        postId: post.id,
        title: post.title,
        content: post.content,
        gifUrl: post.gifUrl || null,
      }, function (response) {
        if (chrome.runtime.lastError) {
          if (isPostNow) cb(new Error(chrome.runtime.lastError.message));
          else markFailed(post.id, 'SEND_ERROR', chrome.runtime.lastError.message, cb);
          return;
        }
        if (response && response.success) {
          if (isPostNow) {
            if (cb) cb(null, { success: true });
          } else {
            Storage.update(post.id, { status: PostStatus.PUBLISHED, lastError: null }, function () {
              scheduleNextAlarm();
              if (cb) cb(null, { success: true });
            });
          }
        } else {
          var code = (response && response.errorCode) || 'UNKNOWN';
          var msg = (response && response.errorMessage) || '';
          if (isPostNow) cb(null, { success: false, errorCode: code, errorMessage: msg });
          else markFailed(post.id, code, msg, cb);
        }
      });
    }
    var loaded = false;
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete' && !loaded) {
        loaded = true;
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(function () {
          chrome.tabs.sendMessage(tab.id, { action: 'waitForComposer' }, function (ready) {
            if (chrome.runtime.lastError) ready = null;
            if (ready && ready.ready) {
              setTimeout(sendToTab, 2000);
            } else {
              setTimeout(sendToTab, 8000);
            }
          });
        }, 4000);
      }
    });
  });
}

function markFailed(postId, code, message, cb) {
  Storage.getById(postId, function (err, post) {
    if (err || !post) return cb && cb(err);
    var MAX_RETRIES = 2;
    var retryCount = Math.min((post.retryCount || 0) + 1, MAX_RETRIES);
    Storage.update(postId, {
      status: retryCount >= MAX_RETRIES ? PostStatus.FAILED : PostStatus.SCHEDULED,
      retryCount: retryCount,
      lastError: { code: code, message: message || '' },
    }, function () {
      scheduleNextAlarm();
      if (cb) cb(null, { success: false, errorCode: code, errorMessage: message });
    });
  });
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name !== 'skoolPulse_publish' || !Storage) return;
  Storage.getAll(function (err, posts) {
    if (err || !posts || !posts.length) return;
    var now = Date.now();
    var due = posts
      .filter(function (p) { return (p.status === PostStatus.SCHEDULED || p.status === PostStatus.QUEUED) && new Date(p.scheduledAt).getTime() <= now + 60000; })
      .sort(function (a, b) { return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(); })[0];
    if (!due) {
      scheduleNextAlarm();
      return;
    }
    runPublishForPost(due, function () {});
  });
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === 'openSidePanel' && sender.tab && sender.tab.windowId != null) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(function () {});
    sendResponse({});
    return true;
  }
  if (msg.action === 'scheduleNextAlarm') {
    scheduleNextAlarm();
    sendResponse({});
    return true;
  }
  if (msg.action === 'postNow') {
    var groupSlug = (msg.groupSlug || '').trim();
    if (!groupSlug) {
      sendResponse({ error: 'Missing group slug' });
      return false;
    }
    var fakePost = {
      id: 'post-now',
      groupSlug: groupSlug,
      title: msg.title || '',
      content: msg.content || '',
      gifUrl: msg.gifUrl || null
    };
    runPublishForPost(fakePost, function (err, result) {
      if (err) sendResponse({ error: err.message });
      else if (result && !result.success) sendResponse({ error: (result.errorMessage || result.errorCode) || 'Post failed' });
      else sendResponse({});
    });
    return true;
  }
  if (msg.action === 'runScheduledPublish' && msg.postId && Storage) {
    Storage.getById(msg.postId, function (err, post) {
      if (err || !post) {
        sendResponse({ success: false, errorCode: 'NOT_FOUND' });
        return;
      }
      runPublishForPost(post, function (err, result) {
        sendResponse(result || { success: false, errorCode: err && err.message });
      });
    });
    return true;
  }
});

// Clicking the extension icon opens the side panel.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function () {});

chrome.action.onClicked.addListener(function (tab) {
  if (tab && tab.windowId != null) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(function () {});
  }
});

chrome.sidePanel.setOptions({ enabled: true }).catch(function () {});

scheduleNextAlarm();
