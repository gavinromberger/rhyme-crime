#!/usr/bin/env node
/**
 * sync-heists.js
 *
 * Reads src/data/heists.xlsx and outputs src/data/heists.json.
 *
 * Columns used from the "Heists" sheet:
 *   COUNTRY, CITY, HEIST ID, TARGET, LOCATION, STATUS, RHYME SEQUENCE
 *
 * RHYME SEQUENCE is a comma-separated list of syllable counts, one per lock.
 * Examples:
 *   "1"     → one misdemeanor lock
 *   "2,3"   → felony + most-wanted (difficulty 5)
 *   "3,4,4" → most-wanted + two public-enemy locks (difficulty 11)
 *
 * Syllable → difficulty name:
 *   1 → misdemeanor
 *   2 → felony
 *   3 → most-wanted
 *   4 → public-enemy
 *
 * Rhyme content (riddle, answer) is NOT embedded here — assigned at runtime
 * from rhymes.json via GameStateContext.getOrAssignRhymes().
 *
 * Run with:  npm run sync-heists
 */

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const DATA        = path.join(__dirname, '../src/data');
const HEISTS_XLSX = path.join(DATA, 'heists.xlsx');
const HEISTS_JSON = path.join(DATA, 'heists.json');

const SYLLABLE_DIFFICULTY = {
  1: 'misdemeanor',
  2: 'felony',
  3: 'most-wanted',
  4: 'public-enemy',
};

function slugify(name) {
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function parseSequence(raw) {
  if (!raw || !String(raw).trim()) return null;
  const parts = String(raw).split(',').map(s => parseInt(s.trim(), 10));
  if (parts.some(isNaN)) {
    console.warn(`  ⚠  Invalid rhyme sequence: "${raw}"`);
    return null;
  }
  return parts.map(syl => ({
    syllables:  syl,
    difficulty: SYLLABLE_DIFFICULTY[syl] ?? `${syl}-syllable`,
  }));
}

// ── Read heists.xlsx ───────────────────────────────────────────────────────────
const wb = XLSX.readFile(HEISTS_XLSX);
const ws = wb.Sheets['Heists'];
if (!ws) { console.error('Sheet "Heists" not found in heists.xlsx'); process.exit(1); }

const countryMap = new Map();
let skipped = 0;

for (const row of XLSX.utils.sheet_to_json(ws, { defval: '', range: 1 })) {
  const country  = String(row['COUNTRY']        ?? '').trim();
  const city     = String(row['CITY']           ?? '').trim();
  const heistId  = String(row['HEIST ID']       ?? '').trim();
  const target   = String(row['TARGET']         ?? '').trim();
  const location = String(row['LOCATION']       ?? '').trim();
  const status   = String(row['STATUS']         ?? '').trim();
  const sequence = String(row['RHYME SEQUENCE'] ?? '').trim();

  if (!heistId || !country) continue;
  if (!status.includes('Active')) continue;

  const locks = parseSequence(sequence);
  if (!locks || locks.length === 0) {
    console.warn(`  ⚠  No rhyme sequence for "${heistId}" — skipping`);
    skipped++;
    continue;
  }

  const slug = slugify(country);

  if (!countryMap.has(slug)) {
    countryMap.set(slug, { slug, countryName: country, city, levels: [] });
  }

  const slot = heistId.replace(`${slug}-`, '');
  countryMap.get(slug).levels.push({ id: heistId, slot, target, location, locks });
}

// ── Sort levels within each country ───────────────────────────────────────────
const SLOT_ORDER = ['rt1', 'rt2', 'rt3', 'absurd'];
const output = [...countryMap.values()].map(c => ({
  ...c,
  levels: c.levels.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)),
}));

// ── Write heists.json ──────────────────────────────────────────────────────────
fs.writeFileSync(HEISTS_JSON, JSON.stringify(output, null, 2) + '\n');

// ── Summary ────────────────────────────────────────────────────────────────────
const totalHeists    = output.reduce((s, c) => s + c.levels.length, 0);
const totalCountries = output.length;
console.log(`\n✓  heists.json written`);
console.log(`   ${totalCountries} countries  ·  ${totalHeists} active heists`);
if (skipped > 0) console.log(`   ${skipped} skipped (missing sequence)`);
console.log(`\n   Breakdown:`);
for (const c of output) {
  const slots = c.levels.map(l => l.slot).join(', ');
  console.log(`     ${c.countryName.padEnd(20)} [${slots}]`);
}
console.log('');
