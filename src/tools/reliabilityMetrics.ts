#!/usr/bin/env node
/**
 * reliabilityMetrics.ts
 *
 * Computes:
 *  - Cronbach's alpha (internal consistency) across numeric dimensions
 *  - Krippendorff's alpha (inter-rater reliability) for each dimension
 *
 * Expected input (like goldenSetRated_withoutLyrics.csv):
 *  - Rows are individual ratings.
 *  - Unit identifier: song `id` (column name: `id`).
 *  - Rater identifier: another `id` column (SubstanceRating id) OR `model`.
 *  - Rating dimensions: `wording`, `perspective`, `context`, `glamorization`, `harmAcknowledgement`.
 *
 * Notes/assumptions:
 *  - Krippendorff's alpha is computed with an interval distance (squared difference).
 *    This is appropriate for Likert-style numeric scales.
 *  - By default, reliability is computed per (songId, substanceCategory).
 *    This avoids mixing different substance categories within the same song.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

type Primitive = string | number | null;

type CsvRow = Record<string, string>;

const DIMENSIONS = ['wording', 'perspective', 'context', 'glamorization', 'harmAcknowledgement'] as const;
type Dimension = (typeof DIMENSIONS)[number];

function stddevSample(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const v = varianceSample(xs);
  if (v === null) return null;
  return Math.sqrt(v);
}

function printHelp() {
  console.log(`\
Usage:
  npx tsx src/tools/reliabilityMetrics.ts --input <file.csv> [--groupBy song|song+category] [--raterKey ratingId|model]
  npx tsx src/tools/reliabilityMetrics.ts --input <file.csv> --debugDim wording --topDisagreements 15

Defaults:
  --input   goldenSetRated_withoutLyrics.csv
  --groupBy song+category
  --raterKey ratingId
  --debugDim wording
  --topDisagreements 10

Diagnostics:
  --debugDim <dimension>         Dimension to rank by disagreement (default: wording)
  --topDisagreements <N>         How many disagreement units to print (default: 10)

What it computes:
  - Cronbach's alpha: internal consistency across the 5 rating dimensions.
    Units are aggregated as the mean per unit (across raters), then alpha is computed across dimensions.
  - Krippendorff's alpha (interval distance): inter-rater reliability per dimension.

Assumptions about the CSV:
  - One row = one rating.
  - There are two columns named 'id' in the export (Song.id and SubstanceRating.id).
    This script auto-renames them to songId and ratingId based on column order.
  - Required columns: substanceCategory, wording, perspective, context, glamorization, harmAcknowledgement.
`);
}

function parseCsvLine(line: string): string[] {
  // Minimal CSV parser supporting quoted cells with escaped quotes.
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trimEnd())
    .filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row: CsvRow = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = cols[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

function toNumberOrNull(v: string | undefined): number | null {
  if (v === undefined) return null;
  const s = String(v).trim();
  if (s === '' || s.toLowerCase() === 'null') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function mean(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = xs.reduce((a, b) => a + b, 0);
  return s / xs.length;
}

function varianceSample(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  let ss = 0;
  for (const x of xs) ss += (x - m) * (x - m);
  return ss / (xs.length - 1);
}

/**
 * Cronbach's alpha
 * Items = dimensions. Observations = units (songId+substanceCategory).
 * Requires complete cases across all items.
 */
function cronbachAlpha(matrix: number[][]): number | null {
  // matrix shape N x k
  const n = matrix.length;
  if (n < 2) return null;
  const k = matrix[0]?.length ?? 0;
  if (k < 2) return null;

  // Variance per item
  const itemVars: number[] = [];
  for (let j = 0; j < k; j++) {
    const col: number[] = [];
    for (let i = 0; i < n; i++) col.push(matrix[i][j]);
    const v = varianceSample(col);
    if (v === null) return null;
    itemVars.push(v);
  }

  // Variance of total score
  const totals = matrix.map(row => row.reduce((a, b) => a + b, 0));
  const totalVar = varianceSample(totals);
  if (totalVar === null || totalVar === 0) return null;

  const sumItemVars = itemVars.reduce((a, b) => a + b, 0);
  return (k / (k - 1)) * (1 - sumItemVars / totalVar);
}

/**
 * Krippendorff's alpha for interval data.
 * Input: units -> list of ratings (numbers).
 */
