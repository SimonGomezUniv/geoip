const DB_NAME = 'geoip-db';
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
