(function () {
  'use strict';

  const todayDate = document.getElementById('todayDate');
  const todayTotals = document.getElementById('todayTotals');
  const todayError = document.getElementById('todayError');
  const syncBtn = document.getElementById('syncBtn');
  const dashboardLink = document.getElementById('dashboardLink');
  const goalsPeriod = document.getElementById('goalsPeriod');
  const goalPosts = document.getElementById('goalPosts');
  const goalComments = document.getElementById('goalComments');
  const goalLikes = document.getElementById('goalLikes');
  const goalsProgress = document.getElementById('goalsProgress');
  const streakFires = document.getElementById('streakFires');
  const streakLabel = document.getElementById('streakLabel');
  const detentionBanner = document.getElementById('detentionBanner');
  const confettiContainer = document.getElementById('confettiContainer');
  const atRiskBanner = document.getElementById('atRiskBanner');
  var lastGoalsMet = { posts: false, comments: false, likes: false };
  const comebackModal = document.getElementById('comebackModal');
  const comebackShowTasks = document.getElementById('comebackShowTasks');
  const comebackReschedule = document.getElementById('comebackReschedule');
  const comebackSnooze = document.getElementById('comebackSnooze');
  const tabPulse = document.getElementById('tabPulse');
  const tabScheduler = document.getElementById('tabScheduler');
  const pulsePanel = document.getElementById('pulsePanel');
  const schedulerPanel = document.getElementById('schedulerPanel');
  const schedulerFrame = document.getElementById('schedulerFrame');

  if (tabPulse && tabScheduler && pulsePanel && schedulerPanel && schedulerFrame) {
    if (chrome.runtime && chrome.runtime.getURL) {
      schedulerFrame.src = chrome.runtime.getURL('scheduler.html');
    }
    tabPulse.addEventListener('click', function () {
      tabPulse.classList.add('active');
      tabScheduler.classList.remove('active');
      pulsePanel.classList.add('active');
      schedulerPanel.classList.remove('active');
    });
    tabScheduler.addEventListener('click', function () {
      tabScheduler.classList.add('active');
      tabPulse.classList.remove('active');
      schedulerPanel.classList.add('active');
      pulsePanel.classList.remove('active');
    });
  }

  function getMotivationContext(cb) {
    if (typeof SkoolPulse === 'undefined' || !SkoolPulse.MotivationStorage) {
      return cb({ hadActivityToday: false, hasOverdueTasks: false });
    }
    SkoolPulse.MotivationStorage.load(function (err, data) {
      if (err) return cb({ hadActivityToday: false, hasOverdueTasks: false });
      var startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      var hadActivityToday = data.lastActiveAt != null && data.lastActiveAt >= startOfToday.getTime();
      cb({ hadActivityToday: hadActivityToday, hasOverdueTasks: false });
    });
  }

  function refreshMotivationUI() {
    if (typeof SkoolPulse === 'undefined' || !SkoolPulse.MotivationEngine) return;
    getMotivationContext(function (context) {
      SkoolPulse.MotivationEngine.getMotivationState(context, function (err, result) {
        if (err || !result) return;
        if (atRiskBanner) atRiskBanner.style.display = result.state === 'AT_RISK' ? 'block' : 'none';
      });
      SkoolPulse.MotivationEngine.shouldShowComebackModal(context, function (err, show) {
        if (err || !comebackModal) return;
        comebackModal.style.display = show ? 'flex' : 'none';
        if (show && SkoolPulse.MotivationEngine.recordComebackPromptShown) {
          SkoolPulse.MotivationEngine.recordComebackPromptShown();
        }
      });
    });
  }

  if (comebackShowTasks) {
    comebackShowTasks.addEventListener('click', function () {
      if (comebackModal) comebackModal.style.display = 'none';
    });
  }
  if (comebackReschedule) {
    comebackReschedule.addEventListener('click', function () {
      if (dashboardLink && dashboardLink.href && dashboardLink.href !== '#') {
        window.open(dashboardLink.href, '_blank');
      }
      if (comebackModal) comebackModal.style.display = 'none';
    });
  }
  if (comebackSnooze) {
    comebackSnooze.addEventListener('click', function () {
      if (typeof SkoolPulse !== 'undefined' && SkoolPulse.MotivationEngine && SkoolPulse.MotivationEngine.setSnooze) {
        SkoolPulse.MotivationEngine.setSnooze(Date.now());
      }
      if (comebackModal) comebackModal.style.display = 'none';
    });
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderToday(data) {
    if (!todayDate || !todayTotals) return;
    if (data.error) {
      todayDate.textContent = '';
      todayTotals.innerHTML = '';
      if (todayError) {
        todayError.textContent = data.error;
        todayError.style.display = 'block';
      }
      return;
    }
    if (todayError) todayError.style.display = 'none';
    todayDate.textContent = data.dateLabel || 'Today';
    var t = data.totals || { posts: 0, comments: 0, likes: 0, interactions: 0 };
    todayTotals.innerHTML =
      '<div class="total-card"><span class="num">' + t.posts + '</span><span class="label">Posts</span></div>' +
      '<div class="total-card"><span class="num">' + t.comments + '</span><span class="label">Comments</span></div>' +
      '<div class="total-card"><span class="num">' + t.likes + '</span><span class="label">Likes</span></div>' +
      '<div class="total-card"><span class="num">' + t.interactions + '</span><span class="label">Interactions</span></div>';
  }

  function loadToday(baseUrl, token) {
    if (!baseUrl || !token) {
      updateCurrentTabSync();
      return;
    }
    var url = baseUrl.replace(/\/$/, '') + '/api/extension/today';
    fetch(url, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token },
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) updateCurrentTabSync();
        else renderToday(data);
      })
      .catch(function () { updateCurrentTabSync(); });
  }

  function showSyncSection(groupSlug, stats) {
    if (todayDate) todayDate.textContent = 'Today';
    if (todayError) todayError.style.display = 'none';
    if (todayTotals && stats) {
      todayTotals.innerHTML =
        '<div class="total-card"><span class="num">' + (stats.posts || 0) + '</span><span class="label">Posts</span></div>' +
        '<div class="total-card"><span class="num">' + (stats.comments || 0) + '</span><span class="label">Comments</span></div>' +
        '<div class="total-card"><span class="num">' + (stats.likes || 0) + '</span><span class="label">Likes</span></div>' +
        '<div class="total-card"><span class="num">' + (stats.interactions || 0) + '</span><span class="label">Interactions</span></div>';
    }
    refreshGoalsAndStreak(stats);
  }

  function getTodayStorageKey() {
    var d = new Date();
    return 'skoolPulse_personal_' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function getStorageKeyForDate(date) {
    return 'skoolPulse_personal_' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
  }

  function getActivityForPeriod(period, cb) {
    var today = new Date();
    if (period === 'daily') {
      var key = getStorageKeyForDate(today);
      chrome.storage.local.get([key], function (items) {
        var d = items[key] || {};
        cb({ posts: d.posts || 0, comments: d.comments || 0, likes: d.likes || 0 });
      });
      return;
    }
    chrome.storage.local.get(null, function (items) {
      var posts = 0, comments = 0, likes = 0;
      for (var k in items) {
        if (k.indexOf('skoolPulse_personal_') !== 0 || typeof items[k] !== 'object') continue;
        var m = k.match(/skoolPulse_personal_(\d+)-(\d+)-(\d+)/);
        if (!m) continue;
        var y = parseInt(m[1], 10), mo = parseInt(m[2], 10), day = parseInt(m[3], 10);
        var d = new Date(y, mo - 1, day);
        if (period === 'weekly') {
          var weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (d < weekAgo) continue;
        } else if (period === 'monthly') {
          if (d.getFullYear() !== today.getFullYear() || d.getMonth() !== today.getMonth()) continue;
        }
        posts += items[k].posts || 0;
        comments += items[k].comments || 0;
        likes += items[k].likes || 0;
      }
      cb({ posts: posts, comments: comments, likes: likes });
    });
  }

  var GOALS_KEY = 'skoolPulse_goals';
  var STREAK_KEY = 'skoolPulse_streak';
  var STREAK_TARGET = 5;
  var DETENTION_DAYS = 5;

  function loadGoals(cb) {
    chrome.storage.local.get([GOALS_KEY], function (items) {
      var g = items[GOALS_KEY] || {};
      cb({ period: g.period || 'daily', posts: g.posts || 0, comments: g.comments || 0, likes: g.likes || 0 });
    });
  }

  function saveGoals(goals) {
    chrome.storage.local.set({ [GOALS_KEY]: goals });
  }

  function loadStreak(cb) {
    chrome.storage.local.get([STREAK_KEY], function (items) {
      var s = items[STREAK_KEY] || {};
      cb({
        currentStreak: s.currentStreak || 0,
        lastGoalMetDate: s.lastGoalMetDate || null,
        consecutiveDaysMissed: s.consecutiveDaysMissed || 0,
        lastCheckedDate: s.lastCheckedDate || null,
        detention: !!s.detention
      });
    });
  }

  function saveStreak(s) {
    chrome.storage.local.set({ [STREAK_KEY]: s });
  }

  function goalsMet(activity, goals) {
    if (!goals || (goals.posts === 0 && goals.comments === 0 && goals.likes === 0)) return true;
    return (activity.posts >= goals.posts) && (activity.comments >= goals.comments) && (activity.likes >= goals.likes);
  }

  function updateStreakAndRender(activity, goals) {
    if (!goals || (goals.posts === 0 && goals.comments === 0 && goals.likes === 0)) {
      if (streakFires) streakFires.innerHTML = '🔥🔥🔥🔥🔥';
      if (streakLabel) streakLabel.textContent = 'Set goals above to start your streak.';
      if (detentionBanner) detentionBanner.style.display = 'none';
      return;
    }
    var todayStr = getStorageKeyForDate(new Date()).replace('skoolPulse_personal_', '');
    var met = goalsMet(activity, goals);
    loadStreak(function (s) {
      var newStreak = s.currentStreak;
      var newMissed = s.consecutiveDaysMissed;
      var newDetention = s.detention;
      if (goals.period === 'daily') {
        if (met) {
          if (s.lastGoalMetDate === todayStr) {
            newMissed = 0;
          } else {
            var yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            var yesterdayStr = getStorageKeyForDate(yesterday).replace('skoolPulse_personal_', '');
            if (s.lastGoalMetDate === yesterdayStr) {
              newStreak = Math.min(STREAK_TARGET, (s.currentStreak || 0) + 1);
            } else {
              newStreak = 1;
            }
            newMissed = 0;
            newDetention = false;
          }
          saveStreak({
            currentStreak: newStreak,
            lastGoalMetDate: todayStr,
            consecutiveDaysMissed: 0,
            lastCheckedDate: todayStr,
            detention: false
          });
        } else {
          var lastChecked = s.lastCheckedDate || '';
          if (lastChecked !== todayStr) {
            newMissed = (s.consecutiveDaysMissed || 0) + 1;
            if (newMissed >= DETENTION_DAYS) newDetention = true;
            saveStreak({
              currentStreak: 0,
              lastGoalMetDate: s.lastGoalMetDate,
              consecutiveDaysMissed: newMissed,
              lastCheckedDate: todayStr,
              detention: newDetention
            });
          }
        }
      }
      var streak = newDetention ? 0 : newStreak;
      var labels = ['Frozen', 'Warming up', 'Getting hot', 'On fire', 'Unstoppable'];
      if (streakFires) {
        var fires = '';
        for (var i = 0; i < STREAK_TARGET; i++) {
          fires += i < streak ? '🔥' : '❄️';
        }
        streakFires.textContent = fires;
      }
      if (streakLabel) {
        if (newDetention) streakLabel.textContent = 'Detention: complete today\'s goals to unfreeze.';
        else if (streak === 0) streakLabel.textContent = 'Hit your daily goals ' + STREAK_TARGET + ' days in a row to max your streak.';
        else streakLabel.textContent = labels[Math.min(streak - 1, 4)] + ' — ' + streak + '/' + STREAK_TARGET + ' days.';
      }
      if (detentionBanner) detentionBanner.style.display = newDetention ? 'block' : 'none';
    });
    if (goals.period !== 'daily') {
      loadStreak(function (s) {
        var streak = s.detention ? 0 : (s.currentStreak || 0);
        if (streakFires) {
          var fires = '';
          for (var i = 0; i < STREAK_TARGET; i++) fires += i < streak ? '🔥' : '❄️';
          streakFires.textContent = fires;
        }
        if (streakLabel) streakLabel.textContent = 'Streak is based on daily goals. Switch to Daily to build it.';
        if (detentionBanner) detentionBanner.style.display = s.detention ? 'block' : 'none';
      });
    }
  }

  function fireConfetti() {
    if (!confettiContainer) return;
    confettiContainer.innerHTML = '';
    var colors = ['#f97316', '#22c55e', '#eab308', '#3b82f6', '#a855f7'];
    for (var i = 0; i < 45; i++) {
      var p = document.createElement('div');
      p.style.cssText = 'position:absolute;width:8px;height:8px;background:' + colors[i % colors.length] + ';left:' + (Math.random() * 100) + '%;top:10px;border-radius:2px;animation:confetti-fall 1.5s ease-out forwards;pointer-events:none;';
      p.style.animationDelay = (Math.random() * 0.4) + 's';
      confettiContainer.appendChild(p);
    }
    var style = document.createElement('style');
    style.textContent = '@keyframes confetti-fall { to { transform: translateY(400px) rotate(720deg); opacity: 0; } }';
    document.head.appendChild(style);
    setTimeout(function () {
      confettiContainer.innerHTML = '';
      if (style.parentNode) style.parentNode.removeChild(style);
    }, 2000);
  }

  function renderGoalsProgress(activity, goals) {
    if (!goalsProgress) return;
    if (!goals || (goals.posts === 0 && goals.comments === 0 && goals.likes === 0)) {
      goalsProgress.className = '';
      goalsProgress.innerHTML = '<p class="hint" style="margin:0;">Set your goal numbers above.</p>';
      lastGoalsMet = { posts: false, comments: false, likes: false };
      return;
    }
    var p = goals.posts > 0 && activity.posts >= goals.posts;
    var c = goals.comments > 0 && activity.comments >= goals.comments;
    var l = goals.likes > 0 && activity.likes >= goals.likes;
    if (p && !lastGoalsMet.posts) { fireConfetti(); lastGoalsMet.posts = true; }
    if (c && !lastGoalsMet.comments) { fireConfetti(); lastGoalsMet.comments = true; }
    if (l && !lastGoalsMet.likes) { fireConfetti(); lastGoalsMet.likes = true; }
    if (!p) lastGoalsMet.posts = false;
    if (!c) lastGoalsMet.comments = false;
    if (!l) lastGoalsMet.likes = false;
    goalsProgress.innerHTML =
      '<div class="label">Posts</div><div class="value ' + (p ? 'done' : 'pending') + '">' + activity.posts + ' / ' + goals.posts + '</div><div class="tick">' + (p ? '✓' : '') + '</div>' +
      '<div class="label">Comments</div><div class="value ' + (c ? 'done' : 'pending') + '">' + activity.comments + ' / ' + goals.comments + '</div><div class="tick">' + (c ? '✓' : '') + '</div>' +
      '<div class="label">Likes</div><div class="value ' + (l ? 'done' : 'pending') + '">' + activity.likes + ' / ' + goals.likes + '</div><div class="tick">' + (l ? '✓' : '') + '</div>';
    goalsProgress.className = 'goals-progress-grid';
  }

  function refreshGoalsAndStreak(todayStats) {
    loadGoals(function (goals) {
      if (goalsPeriod) goalsPeriod.value = goals.period || 'daily';
      if (goalPosts) goalPosts.value = goals.posts || '';
      if (goalComments) goalComments.value = goals.comments || '';
      if (goalLikes) goalLikes.value = goals.likes || '';
      var period = goals.period || 'daily';
      if (period === 'daily' && todayStats) {
        var activity = { posts: todayStats.posts || 0, comments: todayStats.comments || 0, likes: todayStats.likes || 0 };
        renderGoalsProgress(activity, goals);
        updateStreakAndRender(activity, goals);
      } else {
        getActivityForPeriod(period, function (activity) {
          renderGoalsProgress(activity, goals);
          updateStreakAndRender(activity, goals);
        });
      }
    });
  }

  function updateCurrentTabSync() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs[0];
      if (!tab || !tab.id || !tab.url || tab.url.indexOf('skool.com') === -1) {
        renderYourActivityFromStorage();
        return;
      }
      chrome.tabs.sendMessage(tab.id, { action: 'getStats' }, function (response) {
        if (chrome.runtime.lastError || !response) {
          renderYourActivityFromStorage();
          return;
        }
        var stats = {
          posts: response.posts || 0,
          comments: response.comments || 0,
          likes: response.likes || 0,
          interactions: response.interactions || ((response.likes || 0) + (response.comments || 0)),
        };
        showSyncSection(response.groupSlug || '', stats);
        if (syncBtn) {
          syncBtn.dataset.posts = String(stats.posts);
          syncBtn.dataset.comments = String(stats.comments);
          syncBtn.dataset.likes = String(stats.likes);
          syncBtn.dataset.interactions = String(stats.interactions);
          syncBtn.dataset.slug = response.groupSlug || '';
        }
      });
    });
  }

  function renderYourActivityFromStorage() {
    var key = getTodayStorageKey();
    chrome.storage.local.get([key], function (items) {
      var stored = items[key];
      var stats = {
        posts: (stored && stored.posts) || 0,
        comments: (stored && stored.comments) || 0,
        likes: (stored && stored.likes) || 0,
        interactions: (stored && stored.interactions) || ((stored && (stored.likes || stored.comments)) ? (stored.likes || 0) + (stored.comments || 0) : 0),
      };
      showSyncSection('', stats);
      if (syncBtn) {
        syncBtn.dataset.posts = String(stats.posts);
        syncBtn.dataset.comments = String(stats.comments);
        syncBtn.dataset.likes = String(stats.likes);
        syncBtn.dataset.interactions = String(stats.interactions);
        syncBtn.dataset.slug = '';
      }
      refreshGoalsAndStreak(stats);
    });
  }

  if (syncBtn) {
    syncBtn.addEventListener('click', function () {
      var baseUrl = syncBtn.getAttribute('data-baseurl') || '';
      var token = syncBtn.getAttribute('data-token') || '';
      if (!baseUrl || !token) {
        syncBtn.textContent = 'Set Pulse URL & token in options';
        return;
      }
      syncBtn.textContent = 'Sending…';
      syncBtn.disabled = true;
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tab = tabs[0];
        if (!tab || !tab.id) {
          syncBtn.textContent = 'Open a Skool group tab first';
          syncBtn.disabled = false;
          return;
        }
        chrome.tabs.sendMessage(tab.id, { action: 'getStats' }, function (response) {
          if (chrome.runtime.lastError || !response) {
            syncBtn.textContent = 'Open a Skool group page in this tab';
            syncBtn.disabled = false;
            return;
          }
          var slug = response.groupSlug || '';
          var posts = parseInt(response.posts || 0, 10);
          var comments = parseInt(response.comments || 0, 10);
          var likes = parseInt(response.likes || 0, 10);
          var interactions = parseInt(response.interactions || 0, 10);
          fetch(baseUrl.replace(/\/$/, '') + '/api/extension/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ groupSlug: slug || undefined, posts, comments, likes: likes || undefined, interactions: interactions || undefined }),
          })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              syncBtn.textContent = data.ok ? 'Saved!' : (data.error || 'Failed');
              if (data.ok) {
                updateCurrentTabSync();
                if (typeof SkoolPulse !== 'undefined' && SkoolPulse.MotivationEngine && SkoolPulse.MotivationEngine.recordActivity) {
                  SkoolPulse.MotivationEngine.recordActivity({ type: 'sync', at: Date.now() });
                }
                refreshMotivationUI();
                setTimeout(function () { syncBtn.textContent = 'Sync to Pulse'; syncBtn.disabled = false; }, 2000);
              } else {
                syncBtn.disabled = false;
              }
            })
            .catch(function () { syncBtn.textContent = 'Error'; syncBtn.disabled = false; });
        });
      });
    });
  }

  function onGoalsChange() {
    var period = (goalsPeriod && goalsPeriod.value) || 'daily';
    var posts = parseInt(goalPosts && goalPosts.value, 10) || 0;
    var comments = parseInt(goalComments && goalComments.value, 10) || 0;
    var likes = parseInt(goalLikes && goalLikes.value, 10) || 0;
    saveGoals({ period: period, posts: posts, comments: comments, likes: likes });
    refreshGoalsAndStreak();
  }
  if (goalsPeriod) goalsPeriod.addEventListener('change', onGoalsChange);
  if (goalPosts) goalPosts.addEventListener('input', onGoalsChange);
  if (goalComments) goalComments.addEventListener('input', onGoalsChange);
  if (goalLikes) goalLikes.addEventListener('input', onGoalsChange);

  chrome.storage.local.get(['pulseBaseUrl', 'pulseToken'], function (items) {
    var baseUrl = (items.pulseBaseUrl || '').trim();
    var token = (items.pulseToken || '').trim();
    if (syncBtn) {
      syncBtn.setAttribute('data-baseurl', baseUrl);
      syncBtn.setAttribute('data-token', token);
    }
    if (dashboardLink) {
      dashboardLink.href = baseUrl ? (baseUrl.replace(/\/$/, '') + '/dashboard/today') : 'https://pulsewav.co/dashboard/today';
    }
    loadGoals(function (g) {
      if (goalsPeriod) goalsPeriod.value = g.period || 'daily';
      if (goalPosts) goalPosts.value = g.posts || '';
      if (goalComments) goalComments.value = g.comments || '';
      if (goalLikes) goalLikes.value = g.likes || '';
    });
    updateCurrentTabSync();
    refreshGoalsAndStreak();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      updateCurrentTabSync();
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  var autoRefreshInterval = null;
  function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshInterval = setInterval(function () {
      updateCurrentTabSync();
    }, 2000);
  }
  function stopAutoRefresh() {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
  }

  if (document.visibilityState === 'visible') {
    startAutoRefresh();
  }

  refreshMotivationUI();
})();
