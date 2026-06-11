#!/usr/bin/env node
// Bootstrap script - run with: node setup.js
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = __dirname;

function dir(p) { mkdirSync(join(base, p), { recursive: true }); }
function file(p, content) {
  const full = join(base, p);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
  console.log('  created:', p);
}

console.log('Creating directory structure...');
['public','public/css','public/js','public/js/views','public/js/workers',
 'public/icons','.github','.github/workflows','data'].forEach(dir);

// ────────────────────────────────────────────────────────────────────────────
file('public/manifest.json', JSON.stringify({
  name: "GeoIP Analyser",
  short_name: "GeoIP",
  description: "GeoIP Analyser - Analyse et visualisation d'adresses IP",
  start_url: "/",
  display: "standalone",
  orientation: "any",
  theme_color: "#1a1a2e",
  background_color: "#16213e",
  icons: [
    { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
  ]
}, null, 2));

// ────────────────────────────────────────────────────────────────────────────
file('public/icons/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#1a1a2e"/>
  <text y=".9em" font-size="90" x="5">🌍</text>
</svg>`);

file('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#1a1a2e"/>
  <text y=".9em" font-size="90" x="5">🌍</text>
</svg>`);

// ────────────────────────────────────────────────────────────────────────────
file('public/sw.js', `const CACHE_NAME = 'geoip-v1';
const PRE_CACHE = ['./', './css/app.css', './js/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRE_CACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/index.html', `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GeoIP Analyser</title>
  <link rel="manifest" href="manifest.json">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <meta name="theme-color" content="#1a1a2e">
  <link rel="apple-touch-icon" href="icons/icon.svg">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <link rel="stylesheet" href="css/app.css">
</head>
<body>
  <header>
    <div class="header-brand">
      <span class="logo">🌍</span>
      <span class="brand-name">GeoIP Analyser</span>
    </div>
    <nav id="main-nav">
      <a href="#settings" class="nav-link" data-view="settings">⚙️ Paramétrage</a>
      <a href="#analyse" class="nav-link" data-view="analyse">🔍 Analyse</a>
      <a href="#results" class="nav-link" data-view="results">📊 Résultats</a>
      <a href="#search" class="nav-link" data-view="search">🔎 Recherche</a>
    </nav>
    <div id="db-status" class="db-status">
      <span id="db-status-text">Aucune base chargée</span>
    </div>
  </header>

  <main id="app-content"></main>
  <div id="toast-container"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js"></script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/css/app.css', `:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #0f3460;
  --accent: #e94560;
  --accent2: #533483;
  --text-primary: #eaeaea;
  --text-secondary: #a8a8b3;
  --border: #2a2a4a;
  --success: #27ae60;
  --warning: #f39c12;
  --danger: #e74c3c;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-secondary);
  color: var(--text-primary);
  min-height: 100vh;
}

/* ── Header ── */
header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 60px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 20px;
  z-index: 1000;
}
.header-brand { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.logo { font-size: 24px; }
.brand-name { font-size: 18px; font-weight: 700; color: var(--text-primary); }

#main-nav { display: flex; gap: 4px; flex: 1; }
.nav-link {
  text-decoration: none;
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
}
.nav-link:hover { color: var(--text-primary); background: rgba(255,255,255,0.05); }
.nav-link.active { color: var(--accent); border-bottom: 2px solid var(--accent); }

.db-status {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(255,255,255,0.05);
  padding: 4px 12px;
  border-radius: 20px;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Main ── */
main { padding-top: 60px; min-height: 100vh; }
.view { padding: 24px; max-width: 1400px; margin: 0 auto; }
.view h1 { font-size: 24px; margin-bottom: 20px; }
.view h2 { font-size: 18px; margin-bottom: 14px; }

/* ── Cards ── */
.card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid var(--border);
}
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.card-header h2 { margin: 0; }

/* ── Buttons ── */
.btn {
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--accent); color: white; }
.btn-primary:hover:not(:disabled) { background: #c73652; }
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border);
}
.btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.05); }
.btn-danger { background: var(--danger); color: white; }
.btn-danger:hover:not(:disabled) { background: #c0392b; }
.btn-sm { padding: 6px 14px; font-size: 12px; }

/* ── Progress ── */
.progress-bar-container {
  background: rgba(255,255,255,0.1);
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
  margin: 12px 0;
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent2), var(--accent));
  border-radius: 999px;
  width: 0%;
  transition: width 0.3s ease;
}

/* ── Drop Zone ── */
.drop-zone {
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
}
.drop-zone:hover, .drop-zone.drag-over {
  border-color: var(--accent);
  background: rgba(233,69,96,0.05);
}
.drop-zone-inner { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.drop-icon { font-size: 48px; }

/* ── Forms ── */
textarea#ip-input {
  width: 100%;
  min-height: 200px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  resize: vertical;
  margin: 10px 0;
}
textarea#ip-input:focus { outline: none; border-color: var(--accent); }

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.form-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.filter-input {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 14px;
  width: 300px;
}
.filter-input:focus { outline: none; border-color: var(--accent); }

/* ── Search ── */
.search-box-wrapper { display: flex; gap: 12px; margin-bottom: 12px; }
.search-box {
  flex: 1;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 20px;
  font-size: 16px;
}
.search-box:focus { outline: none; border-color: var(--accent); }

/* ── Tables ── */
.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: 10px 14px;
  text-align: left;
  font-weight: 500;
  position: sticky;
  top: 0;
  z-index: 1;
  cursor: pointer;
}
th:hover { color: var(--text-primary); }
td { padding: 9px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
tr:hover td { background: rgba(255,255,255,0.03); }
.table-controls { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }

/* ── Tabs ── */
.result-tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
.tab-btn {
  padding: 8px 18px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}
.tab-btn:hover { color: var(--text-primary); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

/* ── Stats Grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.stat-number { font-size: 32px; font-weight: 700; color: var(--accent); }
.stat-label { font-size: 13px; color: var(--text-secondary); text-align: center; }

/* ── Map ── */
#map-container { height: 500px; border-radius: 12px; overflow: hidden; }

/* ── IP Virtual List ── */
.ip-list-container {
  height: 400px;
  overflow-y: auto;
  position: relative;
}

/* ── Badge ── */
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

/* ── Distribution bar ── */
.dist-bar-wrap { width: 120px; }
.dist-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--accent);
  min-width: 2px;
}

