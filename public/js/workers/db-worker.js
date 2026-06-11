importScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js');

const CONTINENT_NAME_TO_CODE = {
  'north america':'NA','south america':'SA','europe':'EU','asia':'AS',
  'africa':'AF','oceania':'OC','antarctica':'AN','northamerica':'NA',
  'southamerica':'SA','amérique du nord':'NA','amérique du sud':'SA',
  'asie':'AS','afrique':'AF','océanie':'OC','antarctique':'AN'
};

function normalizeContinent(val) {
  if (!val) return '';
  const s = val.trim();
  if (s.length <= 3) return s.toUpperCase();
  return CONTINENT_NAME_TO_CODE[s.toLowerCase()] || s;
}

function normalizeContinentName(oc, on) {
  // If oc is a full name (not a code), it IS the name
  if (!oc) return on || '';
  if (oc.length > 3) return oc; // oc was the full name
  return on || oc;
}

function normalizeCountryCode(val) {
  if (!val) return '';
  return String(val).trim().toUpperCase();
}

function pickField(cols, aliases) {
  const byLower = Object.create(null);
  cols.forEach(c => { byLower[String(c).toLowerCase()] = c; });
  for (const a of aliases) {
    if (byLower[a]) return byLower[a];
  }
  return '';
}

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

      const ccField = pickField(cols, ['country_code','country_iso_code','iso_code','iso2','cc','country']);
      const cnField = pickField(cols, ['country_name','country','cn']);
      const ocField = pickField(cols, ['continent_code','continent_iso_code','continent_code2','oc','continent']);
      const onField = pickField(cols, ['continent_name','continent','on']);
      const latField = pickField(cols, ['latitude','lat']);
      const lonField = pickField(cols, ['longitude','lon']);

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
          cc: normalizeCountryCode(r[ccField] || ''),
          cn: r[cnField] || '',
          oc: normalizeContinent(r[ocField] || ''),
          on: normalizeContinentName(r[ocField] || '', r[onField] || ''),
          lat: parseFloat(r[latField]) || 0,
          lon: parseFloat(r[lonField]) || 0
        });

        if (i % 10000 === 0) {
          const pct = 5 + Math.round((i / total) * 85);
          self.postMessage({ type: 'progress', percent: pct, message: `Traitement: ${i.toLocaleString()} / ${total.toLocaleString()} lignes` });
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

        const rawOc = r.continent_code || r.continent || r.oc || '';
        const rawOn = r.continent_name || r.on || '';
        entries.push({
          startInt, endInt,
          cc: normalizeCountryCode(r.country_code || r.country || r.cc || ''),
          cn: r.country_name || r.cn || '',
          oc: normalizeContinent(rawOc),
          on: normalizeContinentName(rawOc, rawOn),
          lat: parseFloat(r.latitude || r.lat) || 0,
          lon: parseFloat(r.longitude || r.lon) || 0
        });

        if (i % 10000 === 0) {
          self.postMessage({ type: 'progress', percent: 10 + Math.round((i / total) * 80), message: `${i.toLocaleString()} / ${total.toLocaleString()}` });
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
