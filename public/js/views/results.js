import { initMap, destroyMap } from '../map.js';
import { renderContinentsTable, renderCountriesTable, renderIPListVirtual, exportCountriesCSV } from '../tables.js';

export async function renderResults(container) {
  const data = window.geoipApp.results;

  if (!data) {
    container.innerHTML = `<div class="view"><div class="card"><p class="text-secondary">Aucun résultat. Lancez d'abord une <a href="#analyse" style="color:var(--accent)">analyse</a>.</p></div></div>`;
    return;
  }

  const { results, stats } = data;

  container.innerHTML = `
<div class="view">
  <h1>📊 Résultats</h1>
  <div class="stats-grid">
    <div class="stat-card"><span class="stat-number" id="stat-total">0</span><span class="stat-label">IPs analysées</span></div>
    <div class="stat-card"><span class="stat-number" id="stat-found">0</span><span class="stat-label">IPs localisées</span></div>
    <div class="stat-card"><span class="stat-number" id="stat-notfound">0</span><span class="stat-label">IPs non détectées</span></div>
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
</div>`;

  // Fill stats
  document.getElementById('stat-total').textContent = stats.total.toLocaleString();
  document.getElementById('stat-found').textContent = stats.found.toLocaleString();
  document.getElementById('stat-notfound').textContent = (stats.notFound || 0).toLocaleString();
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
        return `<tr><td>${flag} ${c.name||c.code}</td><td>${c.continentName||''}</td><td>${c.count.toLocaleString()}</td><td>${c.percent.toFixed(2)}%</td><td class="dist-bar-wrap"><div class="dist-bar" style="width:${Math.max(c.percent,.5)}%"></div></td></tr>`;
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
    if (el) el.textContent = `${n.toLocaleString()} IPs`;
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
