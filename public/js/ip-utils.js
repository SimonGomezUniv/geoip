export function ipv4ToInt(ip) {
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
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
    ip.split('.').every(p => +p >= 0 && +p <= 255);
}

export function parseIpList(text, deduplicate = false) {
  const raw = text.replace(/[,;\s]+/g, '\n').split('\n');
  const ips = raw.map(s => s.trim()).filter(isValidIPv4);
  return deduplicate ? [...new Set(ips)] : ips;
}