/* ── Toast ── */
#toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
}
.toast {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 18px;
  font-size: 14px;
  max-width: 360px;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s;
  pointer-events: none;
}
.toast.visible { opacity: 1; transform: none; }
.toast-success { border-color: var(--success); }
.toast-error { border-color: var(--danger); }
.toast-warning { border-color: var(--warning); }

/* ── Misc ── */
.text-secondary { color: var(--text-secondary); font-size: 13px; }
.text-muted { color: var(--text-secondary); }
.db-warning { color: var(--warning); padding: 12px; border-radius: 8px; background: rgba(243,156,18,0.1); margin-bottom: 16px; }
.db-warning a { color: var(--accent); }
.db-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  margin-bottom: 8px;
}
.db-list-item.active-db { border-color: var(--accent); background: rgba(233,69,96,0.08); }
.db-info { display: flex; flex-direction: column; gap: 4px; }
.db-name { font-weight: 500; }
.db-meta { font-size: 12px; color: var(--text-secondary); }
.db-actions { display: flex; gap: 8px; }

.result-card { padding: 16px; border-radius: 8px; background: var(--bg-secondary); border: 1px solid var(--border); }
.result-card h3 { margin-bottom: 10px; }
.result-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); }
.result-row:last-child { border: none; }

/* ── Loading overlay ── */
.progress-overlay {
  position: fixed; inset: 0;
  background: rgba(22,33,62,0.85);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  z-index: 9000;
}
.spinner {
  width: 48px; height: 48px;
  border: 4px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Responsive ── */
@media (max-width: 768px) {
  .nav-link { padding: 6px 8px; font-size: 12px; }
  .brand-name { display: none; }
  .db-status { display: none; }
  .view { padding: 16px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  #map-container { height: 300px; }
  .search-box-wrapper { flex-direction: column; }
  .filter-input { width: 100%; }
}
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/js/store.js', `const DB_NAME = 'geoip-db';
const DB_VERSION = 1;

let _db = null;

function openDb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('databases')) {
        db.createObjectStore('databases', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state', { keyPath: 'key' });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = e => reject(e.target.error);
  });
}

function tx(store, mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  }));
}

export async function saveDatabase(id, data) {
  return tx('databases', 'readwrite', s => s.put({
    id,
    name: data.name,
    type: data.type,
    entries: data.entries,
    entriesCount: data.entries.length,
    loadedAt: new Date().toISOString()
  }));
}

export async function loadDatabase(id) {
  return tx('databases', 'readonly', s => s.get(id));
}

export async function listDatabases() {
  return new Promise(async (resolve, reject) => {
    const db = await openDb();
    const t = db.transaction('databases', 'readonly');
    const s = t.objectStore('databases');
    const req = s.getAll();
    req.onsuccess = e => resolve(e.target.result.map(r => ({
      id: r.id, name: r.name, type: r.type,
      entriesCount: r.entriesCount, loadedAt: r.loadedAt
    })));
    req.onerror = e => reject(e.target.error);
  });
}

export async function deleteDatabase(id) {
  return tx('databases', 'readwrite', s => s.delete(id));
}

export async function saveState(key, value) {
  return tx('state', 'readwrite', s => s.put({ key, value }));
}

export async function loadState(key) {
  return tx('state', 'readonly', s => s.get(key)).then(r => r ? r.value : null);
}
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/js/ip-utils.js', `export function ipv4ToInt(ip) {
  const p = ip.split('.');
  return ((+p[0] << 24) | (+p[1] << 16) | (+p[2] << 8) | +p[3]) >>> 0;
}

export function cidrToRange(cidr) {
  const [ip, bits] = cidr.split('/');
  const start = ipv4ToInt(ip);
  const mask = bits === '0' ? 0 : (~0 << (32 - +bits)) >>> 0;
  return [start & mask, (start & mask) | (~mask >>> 0)];
}

export function rangeToInts(startIp, endIp) {
  return [ipv4ToInt(startIp), ipv4ToInt(endIp)];
}

export function lookupIpv4(entries, ipInt) {
  let lo = 0, hi = entries.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const e = entries[mid];
    if (ipInt < e.startInt) hi = mid - 1;
    else if (ipInt > e.endInt) lo = mid + 1;
    else return e;
  }
  return null;
}

export function isValidIPv4(ip) {
  return /^(\\d{1,3}\\.){3}\\d{1,3}$/.test(ip) &&
    ip.split('.').every(p => +p >= 0 && +p <= 255);
}

export function parseIpList(text, deduplicate = false) {
  const raw = text.replace(/[,;\\s]+/g, '\\n').split('\\n');
  const ips = raw.map(s => s.trim()).filter(isValidIPv4);
  return deduplicate ? [...new Set(ips)] : ips;
}
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/js/tables.js', `export function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '🌐';
  const cp = [...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...cp);
}

export const CONTINENT_NAMES = {
  'AF': 'Afrique', 'AN': 'Antarctique', 'AS': 'Asie',
  'EU': 'Europe', 'NA': 'Amérique du Nord', 'OC': 'Océanie', 'SA': 'Amérique du Sud'
};

export const CONTINENT_COLORS = {
  'AF': '#e67e22', 'AN': '#95a5a6', 'AS': '#e74c3c',
  'EU': '#3498db', 'NA': '#2ecc71', 'OC': '#9b59b6', 'SA': '#f39c12'
};