function krippendorffAlphaInterval(units: Map<string, number[]>): { alpha: number | null; Do: number | null; De: number | null; nUnits: number; nValues: number } {
  // Observed disagreement Do
  // For each unit with m>=2: average pairwise squared difference.
  let DoSum = 0;
  let DoWeight = 0;
  let nValues = 0;

  for (const vals of units.values()) {
    const xs = vals.filter(v => Number.isFinite(v));
    nValues += xs.length;
    const m = xs.length;
    if (m < 2) continue;

    // Sum over unordered pairs
    let pairSum = 0;
    let pairs = 0;
    for (let i = 0; i < m; i++) {
      for (let j = i + 1; j < m; j++) {
        const d = xs[i] - xs[j];
        pairSum += d * d;
        pairs++;
      }
    }
    if (pairs > 0) {
      DoSum += pairSum;
      DoWeight += pairs;
    }
  }

  const Do = DoWeight > 0 ? DoSum / DoWeight : null;

  // Expected disagreement De
  // Based on distribution of all values: average squared difference over all unordered pairs.
  const all: number[] = [];
  for (const xs of units.values()) {
    for (const x of xs) if (Number.isFinite(x)) all.push(x);
  }

  const N = all.length;
  const nUnits = units.size;
  if (N < 2) return { alpha: null, Do, De: null, nUnits, nValues };

  let DeSum = 0;
  let DePairs = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d = all[i] - all[j];
      DeSum += d * d;
      DePairs++;
    }
  }

  const De = DePairs > 0 ? DeSum / DePairs : null;

  if (Do === null || De === null || De === 0) {
    return { alpha: null, Do, De, nUnits, nValues };
  }

  const alpha = 1 - Do / De;
  return { alpha, Do, De, nUnits, nValues };
}

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }
  const input = getArg('--input') ?? 'goldenSetRated_withoutLyrics.csv';
  const groupBy = getArg('--groupBy') ?? 'song+category';
  const raterKey = getArg('--raterKey') ?? 'ratingId';
  const debugDim = (getArg('--debugDim') ?? 'wording') as Dimension;
  const topDisagreements = Number(getArg('--topDisagreements') ?? '10');

  const inputPath = path.resolve(process.cwd(), input);
  const raw = await fs.readFile(inputPath, 'utf8');
  const rows = parseCsv(raw);
  if (!rows.length) {
    console.error('No rows parsed.');
    process.exitCode = 2;
    return;
  }

  // Detect duplicated `id` column name by renaming headers on the fly:
  // This CSV has `id` twice (song id and rating id). Our parser keeps the last one.
  // Workaround: re-parse header to keep both ids.
  // We do a small, targeted re-parse here.
  const header = parseCsvLine(raw.split(/\r?\n/)[0]);
  const idIdxs = header.map((h, i) => ({ h, i })).filter(x => x.h === 'id').map(x => x.i);
  if (idIdxs.length >= 2) {
    // Re-parse with disambiguated header
    const fixedHeader = header.slice();
    fixedHeader[idIdxs[0]] = 'songId';
    fixedHeader[idIdxs[1]] = 'ratingId';

    const lines = raw
      .split(/\r?\n/)
      .map(l => l.trimEnd())
      .filter(l => l.length > 0);

    const fixedRows: CsvRow[] = [];
    for (let li = 1; li < lines.length; li++) {
      const cols = parseCsvLine(lines[li]);
      const row: CsvRow = {};
      for (let j = 0; j < fixedHeader.length; j++) {
        row[fixedHeader[j]] = cols[j] ?? '';
      }
      fixedRows.push(row);
    }

    // replace
    rows.length = 0;
    rows.push(...fixedRows);
  } else {
    // If only one id, treat it as songId for grouping.
    for (const r of rows) {
      if (!('songId' in r) && 'id' in r) (r as any).songId = r.id;
    }
  }

  // Build unit key
  const unitKey = (r: CsvRow) => {
    const songId = (r.songId ?? r.id ?? '').trim();
    const cat = (r.substanceCategory ?? '').trim();
    if (groupBy === 'song') return songId;
    // default: song+category
    return `${songId}::${cat}`;
  };

  // Pick rater id
  const getRater = (r: CsvRow): string => {
    if (raterKey === 'model') return (r.model ?? '').trim();
    return (r.ratingId ?? r.id ?? '').trim();
  };

  // Krippendorff per dimension
  const resultsKripp: Record<Dimension, ReturnType<typeof krippendorffAlphaInterval>> = {} as any;
  for (const dim of DIMENSIONS) {
    const units = new Map<string, number[]>();
    const seen = new Set<string>();

    for (const r of rows) {
      const u = unitKey(r);
      const rater = getRater(r);
      const v = toNumberOrNull(r[dim]);
      if (!u || !rater || v === null) continue;

      // Avoid duplicate rater entries per unit (keep first)
      const key = `${u}@@${rater}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!units.has(u)) units.set(u, []);
      units.get(u)!.push(v);
    }

    resultsKripp[dim] = krippendorffAlphaInterval(units);
  }

  // Diagnostic: show units with largest disagreement for a chosen dimension
  const disagreementUnits = new Map<string, number[]>();
  const seenDebug = new Set<string>();
  for (const r of rows) {
    const u = unitKey(r);
    const rater = getRater(r);
    const v = toNumberOrNull(r[debugDim]);
    if (!u || !rater || v === null) continue;
    const key = `${u}@@${rater}`;
    if (seenDebug.has(key)) continue;
    seenDebug.add(key);
    if (!disagreementUnits.has(u)) disagreementUnits.set(u, []);
    disagreementUnits.get(u)!.push(v);
  }

  const disagreementRanking = Array.from(disagreementUnits.entries())
    .map(([u, vals]) => {
      const xs = vals.slice().sort((a, b) => a - b);
      const range = xs.length ? xs[xs.length - 1] - xs[0] : 0;
      const sd = stddevSample(xs) ?? 0;
      return { unit: u, n: xs.length, range, sd, values: xs };
    })
    .filter(x => x.n >= 2)
    .sort((a, b) => (b.range - a.range) || (b.sd - a.sd));

  // Cronbach alpha per unit: average across raters within unit/category to get one vector per unit.
  const byUnit = new Map<string, { sums: Partial<Record<Dimension, number>>; counts: Partial<Record<Dimension, number>> }>();
  for (const r of rows) {
    const u = unitKey(r);
    if (!u) continue;
    if (!byUnit.has(u)) byUnit.set(u, { sums: {}, counts: {} });
    const agg = byUnit.get(u)!;
    for (const d of DIMENSIONS) {
      const v = toNumberOrNull(r[d]);
      if (v === null) continue;
      agg.sums[d] = (agg.sums[d] ?? 0) + v;
      agg.counts[d] = (agg.counts[d] ?? 0) + 1;
    }
  }

  const matrix: number[][] = [];
  for (const agg of byUnit.values()) {
    const row: number[] = [];
    let complete = true;
    for (const d of DIMENSIONS) {
      const c = agg.counts[d] ?? 0;
      if (c === 0) {
        complete = false;
        break;
      }
      row.push((agg.sums[d] ?? 0) / c);
    }
    if (complete) matrix.push(row);
  }

  const alphaCronbach = cronbachAlpha(matrix);

  // Output
  console.log('=== Reliability metrics ===');
  console.log(`Input: ${inputPath}`);
  console.log(`Grouping (units): ${groupBy} (default song+category)`);
  console.log(`Rater key for Krippendorff: ${raterKey} (ratingId|model)`);
  console.log('');

  console.log('Cronbach\'s alpha (across dimensions; unit means across raters):');
  console.log(`  units_used=${matrix.length} | alpha=${alphaCronbach === null ? 'n/a' : alphaCronbach.toFixed(4)}`);
  console.log('');

  console.log('Krippendorff\'s alpha (interval; per dimension):');
  for (const d of DIMENSIONS) {
    const r = resultsKripp[d];
    const a = r.alpha === null ? 'n/a' : r.alpha.toFixed(4);
    const Do = r.Do === null ? 'n/a' : r.Do.toFixed(4);
    const De = r.De === null ? 'n/a' : r.De.toFixed(4);
    console.log(`  ${d}: alpha=${a} | Do=${Do} | De=${De} | units=${r.nUnits} | values=${r.nValues}`);
  }

  console.log('');
  console.log(`Top ${Number.isFinite(topDisagreements) ? topDisagreements : 10} units by disagreement for ${debugDim}:`);
  if (!disagreementRanking.length) {
    console.log('  (none)');
  } else {
    disagreementRanking
      .slice(0, Number.isFinite(topDisagreements) ? topDisagreements : 10)
      .forEach((x, i) => {
        console.log(
          `  ${i + 1}. unit=${x.unit} | n=${x.n} | range=${x.range.toFixed(2)} | sd=${x.sd.toFixed(3)} | values=[${x.values.join(', ')}]`
        );
      });
  }

  // Helpful warning: duplicate id headers
  const hasSongId = rows.some(r => 'songId' in r);
  const hasRatingId = rows.some(r => 'ratingId' in r);
  if (!hasSongId || !hasRatingId) {
    console.log('');
    console.log('Note: CSV header contained only one "id" column (or could not disambiguate).');
    console.log('      If your CSV contains both Song.id and SubstanceRating.id, ensure both exist and are named distinctly.');
  }
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
