import { parseIpList } from '../ip-utils.js';

function buildStatsFromLookup(results, total) {
  const continents = {};
  const countries = {};
  let found = 0;
  let notFound = 0;

  for (const r of results) {
    if (!r || !r.found) {
      notFound++;
      continue;
    }
    found++;
    if (r.oc) {
      if (!continents[r.oc]) continents[r.oc] = { code: r.oc, name: r.on || r.oc, count: 0 };
      continents[r.oc].count++;
    }
    if (r.cc) {
      if (!countries[r.cc]) countries[r.cc] = { code: r.cc, name: r.cn || r.cc, continentCode: r.oc, continentName: r.on || '', count: 0 };
      countries[r.cc].count++;
    }
  }

  Object.values(continents).forEach(c => { c.percent = found > 0 ? (c.count / total * 100) : 0; });
  Object.values(countries).forEach(c => { c.percent = found > 0 ? (c.count / total * 100) : 0; });

  return { total, found, notFound, continents, countries };
}

const SAMPLE_IPS = `8.8.8.8
1.1.1.1
208.67.222.222
9.9.9.9
77.88.8.8
64.6.64.6
8.26.56.26
185.228.168.9
76.76.19.19
94.140.14.14
156.154.70.1
198.101.242.72
23.253.163.53
216.146.35.35
84.200.69.80
180.76.76.76
114.114.114.114
199.85.126.10
81.218.119.11
195.46.39.39`;

export function renderAnalyse(container) {
  container.innerHTML = `
<div class="view">
  <h1>🔍 Analyse d'IPs</h1>
  <div class="card">
    <div class="db-warning" id="no-db-warning" style="display:none">
      ⚠️ Aucune base de données chargée. <a href="#settings">Configurer une base</a>
    </div>
    <div id="analyse-form">
      <label for="ip-input"><strong>Liste d'IPs</strong> (une par ligne, ou séparées par virgule/espace)</label>
      <textarea id="ip-input" placeholder="192.168.1.1&#10;8.8.8.8&#10;1.1.1.1&#10;..."></textarea>
      <div class="form-row">
        <span id="ip-count-label" class="text-secondary">0 IPs détectées</span>
        <div class="form-actions">
          <button class="btn btn-secondary" id="clear-btn">🗑️ Effacer</button>
          <button class="btn btn-secondary" id="sample-btn">📝 Exemple</button>
          <button class="btn btn-primary" id="analyze-btn">▶️ Analyser</button>
        </div>
      </div>
    </div>
  </div>
  <div id="analysis-progress" style="display:none" class="card">
    <h3>Analyse en cours...</h3>
    <div class="progress-bar-container"><div class="progress-bar" id="analysis-progress-bar"></div></div>
    <p id="analysis-progress-text" class="text-secondary"></p>
    <button class="btn btn-secondary" id="cancel-btn" style="margin-top:12px">Annuler</button>
  </div>
</div>`;

  if (!window.geoipApp.currentDb) {
    document.getElementById('no-db-warning').style.display = '';
  }

  const textarea = document.getElementById('ip-input');
  const countLabel = document.getElementById('ip-count-label');
  let debounceTimer = null;
  let activeWorker = null;

  textarea?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const ips = parseIpList(textarea.value);
      countLabel.textContent = `${ips.length.toLocaleString()} IPs détectées`;
    }, 300);
  });

  document.getElementById('clear-btn')?.addEventListener('click', () => {
    textarea.value = '';
    countLabel.textContent = '0 IPs détectées';
  });

  document.getElementById('sample-btn')?.addEventListener('click', () => {
    textarea.value = SAMPLE_IPS;
    const ips = parseIpList(SAMPLE_IPS);
    countLabel.textContent = `${ips.length.toLocaleString()} IPs détectées`;
  });

  document.getElementById('cancel-btn')?.addEventListener('click', () => {
    if (activeWorker) { activeWorker.terminate(); activeWorker = null; }
    document.getElementById('analysis-progress').style.display = 'none';
    window.showToast('Analyse annulée', 'warning');
  });

  document.getElementById('analyze-btn')?.addEventListener('click', () => {
    if (!window.geoipApp.currentDb) {
      window.showToast("Chargez d'abord une base de données", 'warning');
      return;
    }
    const ips = parseIpList(textarea.value, true);
    if (!ips.length) { window.showToast('Aucune IP valide détectée', 'warning'); return; }

    const progCard = document.getElementById('analysis-progress');
    const bar = document.getElementById('analysis-progress-bar');
    const text = document.getElementById('analysis-progress-text');
    progCard.style.display = '';
    document.getElementById('analyze-btn').disabled = true;

    const worker = new Worker('./js/workers/analysis-worker.js');
    activeWorker = worker;
    if (window.geoipApp.currentDb.type === 'mmdb') {
      worker.terminate();
      activeWorker = null;
      fetch('/api/mmdb-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_path: window.geoipApp.currentDb.mmdbPath, ips })
      })
        .then(async res => {
          if (!res.ok) throw new Error('MMDB lookup failed');
          return res.json();
        })
        .then(data => {
          const results = (data.results || []).map(r => r.found ? r : { ip: r.ip, found: false });
          const stats = buildStatsFromLookup(results, ips.length);
          progCard.style.display = 'none';
          document.getElementById('analyze-btn').disabled = false;
          window.geoipApp.results = { results, stats };
          window.showToast(`Analyse terminée: ${stats.found.toLocaleString()} localisées, ${stats.notFound.toLocaleString()} non détectées`, 'success');
          window.geoipApp.navigate('results');
        })
        .catch(err => {
          progCard.style.display = 'none';
          document.getElementById('analyze-btn').disabled = false;
          window.showToast('Erreur analyse MMDB: ' + err.message, 'error');
        });
      return;
    }

    worker.postMessage({ type: 'analyze', ips, entries: window.geoipApp.currentDb.entries });

    worker.onmessage = msg => {
      const { type, done, total, percent, results, stats } = msg.data;
      if (type === 'progress') {
        bar.style.width = percent + '%';
        text.textContent = `${done.toLocaleString()} / ${total.toLocaleString()} IPs`;
      } else if (type === 'done') {
        worker.terminate(); activeWorker = null;
        progCard.style.display = 'none';
        document.getElementById('analyze-btn').disabled = false;
        window.geoipApp.results = { results, stats };
        window.showToast(`Analyse terminée: ${stats.found.toLocaleString()} localisées, ${stats.notFound.toLocaleString()} non détectées`, 'success');
        window.geoipApp.navigate('results');
      }
    };
    worker.onerror = err => {
      progCard.style.display = 'none';
      document.getElementById('analyze-btn').disabled = false;
      window.showToast('Erreur analyse: ' + err.message, 'error');
    };
  });
}
