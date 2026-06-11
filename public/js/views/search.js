import { lookupIpv4, ipv4ToInt, isValidIPv4 } from '../ip-utils.js';
import { countryFlag, CONTINENT_NAMES } from '../tables.js';

export function renderSearch(container) {
  container.innerHTML = `
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
</div>`;

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

async function performSearch(query) {
  const resultsCard = document.getElementById('search-results');
  const content = document.getElementById('search-results-content');
  const db = window.geoipApp.currentDb;

  resultsCard.style.display = '';

  if (isValidIPv4(query)) {
    if (!db) { content.innerHTML = '<p class="text-secondary">Chargez une base pour effectuer une recherche IP.</p>'; return; }

    if (db.type === 'mmdb') {
      content.innerHTML = `<p class="text-secondary">Recherche dans la base MMDB...</p>`;
      try {
        const res = await fetch('/api/mmdb-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ db_path: db.mmdbPath, ips: [query] })
        });
        if (!res.ok) throw new Error('MMDB lookup failed');
        const data = await res.json();
        const entry = (data.results || [])[0];
        if (!entry || !entry.found) {
          content.innerHTML = `<div class="result-card"><h3>🔍 ${query}</h3><p class="text-secondary">IP non détectée dans la base MMDB.</p></div>`;
        } else {
          const flag = countryFlag(entry.cc);
          content.innerHTML = `<div class="result-card">
            <h3>${flag} ${query}</h3>
            <div class="result-row"><span>Pays</span><span>${flag} ${entry.cn || entry.cc || '—'} (${entry.cc||''})</span></div>
            <div class="result-row"><span>Continent</span><span>${entry.on || CONTINENT_NAMES[entry.oc] || entry.oc || '—'} (${entry.oc||''})</span></div>
            <div class="result-row"><span>Coordonnées</span><span>${entry.lat ? entry.lat+', '+entry.lon : '—'}</span></div>
          </div>`;
        }
      } catch (err) {
        content.innerHTML = `<div class="result-card"><h3>🔍 ${query}</h3><p class="text-secondary">Erreur de recherche MMDB: ${err.message}</p></div>`;
      }
      return;
    }

    const ipInt = ipv4ToInt(query);
    const entry = lookupIpv4(db.entries, ipInt);
    if (!entry) {
      content.innerHTML = `<div class="result-card"><h3>🔍 ${query}</h3><p class="text-secondary">IP non trouvée dans la base.</p></div>`;
    } else {
      const flag = countryFlag(entry.cc);
      content.innerHTML = `<div class="result-card">
        <h3>${flag} ${query}</h3>
        <div class="result-row"><span>Pays</span><span>${flag} ${entry.cn || entry.cc || '—'} (${entry.cc||''})</span></div>
        <div class="result-row"><span>Continent</span><span>${entry.on || CONTINENT_NAMES[entry.oc] || entry.oc || '—'} (${entry.oc||''})</span></div>
        <div class="result-row"><span>Coordonnées</span><span>${entry.lat ? entry.lat+', '+entry.lon : '—'}</span></div>
        <div class="result-row"><span>Plage</span><span style="font-family:monospace;font-size:12px">${entry.startInt} – ${entry.endInt}</span></div>
      </div>`;
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
        content.innerHTML = `<div class="result-card">
          <h3>${flag} ${country.name || cc}</h3>
          <div class="result-row"><span>Continent</span><span>${country.continentName||''}</span></div>
          <div class="result-row"><span>IPs analysées</span><span>${country.count.toLocaleString()}</span></div>
          <div class="result-row"><span>Pourcentage</span><span>${country.percent.toFixed(2)}%</span></div>
        </div>`;
        return;
      }
      if (continent) {
        content.innerHTML = `<div class="result-card">
          <h3>${CONTINENT_NAMES[cc]||cc}</h3>
          <div class="result-row"><span>IPs</span><span>${continent.count.toLocaleString()}</span></div>
          <div class="result-row"><span>%</span><span>${continent.percent.toFixed(2)}%</span></div>
        </div>`;
        return;
      }
    }
    // Search in DB
    if (db) {
      const sample = db.entries.filter(e => e.cc === cc).slice(0, 3);
      if (sample.length) {
        const flag = countryFlag(cc);
        const name = sample[0].cn || cc;
        content.innerHTML = `<div class="result-card"><h3>${flag} ${name} (${cc})</h3><p class="text-secondary">Trouvé dans la base (aucune analyse en cours).</p></div>`;
        return;
      }
    }
  }

  // Text search
  if (!analyseStats) {
    if (!db) { content.innerHTML = '<p class="text-secondary">Aucune base charg\u00e9e ni r\u00e9sultat d\'analyse disponible.</p>'; return; }
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
      return `<div class="result-card" style="margin-bottom:10px">
        <h3>${flag} ${e.cn||e.cc}</h3>
        <div class="result-row"><span>Code</span><span>${e.cc||'—'}</span></div>
        <div class="result-row"><span>Continent</span><span>${e.on||''} (${e.oc||''})</span></div>
      </div>`;
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
    ...contMatches.map(c => `<div class="result-card" style="margin-bottom:10px">
      <h3>${CONTINENT_NAMES[c.code]||c.name||c.code}</h3>
      <div class="result-row"><span>IPs</span><span>${c.count.toLocaleString()}</span></div>
      <div class="result-row"><span>%</span><span>${c.percent.toFixed(2)}%</span></div>
    </div>`),
    ...countryMatches.slice(0, 10).map(c => {
      const flag = countryFlag(c.code);
      return `<div class="result-card" style="margin-bottom:10px">
        <h3>${flag} ${c.name||c.code}</h3>
        <div class="result-row"><span>Continent</span><span>${c.continentName||''}</span></div>
        <div class="result-row"><span>IPs</span><span>${c.count.toLocaleString()}</span></div>
        <div class="result-row"><span>%</span><span>${c.percent.toFixed(2)}%</span></div>
      </div>`;
    })
  ].join('');
}