export function renderContinentsTable(tbody, continents) {
  const rows = Object.values(continents).sort((a, b) => b.count - a.count);
  tbody.innerHTML = rows.map(c => {
    const color = CONTINENT_COLORS[c.code] || '#888';
    const name = CONTINENT_NAMES[c.code] || c.name || c.code;
    return \`<tr>
      <td><span style="color:\${color}">■</span> \${name} (\${c.code})</td>
      <td>\${c.count.toLocaleString()}</td>
      <td>\${c.percent.toFixed(2)}%</td>
      <td class="dist-bar-wrap"><div class="dist-bar" style="width:\${Math.max(c.percent,0.5)}%;background:\${color}"></div></td>
    </tr>\`;
  }).join('');
}

export function renderCountriesTable(tbody, countries, filter = '') {
  let rows = Object.values(countries).sort((a, b) => b.count - a.count);
  if (filter) {
    const q = filter.toLowerCase();
    rows = rows.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.continentName || '').toLowerCase().includes(q) ||
      (c.continentCode || '').toLowerCase().includes(q)
    );
  }
  tbody.innerHTML = rows.map(c => {
    const flag = countryFlag(c.code);
    return \`<tr>
      <td>\${flag} \${c.name || c.code}</td>
      <td>\${c.continentName || c.continentCode || ''}</td>
      <td>\${c.count.toLocaleString()}</td>
      <td>\${c.percent.toFixed(2)}%</td>
      <td class="dist-bar-wrap"><div class="dist-bar" style="width:\${Math.max(c.percent,0.5)}%"></div></td>
    </tr>\`;
  }).join('');
  return rows;
}

export function renderIPListVirtual(container, ipResults, filter = '') {
  let rows = ipResults;
  if (filter) {
    const q = filter.toLowerCase();
    rows = rows.filter(r =>
      r.ip.includes(q) ||
      (r.cn || '').toLowerCase().includes(q) ||
      (r.cc || '').toLowerCase().includes(q) ||
      (r.on || '').toLowerCase().includes(q)
    );
  }

  const ROW_H = 36;
  const total = rows.length;
  let startIdx = 0;

  const table = document.createElement('table');
  table.style.width = '100%';
  table.innerHTML = \`<thead><tr><th>IP</th><th>Pays</th><th>Continent</th><th>Coords</th></tr></thead>\`;
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  const spacer = document.createElement('div');
  spacer.style.height = total * ROW_H + 'px';
  spacer.style.position = 'relative';
  spacer.appendChild(table);
  table.style.position = 'absolute';
  table.style.top = '0';
  table.style.width = '100%';

  container.innerHTML = '';
  container.appendChild(spacer);

  function render() {
    const scrollTop = container.scrollTop;
    const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 5);
    const visible = Math.ceil(container.clientHeight / ROW_H) + 10;
    const end = Math.min(total, start + visible);

    table.style.top = start * ROW_H + 'px';
    tbody.innerHTML = rows.slice(start, end).map(r => {
      const flag = countryFlag(r.cc);
      const lat = r.lat ? r.lat.toFixed(2) : '';
      const lon = r.lon ? r.lon.toFixed(2) : '';
      return \`<tr style="height:\${ROW_H}px">
        <td style="font-family:monospace">\${r.ip}</td>
        <td>\${flag} \${r.cn || r.cc || '—'}</td>
        <td>\${r.on || r.oc || '—'}</td>
        <td style="font-size:12px;color:var(--text-secondary)">\${lat ? lat+','+lon : '—'}</td>
      </tr>\`;
    }).join('');
  }

  container.addEventListener('scroll', render);
  render();
  return rows.length;
}

export function exportCountriesCSV(countries) {
  const rows = Object.values(countries).sort((a, b) => b.count - a.count);
  const csv = [
    'country_code,country_name,continent_code,continent_name,count,percent',
    ...rows.map(c => \`\${c.code},"\${(c.name||'').replace(/"/g,'""')}",\${c.continentCode},"\${(c.continentName||'').replace(/"/g,'""')}",\${c.count},\${c.percent.toFixed(4)}\`)
  ].join('\\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'geoip-countries.csv'; a.click();
  URL.revokeObjectURL(url);
}
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/js/workers/db-worker.js', `importScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js');

function ipv4ToInt(ip) {
  const p = ip.split('.');
  return ((+p[0] << 24) | (+p[1] << 16) | (+p[2] << 8) | +p[3]) >>> 0;
}
function cidrToRange(cidr) {
  const [ip, bits] = cidr.split('/');
  const start = ipv4ToInt(ip);
  const mask = bits === '0' ? 0 : (~0 << (32 - +bits)) >>> 0;
  return [start & mask, (start & mask) | (~mask >>> 0)];
}

self.onmessage = async function(e) {
  const { type, data, filename, db_path } = e.data;

  if (type === 'parse-csv') {
    try {
      let text;
      if (filename && filename.endsWith('.gz')) {
        const arr = new Uint8Array(data);
        text = pako.inflate(arr, { to: 'string' });
      } else {
        text = new TextDecoder().decode(data);
      }
      self.postMessage({ type: 'progress', percent: 5, message: 'Parsing CSV...' });

      const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
      const rows = parsed.data;
      const total = rows.length;
      const cols = parsed.meta.fields || [];

      const hasCidr = cols.some(c => c.toLowerCase() === 'network');
      const hasRange = cols.some(c => c.toLowerCase() === 'start_ip');

      const ccField = cols.find(c => ['country_code','country','cc'].includes(c.toLowerCase())) || '';
      const cnField = cols.find(c => ['country_name','cn'].includes(c.toLowerCase())) || '';
      const ocField = cols.find(c => ['continent_code','continent','oc'].includes(c.toLowerCase())) || '';
      const onField = cols.find(c => ['continent_name','on'].includes(c.toLowerCase())) || '';
      const latField = cols.find(c => ['latitude','lat'].includes(c.toLowerCase())) || '';
      const lonField = cols.find(c => ['longitude','lon'].includes(c.toLowerCase())) || '';

      const entries = [];
      for (let i = 0; i < total; i++) {
        const r = rows[i];
        let startInt, endInt;
        try {
          if (hasCidr) {
            const net = r['network'] || r['Network'];
            if (!net) continue;
            [startInt, endInt] = cidrToRange(net);
          } else if (hasRange) {
            const s = r['start_ip'] || r['Start_IP'];
            const en = r['end_ip'] || r['End_IP'];
            if (!s || !en) continue;
            startInt = ipv4ToInt(s);
            endInt = ipv4ToInt(en);
          } else continue;
        } catch { continue; }

        entries.push({
          startInt, endInt,
          cc: r[ccField] || '',
          cn: r[cnField] || '',
          oc: r[ocField] || '',
          on: r[onField] || '',
          lat: parseFloat(r[latField]) || 0,
          lon: parseFloat(r[lonField]) || 0
        });

        if (i % 10000 === 0) {
          const pct = 5 + Math.round((i / total) * 85);
          self.postMessage({ type: 'progress', percent: pct, message: \`Traitement: \${i.toLocaleString()} / \${total.toLocaleString()} lignes\` });
        }
      }

      self.postMessage({ type: 'progress', percent: 92, message: 'Tri en cours...' });
      entries.sort((a, b) => a.startInt - b.startInt);

      const countries = new Set(entries.map(e => e.cc).filter(Boolean));
      const continents = new Set(entries.map(e => e.oc).filter(Boolean));

      self.postMessage({ type: 'progress', percent: 100, message: 'Terminé' });
      self.postMessage({ type: 'done', entries, stats: { total: entries.length, countries: countries.size, continents: continents.size } });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  }

  else if (type === 'parse-json') {
    try {
      let text;
      if (filename && filename.endsWith('.gz')) {
        const arr = new Uint8Array(data);
        text = pako.inflate(arr, { to: 'string' });
      } else {
        text = new TextDecoder().decode(data);
      }
      self.postMessage({ type: 'progress', percent: 10, message: 'Parsing JSON...' });
      let raw = JSON.parse(text);
      if (!Array.isArray(raw)) raw = raw.data || raw.rows || Object.values(raw);

      const total = raw.length;
      const entries = [];
      for (let i = 0; i < total; i++) {
        const r = raw[i];
        let startInt, endInt;
        try {
          if (r.network) {
            [startInt, endInt] = cidrToRange(r.network);
          } else if (r.start_ip && r.end_ip) {
            startInt = ipv4ToInt(r.start_ip);
            endInt = ipv4ToInt(r.end_ip);
          } else continue;
        } catch { continue; }

        entries.push({
          startInt, endInt,
          cc: r.country_code || r.country || r.cc || '',
          cn: r.country_name || r.cn || '',
          oc: r.continent_code || r.continent || r.oc || '',
          on: r.continent_name || r.on || '',
          lat: parseFloat(r.latitude || r.lat) || 0,
          lon: parseFloat(r.longitude || r.lon) || 0
        });

        if (i % 10000 === 0) {
          self.postMessage({ type: 'progress', percent: 10 + Math.round((i / total) * 80), message: \`\${i.toLocaleString()} / \${total.toLocaleString()}\` });
        }
      }

      self.postMessage({ type: 'progress', percent: 92, message: 'Tri...' });
      entries.sort((a, b) => a.startInt - b.startInt);
      self.postMessage({ type: 'done', entries, stats: { total: entries.length, countries: new Set(entries.map(e => e.cc)).size, continents: new Set(entries.map(e => e.oc)).size } });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  }
};
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/js/workers/analysis-worker.js', `function ipv4ToInt(ip) {
  const p = ip.split('.');
  return ((+p[0] << 24) | (+p[1] << 16) | (+p[2] << 8) | +p[3]) >>> 0;
}
function isValidIPv4(ip) {
  return /^(\\d{1,3}\\.){3}\\d{1,3}$/.test(ip) &&
    ip.split('.').every(p => +p >= 0 && +p <= 255);
}
function binarySearch(entries, ipInt) {
  let lo = 0, hi = entries.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const e = entries[mid];
    if (ipInt < e.startInt) hi = mid - 1;
    else if (ipInt > e.endInt) lo = mid + 1;
    else return e;
  }
  return null;
}

self.onmessage = function(e) {
  if (e.data.type !== 'analyze') return;
  const { ips, entries } = e.data;
  const total = ips.length;
  const results = [];
  const continents = {};
  const countries = {};
  let found = 0, notFound = 0;

  for (let i = 0; i < total; i++) {
    const ip = ips[i];
    if (!isValidIPv4(ip)) { notFound++; continue; }
    const ipInt = ipv4ToInt(ip);
    const entry = binarySearch(entries, ipInt);
    if (entry) {
      found++;
      results.push({ ip, cc: entry.cc, cn: entry.cn, oc: entry.oc, on: entry.on, lat: entry.lat, lon: entry.lon, found: true });
      if (entry.oc) {
        if (!continents[entry.oc]) continents[entry.oc] = { code: entry.oc, name: entry.on, count: 0 };
        continents[entry.oc].count++;
      }
      if (entry.cc) {
        if (!countries[entry.cc]) countries[entry.cc] = { code: entry.cc, name: entry.cn, continentCode: entry.oc, continentName: entry.on, count: 0 };
        countries[entry.cc].count++;
      }
    } else {
      notFound++;
      results.push({ ip, found: false });
    }

    if (i % 1000 === 0) {
      self.postMessage({ type: 'progress', done: i, total, percent: Math.round((i / total) * 100) });
    }
  }

  // Compute percents
  Object.values(continents).forEach(c => { c.percent = found > 0 ? (c.count / total * 100) : 0; });
  Object.values(countries).forEach(c => { c.percent = found > 0 ? (c.count / total * 100) : 0; });

  self.postMessage({ type: 'done', results, stats: { total, found, notFound, continents, countries } });
};
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/js/map.js', `const ISO_NUM_TO_A2 = {
  '004':'AF','008':'AL','012':'DZ','016':'AS','020':'AD','024':'AO','028':'AG','032':'AR',
  '036':'AU','040':'AT','044':'BS','048':'BH','050':'BD','051':'AM','052':'BB','056':'BE',
  '060':'BM','064':'BT','068':'BO','070':'BA','072':'BW','076':'BR','084':'BZ','086':'IO',
  '090':'SB','092':'VG','096':'BN','100':'BG','104':'MM','108':'BI','112':'BY','116':'KH',
  '120':'CM','124':'CA','132':'CV','136':'KY','140':'CF','144':'LK','148':'TD','152':'CL',
  '156':'CN','158':'TW','170':'CO','174':'KM','175':'YT','178':'CG','180':'CD','184':'CK',
  '188':'CR','191':'HR','192':'CU','196':'CY','203':'CZ','204':'BJ','208':'DK','212':'DM',
  '214':'DO','218':'EC','222':'SV','226':'GQ','231':'ET','232':'ER','233':'EE','238':'FK',
  '242':'FJ','246':'FI','248':'AX','250':'FR','254':'GF','258':'PF','262':'DJ','266':'GA',
  '268':'GE','270':'GM','275':'PS','276':'DE','288':'GH','292':'GI','296':'KI','300':'GR',
  '304':'GL','308':'GD','312':'GP','316':'GU','320':'GT','324':'GN','328':'GY','332':'HT',
  '334':'HM','340':'HN','344':'HK','348':'HU','356':'IN','360':'ID','364':'IR','368':'IQ',
  '372':'IE','376':'IL','380':'IT','384':'CI','388':'JM','392':'JP','398':'KZ','400':'JO',
  '404':'KE','408':'KP','410':'KR','414':'KW','417':'KG','418':'LA','422':'LB','426':'LS',
  '428':'LV','430':'LR','434':'LY','438':'LI','440':'LT','442':'LU','446':'MO','450':'MG',
  '454':'MW','458':'MY','462':'MV','466':'ML','470':'MT','474':'MQ','478':'MR','480':'MU',
  '484':'MX','492':'MC','496':'MN','498':'MD','499':'ME','500':'MS','504':'MA','508':'MZ',
  '516':'NA','520':'NR','524':'NP','528':'NL','531':'CW','533':'AW','535':'BQ','540':'NC',
  '548':'VU','554':'NZ','558':'NI','562':'NE','566':'NG','570':'NU','574':'NF','578':'NO',
  '580':'MP','583':'FM','584':'MH','585':'PW','586':'PK','591':'PA','598':'PG','600':'PY',
  '604':'PE','608':'PH','612':'PN','616':'PL','620':'PT','624':'GW','626':'TL','630':'PR',
  '634':'QA','638':'RE','642':'RO','643':'RU','646':'RW','652':'BL','654':'SH','659':'KN',
  '660':'AI','662':'LC','663':'MF','666':'PM','670':'VC','674':'SM','678':'ST','682':'SA',
  '686':'SN','688':'RS','690':'SC','694':'SL','703':'SK','705':'SI','706':'SO','710':'ZA',
  '716':'ZW','724':'ES','728':'SS','729':'SD','740':'SR','744':'SJ','748':'SZ','752':'SE',
  '756':'CH','760':'SY','762':'TJ','764':'TH','768':'TG','772':'TK','776':'TO','780':'TT',
  '784':'AE','788':'TN','792':'TR','795':'TM','796':'TC','798':'TV','800':'UG','804':'UA',
  '807':'MK','818':'EG','826':'GB','831':'GG','832':'JE','833':'IM','834':'TZ','840':'US',
  '850':'VI','854':'BF','858':'UY','860':'UZ','862':'VE','876':'WF','882':'WS','887':'YE',
  '894':'ZM'
};

let map = null;
let geoLayer = null;
let currentStats = null;

function getColor(count, maxCount) {
  if (!count || count === 0) return '#1a1a2e';
  if (maxCount === 0) return '#1a1a2e';
  const t = Math.log(count + 1) / Math.log(maxCount + 1);
  if (t < 0.2) return '#fee08b';
  if (t < 0.4) return '#fdae61';
  if (t < 0.6) return '#f46d43';
  if (t < 0.8) return '#d73027';
  return '#a50026';
}

export async function initMap(containerId, stats) {
  currentStats = stats;
  if (map) { map.remove(); map = null; geoLayer = null; }

  map = L.map(containerId, { zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);
  map.setView([20, 0], 2);

  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');
    const topo = await res.json();
    const geo = topojson.feature(topo, topo.objects.countries);

    const maxCount = Math.max(...Object.values(stats.countries || {}).map(c => c.count), 1);

    geoLayer = L.geoJSON(geo, {
      style: feature => {
        const numId = String(feature.id).padStart(3, '0');
        const a2 = ISO_NUM_TO_A2[numId];
        const country = a2 ? (stats.countries || {})[a2] : null;
        const count = country ? country.count : 0;
        return {
          fillColor: getColor(count, maxCount),
          fillOpacity: 0.8,
          color: '#2a2a4a',
          weight: 0.5
        };
      },
      onEachFeature: (feature, layer) => {
        const numId = String(feature.id).padStart(3, '0');
        const a2 = ISO_NUM_TO_A2[numId];
        const country = a2 ? (stats.countries || {})[a2] : null;
        layer.on({
          mouseover: e => {
            e.target.setStyle({ weight: 2, color: '#e94560' });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) e.target.bringToFront();
          },
          mouseout: e => geoLayer && geoLayer.resetStyle(e.target),
          click: e => {
            const name = country ? country.name : (a2 || 'Unknown');
            const count = country ? country.count : 0;
            const pct = country ? country.percent.toFixed(2) : '0.00';
            L.popup().setLatLng(e.latlng)
              .setContent(\`<b>\${name}</b><br>\${count.toLocaleString()} IPs (\${pct}%)\`)
              .openOn(map);
          }
        });
      }
    }).addTo(map);

    // Legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.cssText = 'background:#1a1a2e;padding:8px 12px;border-radius:8px;border:1px solid #2a2a4a;color:#eaeaea;font-size:12px';
      div.innerHTML = '<b>IPs par pays</b><br>' +
        ['#fee08b','#fdae61','#f46d43','#d73027','#a50026'].map((c,i) =>
          \`<span style="display:inline-block;width:12px;height:12px;background:\${c};margin-right:4px;border-radius:2px"></span>\${['Faible','','Moyen','','Élevé'][i]}<br>\`
        ).join('');
      return div;
    };
    legend.addTo(map);
  } catch (err) {
    console.warn('Map geo data failed:', err);
  }
}

export function updateMap(stats) {
  if (!map || !geoLayer) { return; }
  currentStats = stats;
  const maxCount = Math.max(...Object.values(stats.countries || {}).map(c => c.count), 1);
  geoLayer.setStyle(feature => {
    const numId = String(feature.id).padStart(3, '0');
    const a2 = ISO_NUM_TO_A2[numId];
    const country = a2 ? (stats.countries || {})[a2] : null;
    return {
      fillColor: getColor(country ? country.count : 0, maxCount),
      fillOpacity: 0.8, color: '#2a2a4a', weight: 0.5
    };
  });
}

export function destroyMap() {
  if (map) { map.remove(); map = null; geoLayer = null; }
}
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/js/views/settings.js', `import { saveDatabase, loadDatabase, listDatabases, deleteDatabase, saveState, loadState } from '../store.js';

export async function renderSettings(container) {
  container.innerHTML = \`
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
</div>\`;

  await refreshDbList();
  bindEvents();
}

async function refreshDbList() {
  const list = await listDatabases();
  const container = document.getElementById('db-list');
  if (!container) return;
  if (!list.length) { container.innerHTML = '<p class="text-secondary">Aucune base chargée.</p>'; return; }
  const activeId = window.geoipApp.currentDb ? window.geoipApp.currentDb.id : null;
  container.innerHTML = list.map(db => \`
    <div class="db-list-item \${db.id === activeId ? 'active-db' : ''}" data-id="\${db.id}">
      <div class="db-info">
        <span class="db-name">\${db.name}</span>
        <span class="db-meta">\${db.type} · \${(db.entriesCount||0).toLocaleString()} entrées · \${new Date(db.loadedAt).toLocaleString()}</span>
      </div>
      <div class="db-actions">
        <button class="btn btn-primary btn-sm activate-btn" data-id="\${db.id}">\${db.id === activeId ? '✅ Actif' : 'Activer'}</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="\${db.id}">🗑️</button>
      </div>
    </div>\`).join('');

  container.querySelectorAll('.activate-btn').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    const db = await loadDatabase(id);
    if (db) {
      window.geoipApp.currentDb = { id: db.id, name: db.name, type: db.type, entries: db.entries };
      await saveState('activeDbId', id);
      window.geoipApp.updateDbStatus();
      window.showToast(\`Base "\${db.name}" activée (\${db.entries.length.toLocaleString()} entrées)\`, 'success');
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
  preview.innerHTML = \`<div class="table-wrapper"><table>
    <thead><tr><th>Start Int</th><th>End Int</th><th>CC</th><th>Country</th><th>Continent</th><th>Lat/Lon</th></tr></thead>
    <tbody>\${entries.map(e => \`<tr>
      <td style="font-family:monospace">\${e.startInt}</td>
      <td style="font-family:monospace">\${e.endInt}</td>
      <td>\${e.cc||'—'}</td><td>\${e.cn||'—'}</td>
      <td>\${e.oc||'—'} \${e.on||''}</td>
      <td>\${e.lat||''},\${e.lon||''}</td>
    </tr>\`).join('')}</tbody>
  </table></div>\`;
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
        await saveDatabase(id, { name: name.replace(/\\.gz$/, ''), type: dbType, entries });
        window.geoipApp.currentDb = { id, name: name.replace(/\\.gz$/, ''), type: dbType, entries };
        await saveState('activeDbId', id);
        window.geoipApp.updateDbStatus();
        window.showToast(\`Base chargée: \${entries.length.toLocaleString()} entrées\`, 'success');
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
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/js/views/analyse.js', `import { parseIpList } from '../ip-utils.js';

const SAMPLE_IPS = \`8.8.8.8
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
195.46.39.39\`;

export function renderAnalyse(container) {
  container.innerHTML = \`
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
</div>\`;

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
      countLabel.textContent = \`\${ips.length.toLocaleString()} IPs détectées\`;
    }, 300);
  });

  document.getElementById('clear-btn')?.addEventListener('click', () => {
    textarea.value = '';
    countLabel.textContent = '0 IPs détectées';
  });

  document.getElementById('sample-btn')?.addEventListener('click', () => {
    textarea.value = SAMPLE_IPS;
    const ips = parseIpList(SAMPLE_IPS);
    countLabel.textContent = \`\${ips.length.toLocaleString()} IPs détectées\`;
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
    worker.postMessage({ type: 'analyze', ips, entries: window.geoipApp.currentDb.entries });

    worker.onmessage = msg => {
      const { type, done, total, percent, results, stats } = msg.data;
      if (type === 'progress') {
        bar.style.width = percent + '%';
        text.textContent = \`\${done.toLocaleString()} / \${total.toLocaleString()} IPs\`;
      } else if (type === 'done') {
        worker.terminate(); activeWorker = null;
        progCard.style.display = 'none';
        document.getElementById('analyze-btn').disabled = false;
        window.geoipApp.results = { results, stats };
        window.showToast(\`Analyse terminée: \${stats.found.toLocaleString()} / \${stats.total.toLocaleString()} IPs localisées\`, 'success');
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
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/js/views/results.js', `import { initMap, destroyMap } from '../map.js';
import { renderContinentsTable, renderCountriesTable, renderIPListVirtual, exportCountriesCSV } from '../tables.js';

export async function renderResults(container) {
  const data = window.geoipApp.results;

  if (!data) {
    container.innerHTML = \`<div class="view"><div class="card"><p class="text-secondary">Aucun résultat. Lancez d'abord une <a href="#analyse" style="color:var(--accent)">analyse</a>.</p></div></div>\`;
    return;
  }

  const { results, stats } = data;

  container.innerHTML = \`
<div class="view">
  <h1>📊 Résultats</h1>
  <div class="stats-grid">
    <div class="stat-card"><span class="stat-number" id="stat-total">0</span><span class="stat-label">IPs analysées</span></div>
    <div class="stat-card"><span class="stat-number" id="stat-found">0</span><span class="stat-label">IPs localisées</span></div>
    <div class="stat-card"><span class="stat-number" id="stat-countries">0</span><span class="stat-label">Pays distincts</span></div>
    <div class="stat-card"><span class="stat-number" id="stat-continents">0</span><span class="stat-label">Continents</span></div>
  </div>

  <div class="card">
    <div class="card-header"><h2>🗺️ Carte de distribution</h2></div>
    <div id="map-container"></div>
  </div>

  <div class="card">
    <div class="result-tabs">
      <button class="tab-btn active" data-tab="continents">Par continent</button>
      <button class="tab-btn" data-tab="countries">Par pays</button>
      <button class="tab-btn" data-tab="ip-list">Liste des IPs</button>
    </div>
    <div id="tab-continents" class="tab-content">
      <div class="table-wrapper"><table id="table-continents">
        <thead><tr><th>Continent</th><th>Nb IPs</th><th>%</th><th>Distribution</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </div>
    <div id="tab-countries" class="tab-content" style="display:none">
      <div class="table-controls">
        <input type="text" id="country-filter" placeholder="Filtrer par pays..." class="filter-input">
        <button class="btn btn-secondary" id="export-csv-btn">⬇️ Export CSV</button>
      </div>
      <div class="table-wrapper"><table id="table-countries">
        <thead><tr><th data-sort="name">Pays ↕</th><th data-sort="continent">Continent ↕</th><th data-sort="count">Nb IPs ↕</th><th data-sort="percent">% ↕</th><th>Distribution</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </div>
    <div id="tab-ip-list" class="tab-content" style="display:none">
      <div class="table-controls">
        <input type="text" id="ip-list-filter" placeholder="Filtrer par IP, pays, continent..." class="filter-input">
        <span id="ip-list-count" class="text-secondary"></span>
      </div>
      <div id="virtual-list-container" class="ip-list-container"></div>
    </div>
  </div>
</div>\`;

  // Fill stats
  document.getElementById('stat-total').textContent = stats.total.toLocaleString();
  document.getElementById('stat-found').textContent = stats.found.toLocaleString();
  document.getElementById('stat-countries').textContent = Object.keys(stats.countries || {}).length;
  document.getElementById('stat-continents').textContent = Object.keys(stats.continents || {}).length;

  // Map
  await initMap('map-container', stats);

  // Tables
  const contTbody = document.querySelector('#table-continents tbody');
  renderContinentsTable(contTbody, stats.continents || {});

  const cntTbody = document.querySelector('#table-countries tbody');
  let sortDir = { name: 1, continent: 1, count: -1, percent: -1 };
  let currentSort = 'count';

  function refreshCountries(filter = '') {
    const rows = renderCountriesTable(cntTbody, stats.countries || {}, filter);
  }
  refreshCountries();

  // Country sort
  document.querySelectorAll('#table-countries th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      sortDir[key] = -sortDir[key];
      currentSort = key;
      const filter = document.getElementById('country-filter')?.value || '';
      // Custom sort
      const rows = Object.values(stats.countries || {});
      rows.sort((a, b) => {
        let va = key === 'name' ? (a.name||'') : key === 'continent' ? (a.continentName||'') : a[key];
        let vb = key === 'name' ? (b.name||'') : key === 'continent' ? (b.continentName||'') : b[key];
        return typeof va === 'string' ? va.localeCompare(vb) * sortDir[key] : (va - vb) * sortDir[key];
      });
      const filt = filter.toLowerCase();
      const filtered = filt ? rows.filter(c =>
        (c.name||'').toLowerCase().includes(filt) || (c.code||'').toLowerCase().includes(filt)
      ) : rows;
      cntTbody.innerHTML = filtered.map(c => {
        const flag = [...(c.code||'').toUpperCase()].map(ch => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65)).join('');
        return \`<tr><td>\${flag} \${c.name||c.code}</td><td>\${c.continentName||''}</td><td>\${c.count.toLocaleString()}</td><td>\${c.percent.toFixed(2)}%</td><td class="dist-bar-wrap"><div class="dist-bar" style="width:\${Math.max(c.percent,.5)}%"></div></td></tr>\`;
      }).join('');
    });
  });

  let filterTimer = null;
  document.getElementById('country-filter')?.addEventListener('input', e => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => refreshCountries(e.target.value), 200);
  });

  document.getElementById('export-csv-btn')?.addEventListener('click', () => exportCountriesCSV(stats.countries || {}));

  // IP list virtual
  const vlContainer = document.getElementById('virtual-list-container');
  let ipFilter = '';
  function refreshIpList() {
    const n = renderIPListVirtual(vlContainer, results, ipFilter);
    const el = document.getElementById('ip-list-count');
    if (el) el.textContent = \`\${n.toLocaleString()} IPs\`;
  }

  let ipFilterTimer = null;
  document.getElementById('ip-list-filter')?.addEventListener('input', e => {
    clearTimeout(ipFilterTimer);
    ipFilterTimer = setTimeout(() => { ipFilter = e.target.value; refreshIpList(); }, 200);
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
      btn.classList.add('active');
      const tab = document.getElementById('tab-' + btn.dataset.tab);
      if (tab) tab.style.display = '';
      if (btn.dataset.tab === 'ip-list') refreshIpList();
    });
  });
}
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/js/views/search.js', `import { lookupIpv4, ipv4ToInt, isValidIPv4 } from '../ip-utils.js';
import { countryFlag, CONTINENT_NAMES } from '../tables.js';

export function renderSearch(container) {
  container.innerHTML = \`
<div class="view">
  <h1>🔎 Recherche</h1>
  <div class="card">
    <div class="search-box-wrapper">
      <input type="text" id="search-input" class="search-box"
             placeholder="Entrez une IP, un pays, un continent, un code pays...">
      <button class="btn btn-primary" id="search-btn">Rechercher</button>
    </div>
    <p class="text-secondary">Ex: 8.8.8.8 · United States · FR · Europe · NA</p>
  </div>
  <div id="search-results" class="card" style="display:none">
    <div id="search-results-content"></div>
  </div>
  <div id="search-no-db" class="card" style="display:none">
    <p>⚠️ Aucune base de données chargée. <a href="#settings">Configurer une base</a></p>
  </div>
</div>\`;

  if (!window.geoipApp.currentDb) {
    document.getElementById('search-no-db').style.display = '';
  }

  let debounceTimer = null;
  const input = document.getElementById('search-input');
  const btn = document.getElementById('search-btn');

  const doSearch = () => {
    const q = (input?.value || '').trim();
    if (!q) return;
    performSearch(q);
  };

  input?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  input?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSearch, 300);
  });
  btn?.addEventListener('click', doSearch);
}

function performSearch(query) {
  const resultsCard = document.getElementById('search-results');
  const content = document.getElementById('search-results-content');
  const db = window.geoipApp.currentDb;

  resultsCard.style.display = '';

  if (isValidIPv4(query)) {
    if (!db) { content.innerHTML = '<p class="text-secondary">Chargez une base pour effectuer une recherche IP.</p>'; return; }
    const ipInt = ipv4ToInt(query);
    const entry = lookupIpv4(db.entries, ipInt);
    if (!entry) {
      content.innerHTML = \`<div class="result-card"><h3>🔍 \${query}</h3><p class="text-secondary">IP non trouvée dans la base.</p></div>\`;
    } else {
      const flag = countryFlag(entry.cc);
      content.innerHTML = \`<div class="result-card">
        <h3>\${flag} \${query}</h3>
        <div class="result-row"><span>Pays</span><span>\${flag} \${entry.cn || entry.cc || '—'} (\${entry.cc||''})</span></div>
        <div class="result-row"><span>Continent</span><span>\${entry.on || CONTINENT_NAMES[entry.oc] || entry.oc || '—'} (\${entry.oc||''})</span></div>
        <div class="result-row"><span>Coordonnées</span><span>\${entry.lat ? entry.lat+', '+entry.lon : '—'}</span></div>
        <div class="result-row"><span>Plage</span><span style="font-family:monospace;font-size:12px">\${entry.startInt} – \${entry.endInt}</span></div>
      </div>\`;
    }
    return;
  }

  // Country/continent lookup in results or DB
  const q = query.toLowerCase();
  const analyseStats = window.geoipApp.results ? window.geoipApp.results.stats : null;

  // If 2-letter uppercase code
  if (/^[A-Z]{2}$/.test(query)) {
    const cc = query.toUpperCase();
    if (analyseStats) {
      const country = analyseStats.countries[cc];
      const continent = analyseStats.continents[cc];
      if (country) {
        const flag = countryFlag(country.code);
        content.innerHTML = \`<div class="result-card">
          <h3>\${flag} \${country.name || cc}</h3>
          <div class="result-row"><span>Continent</span><span>\${country.continentName||''}</span></div>
          <div class="result-row"><span>IPs analysées</span><span>\${country.count.toLocaleString()}</span></div>
          <div class="result-row"><span>Pourcentage</span><span>\${country.percent.toFixed(2)}%</span></div>
        </div>\`;
        return;
      }
      if (continent) {
        content.innerHTML = \`<div class="result-card">
          <h3>\${CONTINENT_NAMES[cc]||cc}</h3>
          <div class="result-row"><span>IPs</span><span>\${continent.count.toLocaleString()}</span></div>
          <div class="result-row"><span>%</span><span>\${continent.percent.toFixed(2)}%</span></div>
        </div>\`;
        return;
      }
    }
    // Search in DB
    if (db) {
      const sample = db.entries.filter(e => e.cc === cc).slice(0, 3);
      if (sample.length) {
        const flag = countryFlag(cc);
        const name = sample[0].cn || cc;
        content.innerHTML = \`<div class="result-card"><h3>\${flag} \${name} (\${cc})</h3><p class="text-secondary">Trouvé dans la base (aucune analyse en cours).</p></div>\`;
        return;
      }
    }
  }

  // Text search
  if (!analyseStats) {
    if (!db) { content.innerHTML = '<p class="text-secondary">Aucune base charg\u00e9e ni r\u00e9sultat d\\'analyse disponible.</p>'; return; }
    const matches = [];
    const seen = new Set();
    for (const e of db.entries) {
      const key = e.cc;
      if (seen.has(key)) continue;
      if ((e.cn||'').toLowerCase().includes(q) || (e.on||'').toLowerCase().includes(q) || (e.cc||'').toLowerCase().includes(q)) {
        seen.add(key);
        matches.push(e);
      }
      if (matches.length >= 10) break;
    }
    if (!matches.length) { content.innerHTML = '<p class="text-secondary">Aucun résultat trouvé.</p>'; return; }
    content.innerHTML = matches.map(e => {
      const flag = countryFlag(e.cc);
      return \`<div class="result-card" style="margin-bottom:10px">
        <h3>\${flag} \${e.cn||e.cc}</h3>
        <div class="result-row"><span>Code</span><span>\${e.cc||'—'}</span></div>
        <div class="result-row"><span>Continent</span><span>\${e.on||''} (\${e.oc||''})</span></div>
      </div>\`;
    }).join('');
    return;
  }

  const countryMatches = Object.values(analyseStats.countries).filter(c =>
    (c.name||'').toLowerCase().includes(q) || (c.code||'').toLowerCase().includes(q)
  );
  const contMatches = Object.values(analyseStats.continents).filter(c =>
    (c.name||'').toLowerCase().includes(q) || (c.code||'').toLowerCase().includes(q) ||
    (CONTINENT_NAMES[c.code]||'').toLowerCase().includes(q)
  );

  if (!countryMatches.length && !contMatches.length) {
    content.innerHTML = '<p class="text-secondary">Aucun résultat trouvé.</p>';
    return;
  }
  content.innerHTML = [
    ...contMatches.map(c => \`<div class="result-card" style="margin-bottom:10px">
      <h3>\${CONTINENT_NAMES[c.code]||c.name||c.code}</h3>
      <div class="result-row"><span>IPs</span><span>\${c.count.toLocaleString()}</span></div>
      <div class="result-row"><span>%</span><span>\${c.percent.toFixed(2)}%</span></div>
    </div>\`),
    ...countryMatches.slice(0, 10).map(c => {
      const flag = countryFlag(c.code);
      return \`<div class="result-card" style="margin-bottom:10px">
        <h3>\${flag} \${c.name||c.code}</h3>
        <div class="result-row"><span>Continent</span><span>\${c.continentName||''}</span></div>
        <div class="result-row"><span>IPs</span><span>\${c.count.toLocaleString()}</span></div>
        <div class="result-row"><span>%</span><span>\${c.percent.toFixed(2)}%</span></div>
      </div>\`;
    })
  ].join('');
}
`);

// ────────────────────────────────────────────────────────────────────────────
file('public/js/app.js', `import { renderSettings } from './views/settings.js';
import { renderAnalyse } from './views/analyse.js';
import { renderResults } from './views/results.js';
import { renderSearch } from './views/search.js';
import { loadState, loadDatabase } from './store.js';

window.geoipApp = {
  currentDb: null,
  results: null,
  workers: {}
};

const views = {
  settings: renderSettings,
  analyse: renderAnalyse,
  results: renderResults,
  search: renderSearch,
};

function getHash() {
  return location.hash.replace('#', '') || 'settings';
}

async function navigate(view) {
  const container = document.getElementById('app-content');
  container.innerHTML = '';
  const render = views[view] || views.settings;
  await render(container);
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.view === view);
  });
  updateDbStatus();
}

function updateDbStatus() {
  const el = document.getElementById('db-status-text');
  if (!el) return;
  if (window.geoipApp.currentDb) {
    el.textContent = \`✅ \${window.geoipApp.currentDb.name} (\${window.geoipApp.currentDb.entries.length.toLocaleString()} entrées)\`;
  } else {
    el.textContent = 'Aucune base chargée';
  }
}

window.showToast = function(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = \`toast toast-\${type}\`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

window.geoipApp.navigate = navigate;
window.geoipApp.updateDbStatus = updateDbStatus;

window.addEventListener('hashchange', () => navigate(getHash()));

window.addEventListener('load', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  // Restore last active DB
  try {
    const activeId = await loadState('activeDbId');
    if (activeId) {
      const db = await loadDatabase(activeId);
      if (db && db.entries) {
        window.geoipApp.currentDb = { id: db.id, name: db.name, type: db.type, entries: db.entries };
      }
    }
  } catch (e) { console.warn('Could not restore DB state', e); }
  navigate(getHash());
});
`);

// ────────────────────────────────────────────────────────────────────────────
file('.github/workflows/deploy.yml', `name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Generate app files
        run: node setup.js

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './public'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`);

console.log('\\n✅ All files created successfully!');
console.log('\\nNext steps:');
console.log('  1. npm install');
console.log('  2. npm start');
console.log('  3. Open http://localhost:3000');
