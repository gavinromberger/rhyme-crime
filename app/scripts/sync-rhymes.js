#!/usr/bin/env node
/**
 * sync-rhymes.js
 *
 * Reads src/data/rhymes/*.csv (one file per syllable tier) and writes
 * src/data/rhymes.json for use by the game.
 *
 * CSV files: 1Syllable.csv, 2Syllable.csv, 3Syllable.csv, 4Syllable.csv
 * Columns:   RIDDLE, WORD 1 (Adjective), WORD 2 (Noun)
 *
 * The adjective+noun combination (e.g. "mean-queen") is the stable ID.
 * Duplicates across files are detected and skipped with a warning.
 *
 * Run with:  npm run sync-rhymes
 */

const fs   = require('fs');
const path = require('path');

const CSV_DIR  = path.join(__dirname, '../src/data/rhymes');
const JSON_PATH = path.join(__dirname, '../src/data/rhymes.json');

const CSV_META = [
  { file: '1Syllable.csv', syllables: 1, difficulty: 'misdemeanor'  },
  { file: '2Syllable.csv', syllables: 2, difficulty: 'felony'       },
  { file: '3Syllable.csv', syllables: 3, difficulty: 'most-wanted'  },
  { file: '4Syllable.csv', syllables: 4, difficulty: 'public-enemy' },
];

// Minimal CSV parser — handles quoted fields with embedded commas/newlines
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field.trim()); field = ''; }
      else if (ch === '\n') {
        row.push(field.trim()); field = '';
        if (row.some(v => v)) rows.push(row);
        row = [];
      } else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
  }
  if (field.trim() || row.length) { row.push(field.trim()); if (row.some(v => v)) rows.push(row); }
  return rows;
}

const rhymes = [];
const seen   = new Set();

for (const { file, syllables, difficulty } of CSV_META) {
  const filePath = path.join(CSV_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠  File not found: ${file} — skipping`);
    continue;
  }

  const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
  if (rows.length === 0) continue;

  // First row is the header — find column indices by name
  const header = rows[0].map(h => h.trim().toUpperCase());
  const riddleCol = header.findIndex(h => h === 'RIDDLE');
  const word1Col  = header.findIndex(h => h.includes('ADJECTIVE') || h.includes('WORD 1'));
  const word2Col  = header.findIndex(h => h.includes('NOUN') || h.includes('WORD 2'));

  if (riddleCol === -1 || word1Col === -1 || word2Col === -1) {
    console.warn(`  ⚠  Could not find expected columns in ${file} — skipping`);
    console.warn(`     Headers found: ${rows[0].join(', ')}`);
    continue;
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const riddle = (row[riddleCol] ?? '').trim();
    const word1  = (row[word1Col]  ?? '').trim().toLowerCase();
    const word2  = (row[word2Col]  ?? '').trim().toLowerCase();

    if (!riddle || !word1 || !word2) continue;

    const id = `${word1}-${word2}`;
    if (seen.has(id)) {
      console.warn(`  ⚠  Duplicate "${id}" in ${file} — skipping`);
      continue;
    }
    seen.add(id);

    rhymes.push({ id, syllables, difficulty, riddle, word1, word2 });
  }
}

// Sort: syllables ascending, then alphabetically by id within each tier
rhymes.sort((a, b) => a.syllables - b.syllables || a.id.localeCompare(b.id));

fs.writeFileSync(JSON_PATH, JSON.stringify(rhymes, null, 2) + '\n');

// ─── Summary ──────────────────────────────────────────────────────────────────
const byTier = {};
rhymes.forEach(r => { byTier[r.syllables] = (byTier[r.syllables] || 0) + 1; });

console.log(`\n✓  rhymes.json written — ${rhymes.length} rhymes total\n`);
console.log('  Breakdown:');
for (const { file, syllables } of CSV_META) {
  console.log(`    ${syllables} syl  ${file.padEnd(20)}  ${byTier[syllables] ?? 0}`);
}
console.log('');
