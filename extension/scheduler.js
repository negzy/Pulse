(function () {
  'use strict';

  var communitySelect = document.getElementById('communitySelect');
  var skoolGroupSlug = document.getElementById('skoolGroupSlug');
  var detectGroupBtn = document.getElementById('detectGroupBtn');
  var scanGroupsBtn = document.getElementById('scanGroupsBtn');
  var modePulse = document.getElementById('modePulse');
  var modeSkool = document.getElementById('modeSkool');
  var pulseCommunitySection = document.getElementById('pulseCommunitySection');
  var skoolGroupSection = document.getElementById('skoolGroupSection');
  
  var discoveredGroups = [];
  var postTitle = document.getElementById('postTitle');
  var postBody = document.getElementById('postBody');
  var scheduledAt = document.getElementById('scheduledAt');
  var addBtn = document.getElementById('addBtn');
  var suggestTimeBtn = document.getElementById('suggestTimeBtn');
  var scheduleErr = document.getElementById('scheduleErr');
  var queueByCommunity = document.getElementById('queueByCommunity');
  var globalList = document.getElementById('globalList');
  var schedulerPaused = document.getElementById('schedulerPaused');

  if (modePulse && modeSkool) {
    modePulse.addEventListener('change', function () {
      if (modePulse.checked) {
        pulseCommunitySection.style.display = 'block';
        skoolGroupSection.style.display = 'none';
      }
    });
    modeSkool.addEventListener('change', function () {
      if (modeSkool.checked) {
        pulseCommunitySection.style.display = 'none';
        skoolGroupSection.style.display = 'block';
      }
    });
  }

  if (scanGroupsBtn) {
    scanGroupsBtn.addEventListener('click', function () {
      scanGroupsBtn.disabled = true;
      scanGroupsBtn.textContent = 'Scanning...';
      showErr('');
      chrome.tabs.create({ url: 'https://www.skool.com/settings?t=communities' }, function (tab) {
        function scanWhenReady() {
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              setTimeout(function () {
                function scrollAndScan() {
                  chrome.tabs.sendMessage(tab.id, { action: 'scrollAndScan' }, function (response) {
                    if (chrome.runtime.lastError) {
                      setTimeout(scrollAndScan, 1000);
                      return;
                    }
                    if (response && response.done) {
                      chrome.tabs.sendMessage(tab.id, { action: 'scanGroups' }, function (response) {
                        if (chrome.runtime.lastError || !response || !response.groups) {
                          showErr('Could not scan groups. Make sure you\'re logged into Skool.');
                          scanGroupsBtn.disabled = false;
                          scanGroupsBtn.textContent = '🔍 Scan my Skool groups';
                          chrome.tabs.remove(tab.id);
                          return;
                        }
                        var newGroups = response.groups || [];
                        var merged = {};
                        discoveredGroups.forEach(function (g) { merged[g.slug] = g; });
                        newGroups.forEach(function (g) {
                          if (!merged[g.slug]) {
                            merged[g.slug] = g;
                            discoveredGroups.push(g);
                          }
                        });
                        saveDiscoveredGroups();
                        updateSkoolGroupDropdown();
                        showErr('Found ' + newGroups.length + ' groups! They\'re now available in the dropdown.');
                        scanGroupsBtn.disabled = false;
                        scanGroupsBtn.textContent = '🔍 Scan my Skool groups';
                        chrome.tabs.remove(tab.id);
                      });
                    } else {
                      setTimeout(scrollAndScan, 500);
                    }
                  });
                }
                scrollAndScan();
              }, 3000);
            }
          });
        }
        scanWhenReady();
      });
    });
  }

  if (detectGroupBtn) {
    detectGroupBtn.addEventListener('click', function () {
      chrome.tabs.query({ url: ['https://www.skool.com/*', 'https://skool.com/*'] }, function (tabs) {
        if (!tabs || tabs.length === 0) {
          showErr('No Skool tabs found. Open a Skool group page first.');
          return;
        }
        var tab = tabs[0];
        chrome.tabs.sendMessage(tab.id, { action: 'getStats' }, function (response) {
          if (chrome.runtime.lastError || !response || !response.groupSlug) {
            showErr('Could not detect group. Make sure you\'re on a Skool group page.');
            return;
          }
          if (skoolGroupSlug) {
            skoolGroupSlug.value = response.groupSlug;
            showErr('');
          }
        });
      });
    });
  }

  var communities = [];
  var baseUrl = '';
  var token = '';

  function showErr(msg) {
    scheduleErr.textContent = msg || '';
    scheduleErr.style.display = msg ? 'block' : 'none';
  }

  function loadConfig(cb) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['pulseBaseUrl', 'pulseToken'], function (items) {
        baseUrl = (items.pulseBaseUrl || '').replace(/\/$/, '');
        token = items.pulseToken || '';
        cb();
      });
    } else cb();
  }

  function loadDiscoveredGroups() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['skoolPulse_discoveredGroups'], function (items) {
        discoveredGroups = items.skoolPulse_discoveredGroups || [];
        updateSkoolGroupDropdown();
      });
    }
  }

  function saveDiscoveredGroups() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ skoolPulse_discoveredGroups: discoveredGroups });
    }
  }

  function updateSkoolGroupDropdown() {
    if (!skoolGroupSlug) return;
    if (discoveredGroups.length === 0) {
      skoolGroupSlug.placeholder = 'e.g. credit-hub, my-group (or click Scan above)';
      return;
    }
    var datalist = document.getElementById('skoolGroupsList');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'skoolGroupsList';
      skoolGroupSlug.setAttribute('list', 'skoolGroupsList');
      skoolGroupSlug.parentNode.appendChild(datalist);
    }
    datalist.innerHTML = discoveredGroups.map(function (g) {
      return '<option value="' + escapeHtml(g.slug) + '">' + escapeHtml(g.name || g.slug) + '</option>';
    }).join('');
    skoolGroupSlug.placeholder = 'Start typing or select from ' + discoveredGroups.length + ' detected groups';
  }

  function loadCommunities(cb) {
    if (!baseUrl || !token) {
      communitySelect.innerHTML = '<option value="">— Set Pulse URL & token in Options —</option>';
      showErr('Set your Pulse dashboard URL and extension token in extension Options first.');
      loadDiscoveredGroups();
      return cb();
    }
    fetch(baseUrl + '/api/extension/communities', {
      headers: { 'Authorization': 'Bearer ' + token },
    })
      .then(function (r) {
        if (!r.ok) {
          return r.json().then(function (data) {
            throw new Error(data.error || 'Failed to load communities');
          });
        }
        return r.json();
      })
      .then(function (data) {
        communities = (data && data.communities) || [];
        if (communities.length === 0) {
          communitySelect.innerHTML = '<option value="">— No Pulse communities —</option>';
          if (discoveredGroups.length === 0) {
            showErr('No Pulse communities found. Add communities in your Pulse dashboard, or scan your Skool groups.');
          } else {
            showErr('');
          }
        } else {
          communitySelect.innerHTML = '<option value="">— Select community —</option>' +
            communities.map(function (c) {
              return '<option value="' + escapeHtml(c.id) + '" data-name="' + escapeHtml(c.name) + '" data-slug="' + escapeHtml(c.skoolGroupSlug || c.skoolUrl || '') + '">' + escapeHtml(c.name) + '</option>';
            }).join('');
          showErr('');
        }
        loadDiscoveredGroups();
        cb();
      })
      .catch(function (e) {
        communitySelect.innerHTML = '<option value="">— Failed to load —</option>';
        showErr('Failed to load Pulse communities: ' + (e.message || 'Check your Pulse URL and token in Options.') + ' You can still use Skool groups.');
        loadDiscoveredGroups();
        cb();
      });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /** Parse datetime-local value as local time and return ISO string (UTC) for storage. */
  function localInputToISO(localValue) {
    if (!localValue) return '';
    var m = localValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
      var d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), parseInt(m[4], 10), parseInt(m[5], 10), 0, 0);
      return d.toISOString();
    }
    return new Date(localValue).toISOString();
  }

  /** Format stored ISO string for datetime-local input (local time). */
  function isoToLocalInput(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var h = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    return y + '-' + mo + '-' + day + 'T' + h + ':' + min;
  }

  /** Format stored ISO for display (local time string). */
  function formatLocalTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  }

  function render() {
    if (typeof SkoolPulse === 'undefined' || !SkoolPulse.SchedulerStorage) return;
    SkoolPulse.SchedulerStorage.getAll(function (err, posts) {
      if (err || !posts) posts = [];
      var active = posts.filter(function (p) {
        return ['QUEUED', 'SCHEDULED', 'PAUSED'].indexOf(p.status) !== -1;
      });

      var byCommunity = {};
      active.forEach(function (p) {
        var k = p.communityId || 'unknown';
        if (!byCommunity[k]) byCommunity[k] = [];
        byCommunity[k].push(p);
      });
      queueByCommunity.innerHTML = Object.keys(byCommunity).length === 0
        ? '<p style="color:#737373;font-size:13px;">No queued posts.</p>'
        : Object.keys(byCommunity).map(function (cid) {
            var list = byCommunity[cid];
            var name = (list[0] && list[0].communityName) || cid;
            return '<div style="margin-bottom:12px;"><strong style="font-size:13px;">' + escapeHtml(name) + '</strong><ul>' +
              list.map(function (p) {
                return '<li>' + escapeHtml((p.title || p.content || '').slice(0, 50)) + (p.content && p.content.length > 50 ? '…' : '') +
                  '<span class="meta">' + formatLocalTime(p.scheduledAt) + ' · ' + p.status + '</span>' +
                  ' <button type="button" class="btn btn-secondary" style="padding:4px 8px;font-size:12px;" data-edit="' + p.id + '">Edit</button>' +
                  ' <button type="button" class="btn btn-danger" style="padding:4px 8px;font-size:12px;" data-delete="' + p.id + '">Delete</button>' +
                  (p.status === 'FAILED' ? ' <button type="button" class="btn" style="padding:4px 8px;font-size:12px;" data-retry="' + p.id + '">Retry now</button>' : '') +
                  '</li>';
              }).join('') + '</ul></div>';
          }).join('');

      var byDay = {};
      active.forEach(function (p) {
        var d = (p.scheduledAt || '').slice(0, 10);
        if (!byDay[d]) byDay[d] = [];
        byDay[d].push(p);
      });
      var days = Object.keys(byDay).sort();
      globalList.innerHTML = days.length === 0
        ? '<p style="color:#737373;font-size:13px;">No scheduled posts.</p>'
        : days.map(function (day) {
            return '<div style="margin-bottom:12px;"><strong style="font-size:13px;">' + day + '</strong><ul>' +
              byDay[day].map(function (p) {
                return '<li><span class="status ' + p.status + '">' + p.status + '</span> ' + formatLocalTime(p.scheduledAt) + ' — ' + escapeHtml((p.title || p.content || '').slice(0, 40)) + ' … ' + escapeHtml(p.communityName || '') + '</li>';
              }).join('') + '</ul></div>';
          }).join('');

      queueByCommunity.querySelectorAll('[data-edit]').forEach(function (el) {
        el.addEventListener('click', function () {
          var id = el.getAttribute('data-edit');
          SkoolPulse.SchedulerStorage.getById(id, function (e, p) {
            if (!p) return;
            communitySelect.value = p.communityId;
            postTitle.value = p.title || '';
            postBody.value = p.content || '';
            scheduledAt.value = isoToLocalInput(p.scheduledAt);
            var gifEl = document.getElementById('postGifUrl');
            if (gifEl) gifEl.value = p.gifUrl || '';
            addBtn.setAttribute('data-editing', id);
          });
        });
      });
      queueByCommunity.querySelectorAll('[data-delete]').forEach(function (el) {
        el.addEventListener('click', function () {
          var id = el.getAttribute('data-delete');
          if (!confirm('Delete this scheduled post?')) return;
          SkoolPulse.SchedulerStorage.remove(id, function () { render(); });
        });
      });
      queueByCommunity.querySelectorAll('[data-retry]').forEach(function (el) {
        el.addEventListener('click', function () {
          var id = el.getAttribute('data-retry');
          chrome.runtime.sendMessage({ action: 'runScheduledPublish', postId: id }, function (r) {
            render();
          });
        });
      });
    });
  }

  var postNowBtn = document.getElementById('postNowBtn');
  if (postNowBtn) {
    postNowBtn.addEventListener('click', function () {
      showErr('');
      var useSkoolMode = modeSkool && modeSkool.checked;
      var groupSlug = '';
      if (useSkoolMode) {
        groupSlug = (skoolGroupSlug && skoolGroupSlug.value || '').trim();
        if (!groupSlug) { showErr('Enter a Skool group slug for Post now.'); return; }
      } else {
        var opt = communitySelect.options[communitySelect.selectedIndex];
        if (!opt || !opt.value) { showErr('Select a community or use Skool group mode for Post now.'); return; }
        groupSlug = opt.getAttribute('data-slug') || '';
        if (!groupSlug) { showErr('This community has no group slug. Use "Skool group" and enter the slug (e.g. credit-hub).'); return; }
      }
      var content = (postBody.value || '').trim();
      if (!content) { showErr('Body is required.'); return; }
      var title = (postTitle.value || '').trim();
      var gifUrl = (document.getElementById('postGifUrl') && document.getElementById('postGifUrl').value) ? document.getElementById('postGifUrl').value.trim() : null;
      var fullContent = content;
      if (gifUrl) {
        if (gifUrl.indexOf('giphy.com') !== -1) {
          var gifIdMatch = gifUrl.match(/giphy\.com\/gifs\/[^\/]+\-([a-zA-Z0-9]+)/) || gifUrl.match(/giphy\.com\/gifs\/([a-zA-Z0-9]+)/);
          fullContent = content + '\n\n' + (gifIdMatch ? 'https://media.giphy.com/media/' + gifIdMatch[1] + '/giphy.gif' : gifUrl);
        } else fullContent = content + '\n\n' + gifUrl;
      }
      postNowBtn.disabled = true;
      postNowBtn.textContent = 'Opening Skool…';
      function doPostNow() {
        chrome.runtime.sendMessage({
          action: 'postNow',
          groupSlug: groupSlug,
          title: title,
          content: content,
          gifUrl: gifUrl || null
        }, function (response) {
          postNowBtn.disabled = false;
          postNowBtn.textContent = 'Post now';
          if (response && response.error) showErr(response.error);
          else showErr('');
        });
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullContent).then(function () { doPostNow(); }, function () { doPostNow(); });
      } else {
        doPostNow();
      }
    });
  }

  addBtn.addEventListener('click', function () {
    showErr('');
    var editingId = addBtn.getAttribute('data-editing');
    var useSkoolMode = modeSkool && modeSkool.checked;
    var communityId = '';
    var communityName = '';
    var groupSlug = '';
    
    if (useSkoolMode) {
      groupSlug = (skoolGroupSlug && skoolGroupSlug.value || '').trim();
      if (!groupSlug) { showErr('Enter a Skool group slug (e.g. credit-hub).'); return; }
      communityName = groupSlug; // Use slug as name for display
      communityId = 'skool_' + groupSlug; // Generate a consistent ID for Skool groups
    } else {
      communityId = communitySelect.value;
      var opt = communitySelect.options[communitySelect.selectedIndex];
      communityName = opt ? opt.getAttribute('data-name') || '' : '';
      groupSlug = opt ? opt.getAttribute('data-slug') || '' : '';
      if (!communityId) { showErr('Select a community or switch to "Any Skool group" mode.'); return; }
    }
    
    var title = (postTitle.value || '').trim();
    var content = (postBody.value || '').trim();
    var at = scheduledAt.value;
    if (!content) { showErr('Body is required.'); return; }
    if (!at) { showErr('Pick date and time.'); return; }

    var scheduledAtISO = localInputToISO(at);
    var newPost = { communityId: communityId, communityName: communityName, groupSlug: groupSlug || null, title: title, content: content, scheduledAt: scheduledAtISO, status: 'SCHEDULED', gifUrl: (document.getElementById('postGifUrl') && document.getElementById('postGifUrl').value) ? document.getElementById('postGifUrl').value.trim() : null };
    if (editingId) newPost.id = editingId;

    SkoolPulse.SchedulerStorage.getAll(function (err, existing) {
      if (err) existing = [];
      var active = existing.filter(function (p) { return ['QUEUED', 'SCHEDULED', 'PAUSED'].indexOf(p.status) !== -1 && p.id !== editingId; });
      var result = SkoolPulse.SchedulerService.validateScheduleConstraints(newPost, active);
      if (!result.ok) {
        showErr(result.errors[0] || 'Validation failed.');
        return;
      }
      if (editingId) {
        SkoolPulse.SchedulerStorage.update(editingId, { title: newPost.title, content: newPost.content, scheduledAt: newPost.scheduledAt, status: 'SCHEDULED', communityId: newPost.communityId, communityName: newPost.communityName, groupSlug: newPost.groupSlug, gifUrl: newPost.gifUrl }, function () {
          addBtn.removeAttribute('data-editing');
          postTitle.value = ''; postBody.value = ''; scheduledAt.value = '';
          var gifEl = document.getElementById('postGifUrl');
          if (gifEl) gifEl.value = '';
          render();
          if (chrome.runtime && chrome.runtime.sendMessage) chrome.runtime.sendMessage({ action: 'scheduleNextAlarm' });
        });
      } else {
        SkoolPulse.SchedulerStorage.create(newPost, function (err, doc) {
          if (err) { showErr(err.message); return; }
          postTitle.value = ''; postBody.value = ''; scheduledAt.value = '';
          var gifEl = document.getElementById('postGifUrl');
          if (gifEl) gifEl.value = '';
          render();
          if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'scheduleNextAlarm' });
          }
        });
      }
    });
  });

  schedulerPaused.addEventListener('change', function () {
    var paused = !!schedulerPaused.checked;
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ skoolPulse_schedulerPaused: paused }, function () {
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'scheduleNextAlarm' });
        }
      });
    }
  });

  loadConfig(function () {
    loadDiscoveredGroups();
    loadCommunities(function () {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['skoolPulse_schedulerPaused'], function (items) {
          schedulerPaused.checked = !!items.skoolPulse_schedulerPaused;
          render();
        });
      } else {
        render();
      }
    });
  });

  suggestTimeBtn.addEventListener('click', function () {
    var preferred = scheduledAt.value ? new Date(scheduledAt.value) : new Date();
    if (isNaN(preferred.getTime())) preferred = new Date();
    SkoolPulse.SchedulerStorage.getAll(function (err, posts) {
      if (err) posts = [];
      var active = posts.filter(function (p) { return ['QUEUED', 'SCHEDULED', 'PAUSED'].indexOf(p.status) !== -1; });
      var next = SkoolPulse.SchedulerService.computeNextAvailableSlot(preferred, active);
      scheduledAt.value = next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0') + '-' + String(next.getDate()).padStart(2, '0') + 'T' + String(next.getHours()).padStart(2, '0') + ':' + String(next.getMinutes()).padStart(2, '0');
    });
  });

})();
