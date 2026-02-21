(function () {
  'use strict';

  const SIDEBAR_ID = 'skool-pulse-sidebar';
  const TOGGLE_ID = 'skool-pulse-toggle';

  function getGroupSlug() {
    const path = window.location.pathname.replace(/^\/+/, '');
    const parts = path.split('/');
    if (parts[0] === '') return null;
    return parts[0];
  }

  function parseCount(raw) {
    if (!raw || typeof raw !== 'string') return 0;
    var s = raw.trim().toLowerCase();
    var mult = s.indexOf('k') !== -1 ? 1000 : 1;
    var num = parseFloat(s.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * mult);
  }

  function extractFromLabeledElements() {
    var out = { posts: 0, comments: 0, likes: 0, interactions: 0, members: 0 };
    var walk = function (el) {
      if (!el || el.nodeType !== 1) return;
      var text = (el.textContent || '').trim();
      if (text.length > 200) return; // Increased limit
      // Look for patterns like "5 posts", "posts: 5", "5", etc.
      var num = text.match(/^[\d,.\s]+[kK]?/);
      if (num) {
        var n = parseCount(num[0].replace(/,/g, ''));
        if (n > 0 && n < 1000000) {
          var lower = text.toLowerCase();
          if (/\bposts?\b/i.test(text)) out.posts = Math.max(out.posts, n);
          else if (/\bcomments?\b/i.test(text)) out.comments = Math.max(out.comments, n);
          else if (/\blikes?\b/i.test(text) || /\breactions?\b/i.test(text) || /\bheart/i.test(text) || /\bthumbs/i.test(text)) out.likes = Math.max(out.likes, n);
          else if (/\binteractions?\b/i.test(text)) out.interactions = Math.max(out.interactions, n);
          else if (/\bmembers?\b/i.test(text)) out.members = Math.max(out.members, n);
        }
      }
      // Also check aria-label and title attributes
      var ariaLabel = el.getAttribute('aria-label') || '';
      var title = el.getAttribute('title') || '';
      if (ariaLabel || title) {
        var combined = (ariaLabel + ' ' + title).toLowerCase();
        var numMatch = combined.match(/(\d+(?:[.,]\d+)?\s*[kK]?)/);
        if (numMatch) {
          var n = parseCount(numMatch[1]);
          if (n > 0 && n < 1000000) {
            if (/\bposts?\b/.test(combined)) out.posts = Math.max(out.posts, n);
            else if (/\bcomments?\b/.test(combined)) out.comments = Math.max(out.comments, n);
            else if (/\blikes?\b/.test(combined) || /\breactions?\b/.test(combined)) out.likes = Math.max(out.likes, n);
            else if (/\binteractions?\b/.test(combined)) out.interactions = Math.max(out.interactions, n);
            else if (/\bmembers?\b/.test(combined)) out.members = Math.max(out.members, n);
          }
        }
      }
      for (var i = 0; i < (el.children && el.children.length) || 0; i++) walk(el.children[i]);
    };
    try {
      // Look in common Skool UI areas
      var roots = document.querySelectorAll('[class*="stat"], [class*="Stat"], [class*="sidebar"], [class*="Sidebar"], [class*="overview"], [class*="Overview"], [class*="summary"], [class*="Summary"], [class*="metric"], [class*="Metric"], [data-testid], main, [role="main"], aside, header, [class*="header"], [class*="Header"]');
      for (var r = 0; r < roots.length; r++) walk(roots[r]);
      if (out.posts === 0 && out.comments === 0 && out.likes === 0) walk(document.body);
    } catch (e) {}
    return out;
  }

  function readActivityFromPage() {
    try {
      // Priority: Check Skool-specific elements first (most reliable)
      var likes = 0, comments = 0, posts = 0;
      
      // Skool-specific: LikesCount element (e.g. <div class="styled__LikesCount-sc-e4ns84-3">476</div>)
      try {
        var likesCountEls = document.querySelectorAll('[class*="LikesCount"], [class*="likesCount"]');
        for (var i = 0; i < likesCountEls.length; i++) {
          var text = (likesCountEls[i].textContent || '').trim();
          var n = parseCount(text);
          if (n > 0) likes = Math.max(likes, n);
        }
      } catch (e) {}
      
      // Skool-specific: CommentsCount element (e.g. <div class="styled__CommentsCount-sc-e4ns84-4">4.8k</div>)
      try {
        var commentsCountEls = document.querySelectorAll('[class*="CommentsCount"], [class*="commentsCount"]');
        for (var i = 0; i < commentsCountEls.length; i++) {
          var text = (commentsCountEls[i].textContent || '').trim();
          var n = parseCount(text);
          if (n > 0) comments = Math.max(comments, n);
        }
      } catch (e) {}
      
      // Fallback to general extraction if Skool-specific didn't find anything
      var fromEls = extractFromLabeledElements();
      var body = document.body ? document.body.innerText : '';
      if (likes === 0) likes = fromEls.likes;
      if (comments === 0) comments = fromEls.comments;
      if (posts === 0) posts = fromEls.posts;
      var interactions = fromEls.interactions;
      var members = fromEls.members;

      function allMatches(str, regex) {
        var m, out = [];
        while ((m = regex.exec(str)) !== null) { out.push(m); }
        return out;
      }
      function maxCount(matches, idx) {
        var best = 0;
        for (var i = 0; i < matches.length; i++) {
          var raw = matches[i][idx] || matches[i][1] || matches[i][2] || '';
          var n = parseCount(String(raw));
          if (n > best && n < 1000000) best = n;
        }
        return best;
      }

      // Try multiple strategies for each metric
      if (posts === 0) {
      var postMatches = allMatches(body, /(\d+(?:[.,]\d+)?\s*[kK]?)\s*posts?|posts?\s*[:\s]*(\d+(?:[.,]\d+)?\s*[kK]?)/gi);
      posts = maxCount(postMatches, 1);
    }
    if (comments === 0) {
      var commentMatches = allMatches(body, /(\d+(?:[.,]\d+)?\s*[kK]?)\s*comments?|comments?\s*[:\s]*(\d+(?:[.,]\d+)?\s*[kK]?)/gi);
      comments = maxCount(commentMatches, 1);
    }
    if (likes === 0) {
      var likeMatches = allMatches(body, /(\d+(?:[.,]\d+)?\s*[kK]?)\s*likes?|likes?\s*[:\s]*(\d+(?:[.,]\d+)?\s*[kK]?)|(\d+)\s*reactions?/gi);
      likes = maxCount(likeMatches, 1);
    }
      if (interactions === 0 && (likes > 0 || comments > 0)) interactions = likes + comments;
      if (interactions === 0) {
        var intMatches = allMatches(body, /(\d+(?:[.,]\d+)?\s*[kK]?)\s*interactions?/gi);
        interactions = maxCount(intMatches, 1);
      }
      if (members === 0) {
        var memberMatches = allMatches(body, /(\d+(?:[.,]\d+)?\s*[kK]?)\s*members?|members?\s*[:\s]*(\d+(?:[.,]\d+)?\s*[kK]?)/gi);
        members = maxCount(memberMatches, 1);
      }

      // Fallback: count actual DOM elements
      if (posts === 0) {
        var articles = document.querySelectorAll('article, [role="article"], [class*="post"], [class*="Post"], [data-testid*="post"], [data-testid*="Post"]');
        if (articles.length) posts = articles.length;
      }
      if (comments === 0) {
        var commentEls = document.querySelectorAll('[class*="comment"], [class*="Comment"], [data-testid*="comment"], [data-testid*="Comment"], [aria-label*="comment" i]');
        if (commentEls.length) comments = commentEls.length;
      }

      // Also count actual like/reaction buttons and sum their numbers (fallback)
      if (likes === 0) {
      var likeButtons = document.querySelectorAll('button[aria-label*="like" i], button[aria-label*="reaction" i], [class*="like" i], [class*="reaction" i], [data-testid*="like" i]');
      var totalLikes = 0;
      for (var i = 0; i < likeButtons.length; i++) {
        var btn = likeButtons[i];
        var btnText = (btn.textContent || '').trim();
        var btnNum = parseCount(btnText);
        if (btnNum > 0) totalLikes += btnNum;
        else {
          // Check parent/sibling for number
          var parent = btn.parentElement;
          if (parent) {
            var parentText = parent.textContent || '';
            var numMatch = parentText.match(/(\d+(?:[.,]\d+)?\s*[kK]?)/);
            if (numMatch) {
              var n = parseCount(numMatch[1]);
              if (n > 0) totalLikes = Math.max(totalLikes, n);
            }
          }
        }
      }
        if (totalLikes > 0) likes = totalLikes;
      }

      // Skool-specific: Look for post/article counts in common areas
      if (posts === 0) {
        // Try to find post count in header/sidebar/overview
        var postCountSelectors = [
          '[class*="PostCount"]',
          '[class*="postCount"]',
          '[class*="PostsCount"]',
          '[class*="postsCount"]'
        ];
        for (var s = 0; s < postCountSelectors.length; s++) {
          var els = document.querySelectorAll(postCountSelectors[s]);
          for (var i = 0; i < els.length; i++) {
            var text = (els[i].textContent || '').trim();
            var n = parseCount(text);
            if (n > 0) posts = Math.max(posts, n);
          }
        }
      }

      // If we still have 0, try counting visible posts/comments on the page
      if (posts === 0) {
        var visiblePosts = document.querySelectorAll('article:not([style*="display: none"]), [role="article"]:not([style*="display: none"])');
        if (visiblePosts.length > 0) posts = visiblePosts.length;
      }
      if (comments === 0) {
        var visibleComments = document.querySelectorAll('[class*="comment" i]:not([style*="display: none"]), [data-testid*="comment" i]:not([style*="display: none"])');
        if (visibleComments.length > 0) comments = visibleComments.length;
      }

      // Interactions = likes + comments (standard calculation)
      if (interactions === 0 && (likes > 0 || comments > 0)) {
        interactions = (likes || 0) + (comments || 0);
      }
      // If we still don't have interactions, try to find it explicitly
      if (interactions === 0) {
        var intMatches = allMatches(body, /(\d+(?:[.,]\d+)?\s*[kK]?)\s*interactions?/gi);
        interactions = maxCount(intMatches, 1);
      }
      // Final fallback: interactions = likes + comments
      if (interactions === 0 && (likes > 0 || comments > 0)) {
        interactions = (likes || 0) + (comments || 0);
      }

      return { posts: posts, comments: comments, likes: likes, interactions: interactions, members: members };
    } catch (e) {
      // Return zeros on any error
      return { posts: 0, comments: 0, likes: 0, interactions: 0, members: 0 };
    }
  }

  function createSidebar() {
    if (document.getElementById(TOGGLE_ID)) return;
    var btn = document.createElement('button');
    btn.id = TOGGLE_ID;
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open Skool Pulse');
    btn.textContent = 'Pulse';
    btn.className = 'skool-pulse-toggle-btn';
    btn.title = 'Open Pulse — today\'s engagement across all communities';
    btn.addEventListener('click', function () {
      chrome.runtime.sendMessage({ action: 'openSidePanel' }, function () {});
    });
    document.body.appendChild(btn);
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function scanAllGroups() {
    var groups = [];
    var links = document.querySelectorAll('a[href*="/"]');
    var seen = {};
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (!href) continue;
      var match = href.match(/skool\.com\/([^\/\?#]+)/i) || href.match(/^\/([^\/\?#]+)/);
      if (match && match[1]) {
        var slug = match[1].toLowerCase();
        if (slug && slug !== 'www' && slug !== 'skool' && slug !== 'login' && slug !== 'signup' && slug !== 'profile' && slug !== 'settings' && slug !== 'notifications' && slug !== 'messages' && slug.indexOf('@') === -1 && !seen[slug]) {
          seen[slug] = true;
          var name = links[i].textContent.trim() || slug;
          if (name.length > 0 && name.length < 100) {
            groups.push({ slug: slug, name: name });
          }
        }
      }
    }
    return groups;
  }

  // Track YOUR personal activity (likes, comments, posts YOU made)
  var personalActivity = { likes: 0, comments: 0, posts: 0, interactions: 0 };
  var personalActivityLoaded = false;
  var hasLocalUpdates = false;
  
  function getTodayKey() {
    var d = new Date();
    return 'skoolPulse_personal_' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  
  function loadPersonalActivity() {
    var key = getTodayKey();
    chrome.storage.local.get([key], function (items) {
      if (hasLocalUpdates) return;
      personalActivityLoaded = true;
      if (items[key] && typeof items[key] === 'object') {
        personalActivity = {
          likes: items[key].likes || 0,
          comments: items[key].comments || 0,
          posts: items[key].posts || 0,
          interactions: items[key].interactions || 0
        };
      } else {
        personalActivity = { likes: 0, comments: 0, posts: 0, interactions: 0 };
      }
    });
  }
  
  function savePersonalActivity() {
    personalActivity.interactions = (personalActivity.likes || 0) + (personalActivity.comments || 0);
    var key = getTodayKey();
    chrome.storage.local.set({ [key]: personalActivity });
  }
  
  function persistAndIncrement(field) {
    hasLocalUpdates = true;
    personalActivity[field] = (personalActivity[field] || 0) + 1;
    personalActivity.interactions = (personalActivity.likes || 0) + (personalActivity.comments || 0);
    var key = getTodayKey();
    chrome.storage.local.get([key], function (items) {
      var cur = (items[key] && typeof items[key] === 'object') ? items[key] : { likes: 0, comments: 0, posts: 0, interactions: 0 };
      cur.likes = Math.max(cur.likes || 0, personalActivity.likes || 0);
      cur.comments = Math.max(cur.comments || 0, personalActivity.comments || 0);
      cur.posts = Math.max(cur.posts || 0, personalActivity.posts || 0);
      cur.interactions = (cur.likes || 0) + (cur.comments || 0);
      chrome.storage.local.set({ [key]: cur });
    });
  }
  
  function persistAndDecrement(field) {
    hasLocalUpdates = true;
    personalActivity[field] = Math.max(0, (personalActivity[field] || 0) - 1);
    personalActivity.interactions = (personalActivity.likes || 0) + (personalActivity.comments || 0);
    var key = getTodayKey();
    chrome.storage.local.get([key], function (items) {
      var cur = (items[key] && typeof items[key] === 'object') ? items[key] : { likes: 0, comments: 0, posts: 0, interactions: 0 };
      cur[field] = Math.max(0, (cur[field] || 0) - 1);
      cur.likes = cur.likes || 0;
      cur.comments = cur.comments || 0;
      cur.posts = cur.posts || 0;
      cur.interactions = (cur.likes || 0) + (cur.comments || 0);
      chrome.storage.local.set({ [key]: cur });
    });
  }
  
  function trackLike() {
    persistAndIncrement('likes');
  }
  
  function trackUnlike() {
    persistAndDecrement('likes');
  }
  
  function trackComment() {
    persistAndIncrement('comments');
  }
  
  function trackCommentDecrement() {
    persistAndDecrement('comments');
  }
  
  function trackPost() {
    persistAndIncrement('posts');
  }
  
  // Track like clicks - count when user clicks like buttons (posts AND comments)
  // Same control clicked again = unlike (deduct). So like then unlike = net 1.
  function setupLikeTracking() {
    if (!document.body) return;
    
    var clickedLikeButtons = new WeakSet();
    var lastClickTime = {};
    var lastCommentLikeTime = new WeakMap();
    var COMMENT_LIKE_DEBOUNCE_MS = 1200;
    var likedControls = new WeakSet();
    
    function isCommentLikeElement(el) {
      if (!el || !el.classList) return false;
      var c = (el.className && el.className.baseClass !== undefined) ? el.className.baseClass : (el.className || '');
      return (typeof c === 'string' && (c.indexOf('VotesLabel') !== -1 || c.indexOf('votesLabel') !== -1 ||
          c.indexOf('VotesLabelWrapper') !== -1 || c.indexOf('votesLabelWrapper') !== -1 ||
          (c.indexOf('TooltipWrapper') !== -1 && el.querySelector && el.querySelector('[class*="VotesLabel"]'))));
    }
    
    function findCommentLikeInPath(path) {
      for (var i = 0; i < path.length; i++) {
        var el = path[i];
        if (!el || !el.nodeType || el.nodeType !== 1) continue;
        if (isCommentLikeElement(el)) return el;
        var votesLabel = el.closest && el.closest('[class*="VotesLabel"], [class*="VotesLabelWrapper"], [class*="TooltipWrapper"]');
        if (votesLabel) {
          if (votesLabel.querySelector && votesLabel.querySelector('[class*="VotesLabel"]')) return votesLabel;
          var c = (votesLabel.className && votesLabel.className.baseClass !== undefined) ? votesLabel.className.baseClass : (votesLabel.className || '');
          if (typeof c === 'string' && c.indexOf('VotesLabel') !== -1) return votesLabel;
        }
      }
      return null;
    }
    
    function handleLikeEvent(e) {
      var now = Date.now();
      // Use composedPath() so we see the real path through shadow DOM
      var path = e.composedPath && e.composedPath();
      var target = (path && path[0]) || e.target;
      
      // Strategy 1: Post likes - LikesRow
      var likeRow = target.closest ? target.closest('[class*="LikesRow"], [class*="likesRow"]') : null;
      if (likeRow) {
        var btn = likeRow.querySelector('button');
        if (btn) {
          var btnId = btn.getAttribute('data-pulse-id') || (btn.className + btn.textContent + likeRow.className);
          if (!lastClickTime[btnId] || (now - lastClickTime[btnId] > 1000)) {
            lastClickTime[btnId] = now;
            var alreadyLiked = likedControls.has(btn);
            if (alreadyLiked) {
              likedControls.delete(btn);
              setTimeout(function () { trackUnlike(); }, 300);
            } else {
              likedControls.add(btn);
              setTimeout(function () { trackLike(); }, 300);
            }
            return;
          }
        }
      }
      
      // Strategy 2: Comment likes - check full path (handles shadow DOM and any nested target)
      var commentLikeEl = findCommentLikeInPath(path || [target]);
      if (!commentLikeEl && target.closest) {
        var votesLabel = target.closest('[class*="VotesLabel"], [class*="votesLabel"]');
        var votesLabelWrapper = target.closest('[class*="VotesLabelWrapper"], [class*="votesLabelWrapper"]');
        var tooltipWrapper = target.closest('[class*="TooltipWrapper"]');
        commentLikeEl = votesLabel || votesLabelWrapper || (tooltipWrapper && tooltipWrapper.querySelector('[class*="VotesLabel"]') ? tooltipWrapper : null);
      }
      if (commentLikeEl) {
        var wrapper = commentLikeEl.closest ? commentLikeEl.closest('[class*="VotesLabelWrapper"], [class*="TooltipWrapper"]') : null;
        wrapper = wrapper || commentLikeEl;
        var last = lastCommentLikeTime.get(wrapper);
        if (!last || (now - last > COMMENT_LIKE_DEBOUNCE_MS)) {
          lastCommentLikeTime.set(wrapper, now);
          var alreadyLiked = likedControls.has(wrapper);
          if (alreadyLiked) {
            likedControls.delete(wrapper);
            setTimeout(function () { trackUnlike(); }, 300);
          } else {
            likedControls.add(wrapper);
            setTimeout(function () { trackLike(); }, 300);
          }
          return;
        }
      }
      
      // Strategy 3: Fallback - element that looks like a vote count (single number inside Vote* container)
      if (path && target.closest) {
        for (var j = 0; j < Math.min(path.length, 15); j++) {
          var node = path[j];
          if (!node || node.nodeType !== 1) continue;
          var text = (node.textContent || '').trim();
          if (/^\d+$/.test(text) && text.length <= 6) {
            var voteAncestor = node.closest('[class*="Vote"], [class*="vote"]');
            if (voteAncestor && voteAncestor !== node) {
              var last = lastCommentLikeTime.get(voteAncestor);
              if (!last || (now - last > COMMENT_LIKE_DEBOUNCE_MS)) {
                lastCommentLikeTime.set(voteAncestor, now);
                var alreadyLiked = likedControls.has(voteAncestor);
                if (alreadyLiked) {
                  likedControls.delete(voteAncestor);
                  setTimeout(function () { trackUnlike(); }, 300);
                } else {
                  likedControls.add(voteAncestor);
                  setTimeout(function () { trackLike(); }, 300);
                }
                return;
              }
            }
          }
        }
      }
      
      // Strategy 3b: Skool styled-class fragments (VotesLabel / TooltipWrapper hashes)
      if (path && target.closest) {
        for (var k = 0; k < path.length; k++) {
          var el = path[k];
          if (!el || !el.className || typeof el.className !== 'string') continue;
          if (el.className.indexOf('1e3d9on') !== -1 || el.className.indexOf('q6lkdr') !== -1) {
            var wrap = el.closest ? el.closest('[class*="VotesLabelWrapper"], [class*="TooltipWrapper"]') : null;
            wrap = wrap || el;
            var last = lastCommentLikeTime.get(wrap);
            if (!last || (now - last > COMMENT_LIKE_DEBOUNCE_MS)) {
              lastCommentLikeTime.set(wrap, now);
              var alreadyLiked = likedControls.has(wrap);
              if (alreadyLiked) {
                likedControls.delete(wrap);
                setTimeout(function () { trackUnlike(); }, 300);
              } else {
                likedControls.add(wrap);
                setTimeout(function () { trackLike(); }, 300);
              }
              return;
            }
          }
        }
      }
      
      // Strategy 4: Button near VotesLabel
      var btn = target.closest ? target.closest('button') : null;
      if (btn && !clickedLikeButtons.has(btn)) {
        var container = btn.parentElement || (btn.closest && btn.closest('[class*="comment"], [class*="Comment"], [class*="vote"], [class*="Vote"]'));
        if (container && container.querySelector) {
          var hasVotesLabel = container.querySelector('[class*="VotesLabel"], [class*="votesLabel"]');
          if (hasVotesLabel) {
            var btnId = btn.getAttribute('data-pulse-id') || (btn.className + btn.textContent);
            if (!lastClickTime[btnId] || (now - lastClickTime[btnId] > 1000)) {
              lastClickTime[btnId] = now;
              var alreadyLiked = likedControls.has(btn);
              if (alreadyLiked) {
                likedControls.delete(btn);
                setTimeout(function () { trackUnlike(); }, 300);
              } else {
                likedControls.add(btn);
                setTimeout(function () { trackLike(); }, 300);
              }
              return;
            }
          }
        }
        
        // Strategy 5: Button with like-related classes/icons
        var btnText = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
        var btnClass = (btn.className || '').toLowerCase();
        if ((btnClass.indexOf('like') !== -1 || btnText.indexOf('like') !== -1) && 
            btnText.indexOf('unlike') === -1 && btnText.indexOf('cancel') === -1) {
          var hasLikeIcon = btn.querySelector('svg') || btn.querySelector('[class*="like" i]');
          var inLikeContainer = btn.closest && btn.closest('[class*="like" i], [class*="reaction" i], [class*="LikesRow"], [class*="likesRow"]');
          var nearbyLikeCount = btn.closest && btn.closest('[class*="comment"], [class*="Comment"], article, [role="article"]');
          if (hasLikeIcon || inLikeContainer || nearbyLikeCount) {
            var btnId = btn.getAttribute('data-pulse-id') || (btn.className + btn.textContent);
            if (!lastClickTime[btnId] || (now - lastClickTime[btnId] > 1000)) {
              lastClickTime[btnId] = now;
              var alreadyLiked = likedControls.has(btn);
              if (alreadyLiked) {
                likedControls.delete(btn);
                setTimeout(function () { trackUnlike(); }, 300);
              } else {
                likedControls.add(btn);
                setTimeout(function () { trackLike(); }, 300);
              }
            }
          }
        }
      }
    }
    
    document.addEventListener('click', handleLikeEvent, true);
    document.addEventListener('mousedown', handleLikeEvent, true);
  }
  
  // Track comment posts - count when user posts a comment (including replies/nested)
  function setupCommentTracking() {
    if (!document.body) return;
    
    var postedComments = new WeakSet();
    var commentInputs = new WeakMap();
    
    // Watch for comment input fields being used
    function watchInput(input) {
      if (commentInputs.has(input)) return;
      commentInputs.set(input, true);
      
      // Watch for Enter+Ctrl/Cmd or Enter alone (common comment submit shortcuts)
      input.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) || 
            (e.key === 'Enter' && e.shiftKey === false && this.value && this.value.length > 10)) {
          var text = (this.value || this.textContent || '').trim();
          if (text.length > 3) {
            setTimeout(function () {
              trackComment();
            }, 500);
          }
        }
      });
    }
    
    // Periodically find new comment inputs (for nested/reply comments that appear dynamically)
    function findCommentInputs() {
      try {
        var inputs = document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]');
        for (var i = 0; i < inputs.length; i++) {
          var input = inputs[i];
          // Skip if already watching
          if (commentInputs.has(input)) continue;
          
          var placeholder = (input.getAttribute('placeholder') || input.getAttribute('data-placeholder') || '').toLowerCase();
          var parent = input.closest('[class*="comment"], [class*="Comment"], [class*="reply"], [class*="Reply"], [class*="Reply"], form, [class*="input"], [class*="Input"], [class*="thread"], [class*="Thread"]');
          var inCommentReplyThread = input.closest('[class*="comment"], [class*="Comment"], [class*="reply"], [class*="Reply"], [class*="thread"], [class*="Thread"]');
          
          var isCommentInput = false;
          if (inCommentReplyThread) isCommentInput = true;
          if (placeholder.indexOf('comment') !== -1 || placeholder.indexOf('reply') !== -1) isCommentInput = true;
          if (/post|talk about|create\s+post|write\s+(a\s+)?post/i.test(placeholder) && !inCommentReplyThread) isCommentInput = false;
          
          // Check if there are comment/reply indicators nearby (for nested comments)
          if (!isCommentInput) {
            var nearby = input.parentElement;
            var depth = 0;
            while (nearby && depth < 5) {
              var nearbyClass = (nearby.className || '').toLowerCase();
              var nearbyId = (nearby.id || '').toLowerCase();
              if (nearbyClass.indexOf('comment') !== -1 || nearbyClass.indexOf('reply') !== -1 || 
                  nearbyId.indexOf('comment') !== -1 || nearbyId.indexOf('reply') !== -1 ||
                  nearby.querySelector('[class*="comment"], [class*="Comment"], [class*="reply"], [class*="Reply"]')) {
                isCommentInput = true;
                break;
              }
              nearby = nearby.parentElement;
              depth++;
            }
          }
          
          if (isCommentInput) {
            watchInput(input);
          }
        }
      } catch (e) {}
    }
    
    // Watch for comment post button clicks (works for posts, comments, replies, nested at any depth)
    document.addEventListener('click', function (e) {
      var target = e.target;
      var btn = target.closest('button');
      if (btn && !postedComments.has(btn)) {
        var text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
        var btnClass = (btn.className || '').toLowerCase();
        
        // Strategy 1: Button with explicit post/comment/reply text
        var isExplicitCommentBtn = (text.indexOf('post') !== -1 || text.indexOf('comment') !== -1 || text.indexOf('reply') !== -1) && 
            text.indexOf('cancel') === -1 && text.indexOf('delete') === -1 && text.indexOf('edit') === -1;
        
        // Strategy 2: Button near a comment input with content (catches sub-replies with icon buttons)
        var isNearCommentInput = false;
        var container = btn.closest('form') || btn.closest('[class*="comment"], [class*="Comment"], [class*="reply"], [class*="Reply"], [class*="thread"], [class*="Thread"], [class*="BoxWrapper"]') || btn.parentElement;
        
        // Search for input in multiple places (for nested comments)
        var input = null;
        if (container) {
          // Look in container
          input = container.querySelector('textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]');
          
          // Try parent containers (for deeply nested replies)
          if (!input) {
            var searchContainer = container.parentElement;
            var searchDepth = 0;
            while (searchContainer && searchDepth < 8) {
              input = searchContainer.querySelector('textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]');
              if (input) break;
              searchContainer = searchContainer.parentElement;
              searchDepth++;
            }
          }
          
          // Check siblings (for some Skool layouts)
          if (!input && container.previousElementSibling) {
            input = container.previousElementSibling.querySelector('textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]');
          }
          if (!input && container.nextElementSibling) {
            input = container.nextElementSibling.querySelector('textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]');
          }
        }
        
        // Also search nearby in DOM (for nested comments that might be in different containers)
        if (!input) {
          var nearbyInputs = document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]');
          for (var i = 0; i < nearbyInputs.length; i++) {
            var inp = nearbyInputs[i];
            // Check if input is near the button (within reasonable DOM distance)
            var inpContainer = inp.closest('[class*="comment"], [class*="Comment"], [class*="reply"], [class*="Reply"], [class*="BoxWrapper"]');
            var btnContainer = btn.closest('[class*="comment"], [class*="Comment"], [class*="reply"], [class*="Reply"], [class*="BoxWrapper"]');
            if (inpContainer && btnContainer && (inpContainer === btnContainer || inpContainer.contains(btnContainer) || btnContainer.contains(inpContainer))) {
              var inpText = (inp.value || inp.textContent || '').trim();
              if (inpText.length > 3) {
                input = inp;
                isNearCommentInput = true;
                break;
              }
            }
            // Also check if button is within ~10 DOM nodes of input (for sub-replies)
            if (!input) {
              var distance = getDomDistance(btn, inp);
              if (distance < 10) {
                var inpText = (inp.value || inp.textContent || '').trim();
                if (inpText.length > 3) {
                  input = inp;
                  isNearCommentInput = true;
                  break;
                }
              }
            }
          }
        }
        
        // Check if button is in a comment/reply context (even without explicit text)
        var isInCommentContext = false;
        if (container) {
          var containerClass = (container.className || '').toLowerCase();
          var containerId = (container.id || '').toLowerCase();
          if (containerClass.indexOf('comment') !== -1 || containerClass.indexOf('reply') !== -1 || 
              containerId.indexOf('comment') !== -1 || containerId.indexOf('reply') !== -1) {
            isInCommentContext = true;
          }
        }
        
        // Posts: only the actual submit button (SubmitButtonWrapper), not category/filter "Post" buttons
        var isSubmitPostBtn = (btn.className || '').indexOf('SubmitButton') !== -1;
        var isMainComposer = !btn.closest('[class*="comment"], [class*="Comment"], [class*="reply"], [class*="Reply"], [class*="thread"], [class*="Thread"]');
        var placeholder = (input && (input.getAttribute('placeholder') || input.getAttribute('data-placeholder') || '')) || '';
        var isPostComposer = isMainComposer || /post|talk about|create|write\s+(a\s+)?post/i.test(placeholder);
        
        if (input) {
          var inputText = (input.value || input.textContent || '').trim();
          if (inputText.length > 3) {
            postedComments.add(btn);
            if (isSubmitPostBtn && isPostComposer && text.indexOf('post') !== -1) {
              setTimeout(function () { trackPost(); }, 500);
            } else if (isExplicitCommentBtn || (isNearCommentInput && isInCommentContext) || isInCommentContext) {
              setTimeout(function () { trackComment(); }, 500);
            }
          }
        }
      }
    }, true);
    
    // Detect delete/remove comment — deduct when user deletes a comment (menu item, button, or icon)
    var deletedCommentButtons = new WeakSet();
    var lastCommentDeleteTime = 0;
    document.addEventListener('click', function (e) {
      var path = e.composedPath && e.composedPath() || [];
      var target = e.target;
      for (var pi = 0; pi < path.length; pi++) {
        var el = path[pi];
        if (!el || el.nodeType !== 1) continue;
        var label = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase().trim();
        var isDelete = label.indexOf('delete') !== -1 || label.indexOf('remove') !== -1 || label.indexOf('trash') !== -1;
        if (!isDelete && el.parentElement) {
          var parentLabel = (el.parentElement.textContent || el.parentElement.getAttribute('aria-label') || '').toLowerCase().trim();
          if (parentLabel.indexOf('delete') !== -1 || parentLabel.indexOf('remove') !== -1) isDelete = true;
        }
        if (!isDelete) continue;
        var inComment = el.closest && el.closest('[class*="comment"], [class*="Comment"], [class*="reply"], [class*="Reply"], [class*="thread"], [class*="Thread"]');
        if (!inComment) continue;
        var clickable = el.closest && el.closest('button, [role="button"], [role="menuitem"], a');
        var key = clickable || el;
        if (deletedCommentButtons.has(key)) break;
        var now = Date.now();
        if (now - lastCommentDeleteTime < 1500) break;
        lastCommentDeleteTime = now;
        deletedCommentButtons.add(key);
        setTimeout(function () { trackCommentDecrement(); }, 300);
        break;
      }
    }, true);
    
    // Helper to estimate DOM distance between two elements
    function getDomDistance(el1, el2) {
      var path1 = [], path2 = [];
      var e = el1;
      while (e) { path1.push(e); e = e.parentElement; }
      e = el2;
      while (e) { path2.push(e); e = e.parentElement; }
      var common = 0;
      for (var i = 0; i < Math.min(path1.length, path2.length); i++) {
        if (path1[path1.length - 1 - i] === path2[path2.length - 1 - i]) common++;
        else break;
      }
      return (path1.length - common) + (path2.length - common);
    }
    
    // Also watch for form submissions (catches comments posted via form submit, including nested)
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (form.tagName === 'FORM') {
        var input = form.querySelector('textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]');
        if (input) {
          var inputText = (input.value || input.textContent || '').trim();
          if (inputText.length > 3) {
            // Check if it's a comment form (not a search or other form)
            var formClass = (form.className || '').toLowerCase();
            var formId = (form.id || '').toLowerCase();
            var formParent = form.closest('[class*="comment"], [class*="Comment"], [class*="reply"], [class*="Reply"], [class*="thread"], [class*="Thread"]');
            
            // Check if form is for comments/replies (including nested)
            var isCommentForm = false;
            if (formClass.indexOf('comment') !== -1 || formClass.indexOf('reply') !== -1) isCommentForm = true;
            if (formId.indexOf('comment') !== -1 || formId.indexOf('reply') !== -1) isCommentForm = true;
            if (formParent) isCommentForm = true;
            
            // Also check placeholder/content to be sure
            var placeholder = (input.getAttribute('placeholder') || input.getAttribute('data-placeholder') || '').toLowerCase();
            if (placeholder.indexOf('comment') !== -1 || placeholder.indexOf('reply') !== -1 || placeholder.indexOf('write') !== -1) {
              isCommentForm = true;
            }
            
            if (isCommentForm) {
              setTimeout(function () {
                trackComment();
              }, 500);
            }
          }
        }
      }
    }, true);
    
    // Find comment inputs periodically (for dynamically added reply boxes)
    setInterval(findCommentInputs, 1500);
    findCommentInputs();
  }
  
  // Load personal activity on page load
  loadPersonalActivity();
  
  // Setup tracking when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setupLikeTracking();
      setupCommentTracking();
    });
  } else {
    setupLikeTracking();
    setupCommentTracking();
  }

  // Watch for DOM changes to refresh stats (e.g. when user likes/comments)
  var observer = null;
  function setupObserver() {
    if (observer || !document.body) return;
    try {
      observer = new MutationObserver(function (mutations) {
        // Only update if relevant elements changed
        var shouldUpdate = false;
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === 'childList' || m.type === 'characterData') {
            shouldUpdate = true;
            break;
          }
          if (m.type === 'attributes' && m.target) {
            var el = m.target;
            var className = el.className || '';
            if (className.indexOf('LikesCount') !== -1 || className.indexOf('CommentsCount') !== -1 || 
                className.indexOf('likesCount') !== -1 || className.indexOf('commentsCount') !== -1) {
              shouldUpdate = true;
              break;
            }
          }
        }
        if (shouldUpdate) debouncedUpdateCache();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class']
      });
      // Initial cache update
      updateStatsCache();
    } catch (e) {
      // Observer setup failed, continue without it
    }
  }

  // Setup observer when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObserver);
  } else {
    setupObserver();
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.action === 'getStats') {
      var key = getTodayKey();
      var inMemory = personalActivity || { likes: 0, comments: 0, posts: 0, interactions: 0 };
      chrome.storage.local.get([key], function (items) {
        var stored = items[key];
        var posts = Math.max(inMemory.posts || 0, (stored && stored.posts) || 0);
        var comments = Math.max(inMemory.comments || 0, (stored && stored.comments) || 0);
        var likes = Math.max(inMemory.likes || 0, (stored && stored.likes) || 0);
        sendResponse({
          posts: posts,
          comments: comments,
          likes: likes,
          interactions: likes + comments,
          members: 0,
          groupSlug: getGroupSlug() || ''
        });
      });
      return true;
    }
    if (msg.action === 'scrollAndScan') {
      var scrollHeight = document.documentElement.scrollHeight;
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var clientHeight = window.innerHeight || document.documentElement.clientHeight;
      var atBottom = scrollTop + clientHeight >= scrollHeight - 100;
      if (!atBottom) {
        window.scrollBy(0, 500);
        sendResponse({ done: false });
      } else {
        setTimeout(function () {
          sendResponse({ done: true });
        }, 1000);
      }
      return true;
    }
    if (msg.action === 'scanGroups') {
      var groups = scanAllGroups();
      sendResponse({ groups: groups });
      return true;
    }
    if (msg.action === 'waitForComposer') {
      var check = setInterval(function () {
        var composer = document.querySelector('[contenteditable="true"], [contenteditable="plaintext-only"], .ProseMirror, textarea, [role="textbox"]');
        if (composer) {
          clearInterval(check);
          sendResponse({ ready: true });
        }
      }, 500);
      setTimeout(function () {
        clearInterval(check);
        sendResponse({ ready: false });
      }, 10000);
      return true;
    }
    if (msg.action === 'publishScheduledPost') {
      var responseSent = false;
      var respond = function (data) {
        if (!responseSent) {
          responseSent = true;
          sendResponse(data);
        }
      };
      
      try {
        var content = (msg.content || '').trim();
        var title = (msg.title || '').trim();
        var gifUrl = (msg.gifUrl || '').trim();
        if (gifUrl) {
          var imgUrl = gifUrl;
          if (gifUrl.indexOf('giphy.com') !== -1) {
            var gifIdMatch = gifUrl.match(/giphy\.com\/gifs\/[^\/]+\-([a-zA-Z0-9]+)/) || gifUrl.match(/giphy\.com\/gifs\/([a-zA-Z0-9]+)/);
            if (gifIdMatch) imgUrl = 'https://media.giphy.com/media/' + gifIdMatch[1] + '/giphy.gif';
          }
          content = content + (content ? '\n\n' : '') + imgUrl;
        }
        
        function findComposer() {
          var roots = [document.body];
          var dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"], .modal, [data-modal], [class*="modal"], [class*="Modal"]');
          for (var d = 0; d < dialogs.length; d++) roots.push(dialogs[d]);
          var selectors = [
            '[contenteditable="true"]',
            '[contenteditable="plaintext-only"]',
            '.ProseMirror',
            '[contenteditable]',
            '[data-lexical-editor]',
            'div[data-placeholder]',
            'textarea',
            '[role="textbox"]',
            'p[contenteditable]',
            '[contenteditable=""]'
          ];
          for (var r = 0; r < roots.length; r++) {
            var root = roots[r];
            for (var i = 0; i < selectors.length; i++) {
              var list = root.querySelectorAll(selectors[i]);
              for (var j = 0; j < list.length; j++) {
                var el = list[j];
                if (el && el.offsetParent !== null && (el.offsetWidth > 40 || el.offsetHeight > 24)) return el;
              }
            }
          }
          return null;
        }
        
        function findOpenComposerTrigger() {
          var all = document.querySelectorAll('button, a, [role="button"], div[tabindex], [class*="create"], [class*="post"]');
          var keywords = ['post', 'create', 'write', 'share', 'what\'s on', 'whats on', 'new post', 'add post', 'compose'];
          for (var i = 0; i < all.length; i++) {
            var el = all[i];
            var text = (el.textContent || el.innerText || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '').toLowerCase();
            for (var k = 0; k < keywords.length; k++) {
              if (text.indexOf(keywords[k]) !== -1 && text.indexOf('cancel') === -1 && text.indexOf('delete') === -1) {
                if (el.offsetParent !== null) return el;
              }
            }
          }
          return null;
        }
        
        function findSubmitButton() {
          var buttons = document.querySelectorAll('button, [role="button"], [type="submit"], a[role="button"], [class*="submit"]');
          var submitWords = ['post', 'publish', 'share', 'submit', 'send'];
          for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            var text = (btn.textContent || btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase().trim();
            if (text.length > 0 && text.length < 40) {
              for (var w = 0; w < submitWords.length; w++) {
                if (text === submitWords[w] || text.indexOf(submitWords[w]) === 0) {
                  if (text.indexOf('cancel') === -1 && text.indexOf('delete') === -1) return btn;
                }
              }
            }
          }
          return null;
        }
        
        function tryPasteIntoElement(el) {
          el.focus();
          el.click();
          var isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          var ev = new KeyboardEvent('keydown', { key: 'v', code: 'KeyV', keyCode: 86, ctrlKey: !isMac, metaKey: isMac, bubbles: true });
          el.dispatchEvent(ev);
          ev = new KeyboardEvent('keyup', { key: 'v', code: 'KeyV', keyCode: 86, ctrlKey: !isMac, metaKey: isMac, bubbles: true });
          el.dispatchEvent(ev);
        }
        
        function setContentAndFireEvents(el, text) {
          el.focus();
          el.click();
          if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text')) {
            el.value = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
          try {
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, text);
          } catch (e) {}
          el.innerText = text;
          el.textContent = text;
          if (typeof InputEvent !== 'undefined') {
            el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
          } else {
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        function showBanner(html) {
          var existing = document.getElementById('skool-pulse-paste-banner');
          if (existing) existing.remove();
          var banner = document.createElement('div');
          banner.id = 'skool-pulse-paste-banner';
          banner.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#1c1917;color:#fff;border:2px solid #f97316;border-radius:12px;padding:14px 20px;font-family:system-ui,sans-serif;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,0.5);max-width:420px;text-align:center;';
          banner.innerHTML = html;
          document.body.appendChild(banner);
          setTimeout(function () { if (banner.parentNode) banner.remove(); }, 25000);
        }
        
        function showPasteBanner() {
          showBanner('<strong style="color:#f97316;">Skool Pulse</strong><br><br>Your post is <strong>copied</strong>.<br>1. Click in the post box below<br>2. Press <kbd style="background:#333;padding:2px 6px;border-radius:4px;">Ctrl+V</kbd> (Mac: <kbd style="background:#333;padding:2px 6px;border-radius:4px;">Cmd+V</kbd>)<br>3. Click <strong>Post</strong>');
        }
        
        function runPasteAndPost(textToUse) {
          var target = findComposer();
          if (!target) {
            showPasteBanner();
            respond({ success: false, errorCode: 'COMPOSER_NOT_FOUND', errorMessage: 'Click in the post box first, then we can paste.' });
            return;
          }
          target.scrollIntoView({ block: 'center', behavior: 'instant' });
          target.focus();
          target.click();
          setContentAndFireEvents(target, textToUse);
          setTimeout(function () {
            var submitBtn = findSubmitButton();
            if (!submitBtn) {
              showPasteBanner();
              respond({ success: false, errorCode: 'SUBMIT_BUTTON_NOT_FOUND', errorMessage: 'Post button not found. Paste (Ctrl+V) and click Post yourself.' });
              return;
            }
            submitBtn.scrollIntoView({ block: 'center', behavior: 'instant' });
            submitBtn.focus();
            submitBtn.click();
            setTimeout(function () { respond({ success: true }); }, 1000);
          }, 800);
        }
        
        function waitForOneClickThenPasteAndPost() {
          showBanner('<strong style="color:#f97316;">Skool Pulse</strong><br><br><strong>Click once inside the post box</strong><br>We\'ll paste your post and click Post.');
          function onUserClick(ev) {
            document.removeEventListener('click', onUserClick, true);
            var bannerEl = document.getElementById('skool-pulse-paste-banner');
            if (bannerEl) bannerEl.remove();
            // Use message content immediately (no clipboard dependency; user gesture may expire by the time clipboard promise resolves)
            runPasteAndPost(content);
          }
          document.addEventListener('click', onUserClick, true);
          setTimeout(function () {
            document.removeEventListener('click', onUserClick, true);
          }, 60000);
        }
        
        function tryFillAndPost() {
          var target = findComposer();
          if (!target) {
            showPasteBanner();
            respond({ success: false, errorCode: 'COMPOSER_NOT_FOUND', errorMessage: 'Composer not found. Your post is copied — paste in the post box (Ctrl+V) and click Post.' });
            return;
          }
          waitForOneClickThenPasteAndPost();
        }
        
        showPasteBanner();
        var openBtn = findOpenComposerTrigger();
        if (openBtn && !findComposer()) {
          openBtn.scrollIntoView({ block: 'center', behavior: 'instant' });
          openBtn.click();
          setTimeout(function () {
            var again = findComposer();
            if (again) tryFillAndPost();
            else {
              showBanner('<strong style="color:#f97316;">Skool Pulse</strong><br><br>Click the <strong>post box</strong> below (or "Create post").<br>Then we\'ll paste and post.');
              setTimeout(tryFillAndPost, 4000);
            }
          }, 2500);
        } else {
          tryFillAndPost();
        }
        
        return true;
      } catch (e) {
        respond({ success: false, errorCode: 'UNKNOWN', errorMessage: (e && e.message) || String(e) });
        return true;
      }
    }
    return true;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSidebar);
  } else {
    createSidebar();
  }
})();
