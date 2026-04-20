const { getDefaultConfig } = require('expo/metro-config');
const fs   = require('fs');
const path = require('path');

// ── Auto-sync heists.xlsx → heists.json on save ───────────────────────────────
// When heists.xlsx changes, regenerate heists.json so Metro hot-reloads the app.
// No terminal commands needed — just save the xlsx.
const xlsxPath = path.join(__dirname, 'src/data/heists.xlsx');
let debounce;
fs.watch(xlsxPath, () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    try {
      // Re-require each time so module cache doesn't hold stale state
      Object.keys(require.cache)
        .filter(k => k.includes('sync-heists') || k.includes('heists.xlsx'))
        .forEach(k => delete require.cache[k]);
      require('./scripts/sync-heists.js');
    } catch (e) {
      console.error('\n[metro] heists sync failed:', e.message);
    }
  }, 150);
});

// ─────────────────────────────────────────────────────────────────────────────
const config = getDefaultConfig(__dirname);
module.exports = config;
