function ipv4ToInt(ip) {
  const p = ip.split('.');
  return ((+p[0] << 24) | (+p[1] << 16) | (+p[2] << 8) | +p[3]) >>> 0;
}
function isValidIPv4(ip) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
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
