import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { Reader } from 'mmdb-lib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

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
    const buf = readFileSync(absPath);
    const reader = new Reader(buf);
    const results = ips.map(ip => {
      try {
        const data = reader.get(ip);
        return { ip, ...data };
      } catch {
        return { ip, error: 'not_found' };
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
    const buf = readFileSync(absPath);
    const reader = new Reader(buf);
    res.json({ path: dbPath, size: buf.length, metadata: reader.metadata });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`GeoIP Analyser running at http://localhost:${PORT}`);
});
