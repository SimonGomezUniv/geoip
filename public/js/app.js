import { renderSettings } from './views/settings.js';
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
    if (window.geoipApp.currentDb.type === 'mmdb') {
      el.textContent = `✅ ${window.geoipApp.currentDb.name} (MMDB)`;
    } else {
      el.textContent = `✅ ${window.geoipApp.currentDb.name} (${window.geoipApp.currentDb.entries.length.toLocaleString()} entrées)`;
    }
  } else {
    el.textContent = 'Aucune base chargée';
  }
}

window.showToast = function(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
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
  // Restore last active DB or MMDB source
  try {
    const activeType = await loadState('activeDbType');
    const activeMmdbPath = await loadState('activeMmdbPath');
    const activeId = await loadState('activeDbId');
    if (activeType === 'mmdb' && activeMmdbPath) {
      const name = activeMmdbPath.split(/[\\/]/).pop() || activeMmdbPath;
      window.geoipApp.currentDb = { id: `mmdb:${activeMmdbPath}`, name, type: 'mmdb', mmdbPath: activeMmdbPath, entries: [] };
    } else if (activeId) {
      const db = await loadDatabase(activeId);
      if (db && db.entries) {
        window.geoipApp.currentDb = { id: db.id, name: db.name, type: db.type, entries: db.entries };
      }
    }
  } catch (e) { console.warn('Could not restore DB state', e); }
  navigate(getHash());
});
