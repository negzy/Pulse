document.getElementById('save').addEventListener('click', function () {
  const baseUrl = document.getElementById('baseUrl').value.trim();
  const token = document.getElementById('token').value.trim();
  chrome.storage.local.set({ pulseBaseUrl: baseUrl, pulseToken: token }, function () {
    document.getElementById('saved').style.display = 'block';
    setTimeout(function () { document.getElementById('saved').style.display = 'none'; }, 2000);
    updateDashboardLink();
  });
});
function updateDashboardLink() {
  const link = document.getElementById('openDashboard');
  const hint = document.getElementById('dashboardHint');
  chrome.storage.local.get(['pulseBaseUrl'], function (items) {
    var baseUrl = (items.pulseBaseUrl || '').trim().replace(/\/$/, '');
    if (link) {
      link.href = baseUrl ? (baseUrl + '/dashboard/extension') : '#';
      link.style.pointerEvents = baseUrl ? 'auto' : 'none';
    }
    if (hint) hint.textContent = baseUrl ? 'Opens Extension page to get your token' : '(enter URL below and Save first)';
  });
}
chrome.storage.local.get(['pulseBaseUrl', 'pulseToken'], function (items) {
  var baseUrlEl = document.getElementById('baseUrl');
  if (baseUrlEl) baseUrlEl.value = items.pulseBaseUrl || 'https://pulsewav.co';
  if (items.pulseToken) document.getElementById('token').value = items.pulseToken;
  updateDashboardLink();
});
var schedulerLink = document.getElementById('openScheduler');
if (schedulerLink && chrome.runtime && chrome.runtime.getURL) {
  schedulerLink.href = chrome.runtime.getURL('scheduler.html');
  schedulerLink.target = '_blank';
  schedulerLink.rel = 'noopener';
}
