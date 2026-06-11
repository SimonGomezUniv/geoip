import { saveDatabase, loadDatabase, listDatabases, deleteDatabase, saveState, loadState } from '../store.js';

export async function renderSettings(container) {
  container.innerHTML = `
<div class="view">
  <h1>⚙️ Paramétrage</h1>
  <div class="card">
    <h2>Charger une base de données GeoIP</h2>
    <div class="drop-zone" id="drop-zone">
      <div class="drop-zone-inner">
        <span class="drop-icon">📂</span>
        <p>Glissez-déposez un fichier ici</p>
        <p class="text-secondary">Formats: .csv, .csv.gz, .json, .json.gz</p>
        <button class="btn btn-primary" id="browse-btn">Parcourir</button>
        <input type="file" id="file-input" accept=".csv,.json,.gz" style="display:none">
      </div>
    </div>
    <div id="load-progress" style="display:none; margin-top:16px">
      <div class="progress-bar-container"><div class="progress-bar" id="load-progress-bar"></div></div>
      <p id="load-progress-text" class="text-secondary" style="margin-top:6px">Chargement...</p>
    </div>
  </div>

  <div class="card">
    <h2>Serveur local (fichiers MMDB)</h2>
    <div id="server-section">
      <p class="text-secondary">Pour les fichiers .mmdb, le serveur Node.js local est requis.</p>
      <div style="display:flex;gap:12px;margin-top:12px;align-items:center;flex-wrap:wrap">
        <input type="text" id="mmdb-path" placeholder="ex: data/ipinfo_lite.mmdb"
          style="flex:1;background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:14px">
        <button class="btn btn-secondary" id="check-server-btn">Tester le serveur</button>
        <button class="btn btn-primary" id="load-mmdb-btn">Charger MMDB</button>
      </div>
      <p id="server-status" class="text-secondary" style="margin-top:8px"></p>
    </div>
  </div>

  <div class="card" id="db-list-card">
    <h2>Bases chargées</h2>
    <div id="db-list"><p class="text-secondary">Aucune base chargée.</p></div>
  </div>

  <div class="card" id="data-samples-card" style="display:none">
    <h2>Aperçu des données</h2>
    <div id="data-preview"></div>
  </div>
</div>`;

  await refreshDbList();
  bindEvents();
}

async function refreshDbList() {
  const list = await listDatabases();
  const container = document.getElementById('db-list');
  if (!container) return;
  if (!list.length) { container.innerHTML = '<p class="text-secondary">Aucune base chargée.</p>'; return; }
  const activeId = window.geoipApp.currentDb ? window.geoipApp.currentDb.id : null;
  container.innerHTML = list.map(db => `
    <div class="db-list-item ${db.id === activeId ? 'active-db' : ''}" data-id="${db.id}">
      <div class="db-info">
        <span class="db-name">${db.name}</span>
        <span class="db-meta">${db.type} · ${(db.entriesCount||0).toLocaleString()} entrées · ${new Date(db.loadedAt).toLocaleString()}</span>
      </div>
      <div class="db-actions">
        <button class="btn btn-primary btn-sm activate-btn" data-id="${db.id}">${db.id === activeId ? '✅ Actif' : 'Activer'}</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${db.id}">🗑️</button>
      </div>
    </div>`).join('');

  container.querySelectorAll('.activate-btn').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    const db = await loadDatabase(id);
    if (db) {
      window.geoipApp.currentDb = { id: db.id, name: db.name, type: db.type, entries: db.entries };
      await saveState('activeDbId', id);
      window.geoipApp.updateDbStatus();
      window.showToast(`Base "${db.name}" activée (${db.entries.length.toLocaleString()} entrées)`, 'success');
      await refreshDbList();
      showPreview(db.entries.slice(0, 5));
    }
  }));
  container.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    if (window.geoipApp.currentDb && window.geoipApp.currentDb.id === id) {
      window.geoipApp.currentDb = null;
      window.geoipApp.updateDbStatus();
    }
    await deleteDatabase(id);
    window.showToast('Base supprimée', 'info');
    await refreshDbList();
  }));
}

