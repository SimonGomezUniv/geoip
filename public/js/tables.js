export function countryFlag(cc) {
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
    return `<tr>
      <td><span style="color:${color}">■</span> ${name} (${c.code})</td>
      <td>${c.count.toLocaleString()}</td>
      <td>${c.percent.toFixed(2)}%</td>
      <td class="dist-bar-wrap"><div class="dist-bar" style="width:${Math.max(c.percent,0.5)}%;background:${color}"></div></td>
    </tr>`;
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
    return `<tr>
      <td>${flag} ${c.name || c.code}</td>
      <td>${c.continentName || c.continentCode || ''}</td>
      <td>${c.count.toLocaleString()}</td>
      <td>${c.percent.toFixed(2)}%</td>
      <td class="dist-bar-wrap"><div class="dist-bar" style="width:${Math.max(c.percent,0.5)}%"></div></td>
    </tr>`;
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
  table.innerHTML = `<thead><tr><th>IP</th><th>Pays</th><th>Continent</th><th>Coords</th></tr></thead>`;
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
      return `<tr style="height:${ROW_H}px">
        <td style="font-family:monospace">${r.ip}</td>
        <td>${flag} ${r.cn || r.cc || '—'}</td>
        <td>${r.on || r.oc || '—'}</td>
        <td style="font-size:12px;color:var(--text-secondary)">${lat ? lat+','+lon : '—'}</td>
      </tr>`;
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
    ...rows.map(c => `${c.code},"${(c.name||'').replace(/"/g,'""')}",${c.continentCode},"${(c.continentName||'').replace(/"/g,'""')}",${c.count},${c.percent.toFixed(4)}`)
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'geoip-countries.csv'; a.click();
  URL.revokeObjectURL(url);
}
