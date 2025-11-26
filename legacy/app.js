(function(){
  const $ = (sel) => document.querySelector(sel);
  const form = document.getElementById('pack-form');
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');
  const candidatesEl = document.getElementById('candidates');

  const defaultCandidates = [
    { videoId: 'python1', channelId: 'freeCodeCamp', durationSec: 300, topic: 'python', level: 'beginner' },
    { videoId: 'python2', channelId: 'techWithTim', durationSec: 400, topic: 'python', level: 'beginner' },
    { videoId: 'python3', channelId: 'coreySchafer', durationSec: 500, topic: 'python', level: 'intermediate' },
    { videoId: 'python4', channelId: 'freeCodeCamp', durationSec: 350, topic: 'python', level: 'advanced' }
  ];

  function setStatus(msg, kind='muted') {
    statusEl.className = kind;
    statusEl.textContent = msg || '';
  }

  function renderResult(res) {
    const items = (res && res.items) || [];
    const under = !!(res && res.underFilled);
    const total = res && typeof res.totalDurationSec === 'number' ? res.totalDurationSec : 0;
    const mins = (total/60).toFixed(1);

    const rows = items.map(i => {
      const m = (i.durationSec/60).toFixed(1);
      return `<tr><td>${i.videoId}</td><td>${i.channelId}</td><td>${i.durationSec}s (${m}m)</td></tr>`;
    }).join('');

    resultEl.innerHTML = `
      <div class="card">
        <div class="muted">Total duration: <strong>${total}s</strong> (${mins}m)</div>
        <div class="muted">Fill status: ${under ? '<span class="warn">Under-filled</span>' : '<span class="ok">OK</span>'}</div>
        <table class="table">
          <thead><tr><th>Video ID</th><th>Channel</th><th>Duration</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="3" class="muted">No items selected</td></tr>'}</tbody>
        </table>
        <pre style="margin-top:12px; white-space:pre-wrap; word-break:break-word;">${escapeHtml(JSON.stringify(res, null, 2))}</pre>
      </div>
    `;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function parseCandidates(text){
    if (!text || !text.trim()) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      throw new Error('Candidates JSON must be an array');
    } catch(err){
      throw new Error('Invalid candidates JSON: ' + err.message);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    try {
      candidatesEl.value = JSON.stringify(defaultCandidates, null, 2);
    } catch(_){}
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Building...', 'muted');
    resultEl.innerHTML = '';

    try {
      const topic = $('#topic').value.trim();
      const level = $('#level').value;
      const minMins = parseInt($('#min').value, 10) || 0;
      const maxMins = parseInt($('#max').value, 10) || 0;
      const minDurationSec = minMins * 60;
      const maxDurationSec = maxMins * 60;
      const blockedRaw = $('#blocked').value.trim();
      const seedRaw = $('#seed').value.trim();
      const seed = seedRaw ? Number(seedRaw) : undefined;

      if (!topic) throw new Error('Topic is required');
      if (!level) throw new Error('Mastery level is required');
      if (!minDurationSec || !maxDurationSec || minDurationSec <= 0 || maxDurationSec <= 0) throw new Error('Min/Max duration must be positive');
      if (minDurationSec > maxDurationSec) throw new Error('Min duration cannot be greater than max duration');

      const candidates = parseCandidates(candidatesEl.value);
      const blockedChannelIds = blockedRaw ? blockedRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined;

      const payload = { topic, minDurationSec, maxDurationSec, userMasteryLevel: level, candidates, blockedChannelIds, seed };

      const resp = await fetch('/api/build-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data && data.error ? data.error : 'Request failed');

      renderResult(data);
      setStatus('Done', 'ok');
    } catch(err){
      setStatus(String(err.message || err), 'error');
      resultEl.innerHTML = '';
    }
  });
})();
