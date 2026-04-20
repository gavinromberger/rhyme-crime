#!/usr/bin/env node
/**
 * sync-rhymes.js
 *
 * Reads src/data/rhymes.xlsx (one sheet per syllable tier),
 * collects every row whose status is "✅ Approved",
 * and writes src/data/rhymes.json for use by the game.
 *
 * Run with:  npm run sync-rhymes
 */

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const XLSX_PATH = path.join(__dirname, '../src/data/rhymes.xlsx');
const JSON_PATH = path.join(__dirname, '../src/data/rhymes.json');

// Sheet name → { syllables, difficulty }
const SHEET_META = {
  'Misdemeanor (1 Syllable)':  { syllables: 1, difficulty: 'misdemeanor'  },
  'Felony (2 Syllables)':      { syllables: 2, difficulty: 'felony'       },
  'Most Wanted (3 Syllables)': { syllables: 3, difficulty: 'most-wanted'  },
  'Most Wanted (4 Syllables)': { syllables: 4, difficulty: 'most-wanted'  },
};

const wb = XLSX.readFile(XLSX_PATH);

const approved = [];

for (const [sheetName, meta] of Object.entries(SHEET_META)) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.warn(`  ⚠  Sheet not found: "${sheetName}" — skipping`);
    continue;
  }

  // Skip title row (row 1), use row 2 as header
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', range: 1 });

  for (const row of rows) {
    const status = String(row['STATUS'] ?? '').trim();
    if (!status.includes('Approved')) continue;

    const id    = parseInt(row['#'], 10);
    const word1 = String(row['WORD 1 (Adjective)'] ?? '').trim().toLowerCase();
    const word2 = String(row['WORD 2 (Noun)']      ?? '').trim().toLowerCase();
    const riddle = String(row['RIDDLE']             ?? '').trim();

    if (!riddle || !word1 || !word2 || isNaN(id)) {
      console.warn(`  ⚠  Skipping incomplete row (id ${id}) in "${sheetName}"`);
      continue;
    }

    approved.push({ id, ...meta, riddle, word1, word2 });
  }
}

// Sort: syllables ascending, then id ascending within each tier
approved.sort((a, b) => a.syllables - b.syllables || a.id - b.id);

fs.writeFileSync(JSON_PATH, JSON.stringify(approved, null, 2) + '\n');

// ─── Summary ──────────────────────────────────────────────────────────────────
const totalBySheet = {};
for (const [sheetName, meta] of Object.entries(SHEET_META)) {
  const ws = wb.Sheets[sheetName];
  if (!ws) continue;
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', range: 1 });
  totalBySheet[meta.syllables] = rows.filter(r => String(r['#'] ?? '').trim()).length;
}

const approvedByTier = {};
approved.forEach(r => { approvedByTier[r.syllables] = (approvedByTier[r.syllables] || 0) + 1; });

const totalApproved = approved.length;
const totalAll      = Object.values(totalBySheet).reduce((s, n) => s + n, 0);

console.log(`\n✓  rhymes.json written — ${totalApproved} approved of ${totalAll} total\n`);
console.log('  Sheet breakdown:');
for (const [sheetName, meta] of Object.entries(SHEET_META)) {
  const tot = totalBySheet[meta.syllables] ?? 0;
  const app = approvedByTier[meta.syllables]  ?? 0;
  console.log(`    ${meta.syllables} syl  ${sheetName.padEnd(28)}  ${app}/${tot} approved`);
}
console.log('');