function showPreview(entries) {
  const card = document.getElementById('data-samples-card');
  const preview = document.getElementById('data-preview');
  if (!card || !preview) return;
  card.style.display = '';
  preview.innerHTML = `<div class="table-wrapper"><table>
    <thead><tr><th>Start Int</th><th>End Int</th><th>CC</th><th>Country</th><th>Continent</th><th>Lat/Lon</th></tr></thead>
    <tbody>${entries.map(e => `<tr>
      <td style="font-family:monospace">${e.startInt}</td>
      <td style="font-family:monospace">${e.endInt}</td>
      <td>${e.cc||'—'}</td><td>${e.cn||'—'}</td>
      <td>${e.oc||'—'} ${e.on||''}</td>
      <td>${e.lat||''},${e.lon||''}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function bindEvents() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');
  const checkBtn = document.getElementById('check-server-btn');
  const loadMmdbBtn = document.getElementById('load-mmdb-btn');

  browseBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone?.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  checkBtn?.addEventListener('click', async () => {
    const status = document.getElementById('server-status');
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (status) status.textContent = '✅ Serveur en ligne';
    } catch {
      if (status) status.textContent = '❌ Serveur hors ligne. Démarrez avec: npm start';
    }
  });

  loadMmdbBtn?.addEventListener('click', async () => {
    const pathVal = document.getElementById('mmdb-path')?.value?.trim();
    if (!pathVal) { window.showToast('Entrez un chemin MMDB', 'warning'); return; }
    const status = document.getElementById('server-status');
    try {
      const res = await fetch('/api/db-info?path=' + encodeURIComponent(pathVal));
      if (!res.ok) { window.showToast('Fichier MMDB introuvable sur le serveur', 'error'); return; }
      window.showToast('MMDB chargé via serveur. Utilisez la fonctionnalité via le serveur.', 'info');
    } catch {
      if (status) status.textContent = '❌ Serveur requis pour les fichiers MMDB';
      window.showToast('Serveur non disponible', 'error');
    }
  });
}

function handleFile(file) {
  const name = file.name;
  const isGz = name.endsWith('.gz');
  const isJson = name.endsWith('.json') || name.endsWith('.json.gz');
  const isCsv = name.endsWith('.csv') || name.endsWith('.csv.gz');

  if (!isJson && !isCsv) {
    window.showToast('Format non supporté. Utilisez .csv, .json ou .gz', 'error');
    return;
  }

  const progress = document.getElementById('load-progress');
  const bar = document.getElementById('load-progress-bar');
  const text = document.getElementById('load-progress-text');
  if (progress) progress.style.display = '';

  const reader = new FileReader();
  reader.onload = e => {
    const worker = new Worker('./js/workers/db-worker.js');
    const msgType = isJson ? 'parse-json' : 'parse-csv';
    worker.postMessage({ type: msgType, data: e.target.result, filename: name }, [e.target.result]);

    worker.onmessage = async msg => {
      const { type, percent, message, entries, stats, message: errMsg } = msg.data;
      if (type === 'progress') {
        if (bar) bar.style.width = percent + '%';
        if (text) text.textContent = message;
      } else if (type === 'done') {
        worker.terminate();
        if (progress) progress.style.display = 'none';
        const id = 'db-' + Date.now();
        const dbType = isJson ? 'json' : 'csv';
        await saveDatabase(id, { name: name.replace(/\.gz$/, ''), type: dbType, entries });
        window.geoipApp.currentDb = { id, name: name.replace(/\.gz$/, ''), type: dbType, entries };
        await saveState('activeDbId', id);
        window.geoipApp.updateDbStatus();
        window.showToast(`Base chargée: ${entries.length.toLocaleString()} entrées`, 'success');
        await refreshDbList();
        showPreview(entries.slice(0, 5));
      } else if (type === 'error') {
        worker.terminate();
        if (progress) progress.style.display = 'none';
        window.showToast('Erreur: ' + (errMsg || 'inconnue'), 'error');
      }
    };
    worker.onerror = err => {
      if (progress) progress.style.display = 'none';
      window.showToast('Worker error: ' + err.message, 'error');
    };
  };
  reader.readAsArrayBuffer(file);
}
