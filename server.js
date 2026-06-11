import express from 'express';
import { readFileSync, existsSync, statSync } from 'fs';
import { Reader } from 'mmdb-lib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const mmdbCache = new Map();

function pickName(names) {
  if (!names) return '';
  return names.en || names[Object.keys(names)[0]] || '';
}

function normalizeMmdbResult(ip, data) {
  if (!data) {
    return { ip, found: false };
  }

  const country = data.country || data.registered_country || data.represented_country || null;
  const continent = data.continent || null;
  const location = data.location || null;

  return {
    ip,
    found: true,
    cc: (country && country.iso_code ? String(country.iso_code).toUpperCase() : ''),
    cn: pickName(country && country.names),
    oc: (continent && continent.code ? String(continent.code).toUpperCase() : ''),
    on: pickName(continent && continent.names),
    lat: location && typeof location.latitude === 'number' ? location.latitude : 0,
    lon: location && typeof location.longitude === 'number' ? location.longitude : 0
  };
}

function getMmdbEntry(absPath) {
  const stat = statSync(absPath);
  const cached = mmdbCache.get(absPath);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached;
  }

  const buf = readFileSync(absPath);
  const entry = {
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    buf,
    reader: new Reader(buf)
  };
  mmdbCache.set(absPath, entry);
  return entry;
}

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// MMDB lookup endpoint
app.post('/api/mmdb-lookup', (req, res) => {
  try {
    const { db_path, ips } = req.body;
    if (!db_path || !ips || !Array.isArray(ips)) {
      return res.status(400).json({ error: 'db_path and ips array required' });
    }
    const absPath = path.resolve(__dirname, db_path);
    if (!existsSync(absPath)) {
      return res.status(404).json({ error: 'DB file not found' });
    }
    const { reader } = getMmdbEntry(absPath);
    const results = ips.map(ip => {
      try {
        const data = reader.get(ip);
        return normalizeMmdbResult(ip, data);
      } catch {
        return { ip, found: false, cc: '', cn: '', oc: '', on: '', lat: 0, lon: 0 };
      }
    });
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DB info endpoint
app.get('/api/db-info', (req, res) => {
  try {
    const dbPath = req.query.path;
    if (!dbPath) return res.status(400).json({ error: 'path parameter required' });
    const absPath = path.resolve(__dirname, dbPath);
    if (!existsSync(absPath)) {
      return res.status(404).json({ error: 'DB file not found' });
    }
    const { buf, reader } = getMmdbEntry(absPath);
    res.json({ path: dbPath, size: buf.length, metadata: reader.metadata });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`GeoIP Analyser running at http://localhost:${PORT}`);
});
