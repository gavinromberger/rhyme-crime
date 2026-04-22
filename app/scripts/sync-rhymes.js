#!/usr/bin/env node
/**
 * sync-rhymes.js
 *
 * Reads src/data/rhymes.xlsx (one sheet per syllable tier).
 * All rows are treated as approved — no status column.
 * The adjective+noun combination (e.g. "mean-queen") is the stable ID.
 * Duplicates across sheets are detected and skipped with a warning.
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
  'Misdemeanor (1 Syllable)':   { syllables: 1, difficulty: 'misdemeanor'  },
  'Felony (2 Syllables)':       { syllables: 2, difficulty: 'felony'       },
  'Most Wanted (3 Syllables)':  { syllables: 3, difficulty: 'most-wanted'  },
  'Public Enemy (4 Syllables)': { syllables: 4, difficulty: 'public-enemy' },
};

const wb = XLSX.readFile(XLSX_PATH);

const rhymes = [];
const seen   = new Set(); // tracks word1-word2 keys to prevent duplicates

for (const [sheetName, meta] of Object.entries(SHEET_META)) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.warn(`  ⚠  Sheet not found: "${sheetName}" — skipping`);
    continue;
  }

  // Skip title row (row 0), use row 1 as header
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', range: 1 });

  for (const row of rows) {
    const riddle = String(row['RIDDLE']             ?? '').trim();
    const word1  = String(row['WORD 1 (Adjective)'] ?? '').trim().toLowerCase();
    const word2  = String(row['WORD 2 (Noun)']      ?? '').trim().toLowerCase();

    if (!riddle || !word1 || !word2) continue; // skip blank rows

    const id = `${word1}-${word2}`;

    if (seen.has(id)) {
      console.warn(`  ⚠  Duplicate "${id}" in "${sheetName}" — skipping`);
      continue;
    }
    seen.add(id);

    rhymes.push({ id, ...meta, riddle, word1, word2 });
  }
}

// Sort: syllables ascending, then alphabetically by id within each tier
rhymes.sort((a, b) => a.syllables - b.syllables || a.id.localeCompare(b.id));

fs.writeFileSync(JSON_PATH, JSON.stringify(rhymes, null, 2) + '\n');

// ─── Summary ──────────────────────────────────────────────────────────────────
const byTier = {};
rhymes.forEach(r => { byTier[r.syllables] = (byTier[r.syllables] || 0) + 1; });

console.log(`\n✓  rhymes.json written — ${rhymes.length} rhymes total\n`);
console.log('  Sheet breakdown:');
for (const [sheetName, meta] of Object.entries(SHEET_META)) {
  const count = byTier[meta.syllables] ?? 0;
  console.log(`    ${meta.syllables} syl  ${sheetName.padEnd(28)}  ${count}`);
}
console.log('');
