import csv from 'csv-parser'
import fs from 'fs'
import path from 'path'
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'


const inputData = [];
fs.createReadStream('ergebnisse.csv')
  .pipe(csv())
  .on('data', (data) => inputData.push(data))
  .on('end', () => {
    
    for (var i in inputData) {
      const music = {"genres": [], "artists": [], "songs": []};
      const splitMusic = inputData[i].MUSIK.split('; ');
      for (var j in splitMusic) {
        if (splitMusic[j].startsWith('a:')) {
        music.artists.push(splitMusic[j].substring(2));
        } else if (splitMusic[j].startsWith('g:')) {
        music.genres.push(splitMusic[j].substring(2));
        } else if (splitMusic[j].startsWith('a-s:')) {
        music.artists.push(splitMusic[j].substring(4).split(' - ')[0]);
        music.songs.push(splitMusic[j].substring(4));

        }
      }
      inputData[i].MUSIK = music;
    }
    const musicStats = calculateMusicStatistics(inputData);
    const participationRates = calculateParticipationRates(inputData);
    const itemStats = calculateItemStatistics(inputData);
    const itemCorrelations = calculateItemCorrelations(inputData);
    const significantFindings = extractSignificantFindings({ itemStats, itemCorrelations });
    // Pretty overall report (keeps console output readable)
    printOverallFindingsReport({
      musicStats,
      participationRates,
      itemStats,
      itemCorrelations,
      significantFindings
    });

    // Generate plots for the most significant findings
    generatePlotsForSignificantFindings({
      data: inputData,
      itemStats,
      itemCorrelations,
      findings: significantFindings,
      outDir: path.resolve('plots')
    }).catch(err => {
      console.error('Plot generation failed:', err);
    });
  });



function calculateMusicStatistics(data) {
  const stats = {
    totalEntries: data.length,
    genreCount: {},
    artistCount: {},
    songCount: {}
  };

  data.forEach(entry => {
    entry.MUSIK.genres.forEach(genre => {
      stats.genreCount[genre] = (stats.genreCount[genre] || 0) + 1;
    });
    entry.MUSIK.artists.forEach(artist => {
      stats.artistCount[artist] = (stats.artistCount[artist] || 0) + 1;
    });
    entry.MUSIK.songs.forEach(song => {
      stats.songCount[song] = (stats.songCount[song] || 0) + 1;
    });
  });

  return stats;
}
function calculateParticipationRates(data) {
  const stats = {
    totalEntries: data.length,
    ageRangeMin: null,
    ageRangeMax: null,
    genderCount: {},
    meanAge: null,
    meanAgeByGender: {},
    medianAge: null,
    medianAgeByGender: {}
    
  };

  const normalizedGender = (g) => {
    if (!g) return null;
    const s = String(g).trim();
    // Exclude tiny / not-usable groups for any gender-based analysis.
    if (s === '(kA)' || s === 'kA' || s === 'KA') return null;
    if (s === 'nb') return null;
    return s;
  };

  data.forEach(entry => {
    const age = parseInt(entry.AGE, 10);
    if (!isNaN(age)) {
      if (stats.ageRangeMin === null || age < stats.ageRangeMin) {
        stats.ageRangeMin = age;
      }
      if (stats.ageRangeMax === null || age > stats.ageRangeMax) {
        stats.ageRangeMax = age;
      }
    }
    const gender = normalizedGender(entry.GENDER);
    if (gender) {
      stats.genderCount[gender] = (stats.genderCount[gender] || 0) + 1;
    }
  });

  // Calculate mean age
  const totalAge = data.reduce((sum, entry) => {
    const age = parseInt(entry.AGE, 10);
    return !isNaN(age) ? sum + age : sum;
  }, 0);
  const validAgeCount = data.reduce((count, entry) => {
    const age = parseInt(entry.AGE, 10);
    return !isNaN(age) ? count + 1 : count;
  }, 0);
  stats.meanAge = validAgeCount > 0 ? (totalAge / validAgeCount).toFixed(3) : null;

  // Calculate mean age by gender
  const ageByGender = {};
  const countByGender = {};
  data.forEach(entry => {
    const age = parseInt(entry.AGE, 10);
    const gender = normalizedGender(entry.GENDER);
    if (!isNaN(age) && gender) {
      ageByGender[gender] = (ageByGender[gender] || 0) + age;
      countByGender[gender] = (countByGender[gender] || 0) + 1;
    }
  });
  for (const gender in ageByGender) {
    stats.meanAgeByGender[gender] = ageByGender[gender] / countByGender[gender];
  }

  // Calculate median age
  const ages = data
    .map(entry => parseInt(entry.AGE, 10))
    .filter(age => !isNaN(age))
    .sort((a, b) => a - b);
  if (ages.length === 0) {
    stats.medianAge = null;
  } else {
    // Textbook median: for even n, average the two middle values.
    const mid = Math.floor(ages.length / 2);
    stats.medianAge = ages.length % 2 !== 0 ? ages[mid] : (ages[mid - 1] + ages[mid]) / 2;
  }

  // Calculate median age by gender
  const agesByGender = {};
  data.forEach(entry => {
    const age = parseInt(entry.AGE, 10);
    const gender = normalizedGender(entry.GENDER);
    if (!isNaN(age) && gender) {
      if (!agesByGender[gender]) {
        agesByGender[gender] = [];
      }
      agesByGender[gender].push(age);
    }
  });
  for (const gender in agesByGender) {
    const sortedAges = agesByGender[gender].sort((a, b) => a - b);
    if (sortedAges.length === 0) {
      stats.medianAgeByGender[gender] = null;
      continue;
    }
    // Textbook median: for even n, average the two middle values.
    const mid = Math.floor(sortedAges.length / 2);
    stats.medianAgeByGender[gender] = sortedAges.length % 2 !== 0
      ? sortedAges[mid]
      : (sortedAges[mid - 1] + sortedAges[mid]) / 2;
  }

  return stats;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value).trim();
  if (s === '') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function median(values) {
  const arr = values.filter(v => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function mean(values) {
  const arr = values.filter(v => Number.isFinite(v));
  if (arr.length === 0) return null;
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

function getNumericQuestionKeys(row) {
  // Heuristic: include all numeric-looking fields except known demographics and non-question fields.
  // Note: `id` is excluded even though it is numeric.
  const exclude = new Set(['id', 'AGE', 'GENDER', 'MUSIK', 'Tabellenname']);
  return Object.keys(row)
    .filter(k => !exclude.has(k))
    // Only treat survey/question columns as items to avoid accidental numeric columns.
    .filter(k => /^[A-Z]\d+\[/.test(k))
    .filter(k => {
      const v = toNumber(row[k]);
      return v !== null;
    });
}

function calculateItemStatistics(data) {
  const firstRow = data.find(r => r && typeof r === 'object');
  if (!firstRow) return { keys: [] };

  const keys = Array.from(
    new Set(
      data.flatMap(row => getNumericQuestionKeys(row))
    )
  ).sort();

  const genders = Array.from(
    new Set(
      data
        .map(r => r.GENDER)
        .filter(g => {
          const s = g ? String(g).trim() : '';
          return s && s !== '(kA)' && s !== 'nb';
        })
    )
  ).sort();

  const global = {};
  const byGender = {};
  for (const g of genders) byGender[g] = {};

  for (const key of keys) {
    const values = data.map(r => toNumber(r[key])).filter(v => v !== null);
    global[key] = {
      n: values.length,
      mean: mean(values),
      median: median(values)
    };

    for (const g of genders) {
      const gValues = data
        .filter(r => r.GENDER === g)
        .map(r => toNumber(r[key]))
        .filter(v => v !== null);
      byGender[g][key] = {
        n: gValues.length,
        mean: mean(gValues),
        median: median(gValues)
      };
    }
  }

  return { keys, global, byGender };
}

function pearsonCorrelation(x, y) {
  // Returns Pearson r for paired arrays x,y.
  if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return null;
  const pairs = [];
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = y[i];
    if (Number.isFinite(xi) && Number.isFinite(yi)) pairs.push([xi, yi]);
  }
  if (pairs.length < 2) return null;
  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < pairs.length; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

function correlationRatioEtaSquared(categories, values) {
  // Eta-squared for categorical categories vs numeric values.
  if (!Array.isArray(categories) || !Array.isArray(values) || categories.length !== values.length) return null;
  const grouped = new Map();
  const ys = [];
  for (let i = 0; i < categories.length; i++) {
    const c = categories[i];
    const y = values[i];
    if (!c || !Number.isFinite(y)) continue;
    ys.push(y);
    if (!grouped.has(c)) grouped.set(c, []);
    grouped.get(c).push(y);
  }
  if (ys.length < 2 || grouped.size < 2) return null;
  const grandMean = mean(ys);
  let ssBetween = 0;
  let ssTotal = 0;
  for (const y of ys) {
    ssTotal += (y - grandMean) * (y - grandMean);
  }
  for (const [c, vals] of grouped.entries()) {
    const m = mean(vals);
    ssBetween += vals.length * (m - grandMean) * (m - grandMean);
  }
  if (ssTotal === 0) return null;
  return ssBetween / ssTotal;
}

function calculateItemCorrelations(data) {
  const keys = Array.from(
    new Set(data.flatMap(row => getNumericQuestionKeys(row)))
  ).sort();

  const global = {};
  const byGender = {};
  const genders = Array.from(
    new Set(
      data
        .map(r => r.GENDER)
        .filter(g => {
          const s = g ? String(g).trim() : '';
          return s && s !== '(kA)' && s !== 'nb';
        })
    )
  ).sort();
  for (const g of genders) byGender[g] = {};

  for (const key of keys) {
    const itemVals = [];
    const ages = [];
    const genderCats = [];
    data.forEach(r => {
      const v = toNumber(r[key]);
      const a = toNumber(r.AGE);
      const g = r.GENDER && !['(kA)', 'nb'].includes(String(r.GENDER).trim()) ? r.GENDER : null;
      // Keep arrays aligned; correlation helpers will filter invalid pairs consistently.
      itemVals.push(v);
      ages.push(a);
      genderCats.push(g);
    });

    global[key] = {
      n: itemVals.filter(v => v !== null).length,
      r_age: pearsonCorrelation(itemVals, ages),
      eta2_gender: correlationRatioEtaSquared(genderCats, itemVals)
    };

    // Correlation to age within each gender (gender is constant within the group)
    for (const g of genders) {
      const gItem = [];
      const gAge = [];
      data
        .filter(r => r.GENDER === g)
        .forEach(r => {
          gItem.push(toNumber(r[key]));
          gAge.push(toNumber(r.AGE));
        });
      byGender[g][key] = {
        n: gItem.filter(v => v !== null).length,
        r_age: pearsonCorrelation(gItem, gAge)
      };
    }
  }

  return { keys, global, byGender };
}

function formatNumber(value, digits = 3) {
  if (value === null || value === undefined) return 'n/a';
  if (!Number.isFinite(value)) return 'n/a';
  return value.toFixed(digits);
}

function printOverallFindingsReport({ musicStats, participationRates, itemStats, itemCorrelations, significantFindings }) {
  console.log('\n==============================');
  console.log(' UniSuchtprävention — Findings');
  console.log('==============================\n');

  // Basic sample meta
  const n = participationRates?.totalEntries ?? 'n/a';
  const ageMin = participationRates?.ageRangeMin ?? 'n/a';
  const ageMax = participationRates?.ageRangeMax ?? 'n/a';
  const meanAge = participationRates?.meanAge ?? 'n/a';
  const medianAge = participationRates?.medianAge ?? 'n/a';

  console.log('## Sample');
  console.log(`n = ${n}`);
  console.log(`Age range = ${ageMin}–${ageMax}`);
  console.log(`Age mean = ${meanAge} | Age median = ${medianAge}`);

  const genderCount = participationRates?.genderCount || {};
  const genders = Object.keys(genderCount).sort();
  if (genders.length) {
    console.log('Gender counts:');
    for (const g of genders) {
      console.log(`  - ${g}: ${genderCount[g]}`);
    }
  }

  // Music meta (small and helpful)
  if (musicStats) {
    console.log('\n## Music (overview)');
    console.log(`Unique genres: ${Object.keys(musicStats.genreCount || {}).length}`);
    console.log(`Unique artists: ${Object.keys(musicStats.artistCount || {}).length}`);
    console.log(`Unique songs: ${Object.keys(musicStats.songCount || {}).length}`);
  }

  // Questionnaire items
  console.log('\n## Questionnaire items');
  console.log(`Numeric item columns detected: ${itemStats?.keys?.length ?? 0}`);

  // Full (unfiltered) rankings
  console.log('\n## All findings (unfiltered)');
  const allKeys = itemCorrelations?.keys || [];
  const globalCorr = itemCorrelations?.global || {};

  const allAge = allKeys
    .map(k => ({ item: k, n: globalCorr?.[k]?.n ?? 0, r_age: globalCorr?.[k]?.r_age }))
    .filter(x => Number.isFinite(x.r_age))
    .sort((a, b) => Math.abs(b.r_age) - Math.abs(a.r_age));

  console.log('\nCorrelations with age (all items, sorted by |r|):');
  if (!allAge.length) {
    console.log('  (none)');
  } else {
    allAge.forEach((f, idx) => {
      const sign = f.r_age >= 0 ? '+' : '';
      console.log(`  ${idx + 1}. ${f.item} | n=${f.n} | r_age=${sign}${formatNumber(f.r_age)}`);
    });
  }

  const allGender = allKeys
    .map(k => ({ item: k, n: globalCorr?.[k]?.n ?? 0, eta2_gender: globalCorr?.[k]?.eta2_gender }))
    .filter(x => Number.isFinite(x.eta2_gender))
    .sort((a, b) => b.eta2_gender - a.eta2_gender);

  console.log('\nGender effects (eta², all items, sorted desc):');
  if (!allGender.length) {
    console.log('  (none)');
  } else {
    allGender.forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.item} | n=${f.n} | eta²_gender=${formatNumber(f.eta2_gender)}`);
    });
  }

  // Significant findings
  console.log('\n## Significant findings (filtered)');
  if (significantFindings?.thresholds) {
    const t = significantFindings.thresholds;
    console.log(`Thresholds: minN>=${t.minN}, |r_age|>=${t.minAbsR}, eta²_gender>=${t.minEta2}`);
  }

  const topAge = significantFindings?.strongestAgeCorrelations || [];
  console.log('\nTop correlations with age:');
  if (!topAge.length) {
    console.log('  (none)');
  } else {
    topAge.slice(0, 10).forEach((f, idx) => {
      const sign = f.r_age >= 0 ? '+' : '';
      console.log(`  ${idx + 1}. ${f.item} | n=${f.n} | r_age=${sign}${formatNumber(f.r_age)}`);
    });
  }

  const topGender = significantFindings?.strongestGenderEffects || [];
  console.log('\nTop effects by gender (eta²):');
  if (!topGender.length) {
    console.log('  (none)');
  } else {
    topGender.slice(0, 10).forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.item} | n=${f.n} | eta²_gender=${formatNumber(f.eta2_gender)}`);
    });
  }

  // Optional small appendix: per-gender age correlation winners
  const byG = significantFindings?.byGenderAgeCorrelations || {};
  const gKeys = Object.keys(byG);
  if (gKeys.length) {
    console.log('\nStrongest age correlations within gender (top 3 each):');
    for (const g of gKeys) {
      const rows = byG[g] || [];
      if (!rows.length) continue;
      console.log(`  ${g}:`);
      rows.slice(0, 3).forEach((f, idx) => {
        const sign = f.r_age >= 0 ? '+' : '';
        console.log(`    ${idx + 1}. ${f.item} | n=${f.n} | r_age=${sign}${formatNumber(f.r_age)}`);
      });
    }
  }

  // Where plots will be
  console.log('\n## Plots');
  console.log('PNG plots are written to: src/tools/plots');

  // If you still want the raw objects, uncomment these:
  // console.log('Participation Rates (raw):', participationRates);
  // console.log('Item Correlations (raw):', itemCorrelations);
}

function extractSignificantFindings(
  { itemStats, itemCorrelations },
  options = {}
) {
  const opts = {
    minN: 8,
    minAbsR: 0.35,
    minEta2: 0.10,
    topK: 20,
    ...options
  };

  const findings = {
    thresholds: opts,
    strongestAgeCorrelations: [],
    strongestGenderEffects: [],
    byGenderAgeCorrelations: {}
  };

  const keys = itemCorrelations?.keys || [];
  const global = itemCorrelations?.global || {};
  const byGender = itemCorrelations?.byGender || {};

  // Global correlations to age
  for (const key of keys) {
    const entry = global[key];
    if (!entry) continue;
    const n = entry.n ?? 0;
    const r = entry.r_age;
    if (n >= opts.minN && Number.isFinite(r) && Math.abs(r) >= opts.minAbsR) {
      findings.strongestAgeCorrelations.push({
        item: key,
        n,
        r_age: r
      });
    }
  }
  findings.strongestAgeCorrelations.sort((a, b) => Math.abs(b.r_age) - Math.abs(a.r_age));
  findings.strongestAgeCorrelations = findings.strongestAgeCorrelations.slice(0, opts.topK);

  // Global effect of gender on item (eta^2)
  for (const key of keys) {
    const entry = global[key];
    if (!entry) continue;
    const n = entry.n ?? 0;
    const eta2 = entry.eta2_gender;
    if (n >= opts.minN && Number.isFinite(eta2) && eta2 >= opts.minEta2) {
      findings.strongestGenderEffects.push({
        item: key,
        n,
        eta2_gender: eta2
      });
    }
  }
  findings.strongestGenderEffects.sort((a, b) => b.eta2_gender - a.eta2_gender);
  findings.strongestGenderEffects = findings.strongestGenderEffects.slice(0, opts.topK);

  // Age correlations within each gender
  for (const g of Object.keys(byGender)) {
    const gMap = byGender[g] || {};
    const list = [];
    for (const key of keys) {
      const entry = gMap[key];
      if (!entry) continue;
      const n = entry.n ?? 0;
      const r = entry.r_age;
      if (n >= Math.max(3, Math.floor(opts.minN / 2)) && Number.isFinite(r) && Math.abs(r) >= opts.minAbsR) {
        list.push({ item: key, n, r_age: r });
      }
    }
    list.sort((a, b) => Math.abs(b.r_age) - Math.abs(a.r_age));
    findings.byGenderAgeCorrelations[g] = list.slice(0, opts.topK);
  }

  // Optional: also return quick descriptive deltas per gender (mean differences)
  // This intentionally stays simple: users can inspect full `itemStats` for details.
  findings.meta = {
    itemCount: itemStats?.keys?.length ?? keys.length,
    genders: Object.keys(byGender)
  };

  return findings;
}

function printSignificantFindings(findings) {
  if (!findings) return;
  const t = findings.thresholds;
  console.log('\n=== Significant findings (filtered) ===');
  console.log(`Thresholds: minN>=${t.minN}, |r_age|>=${t.minAbsR}, eta²_gender>=${t.minEta2}, topK=${t.topK}`);

  console.log('\n-- Strongest correlations with AGE (global) --');
  if (!findings.strongestAgeCorrelations.length) {
    console.log('  (none)');
  } else {
    findings.strongestAgeCorrelations.forEach((f, idx) => {
      const sign = f.r_age >= 0 ? '+' : '';
      console.log(`  ${idx + 1}. ${f.item} | n=${f.n} | r_age=${sign}${formatNumber(f.r_age)}`);
    });
  }

  console.log('\n-- Strongest effects of GENDER on item (eta², global) --');
  if (!findings.strongestGenderEffects.length) {
    console.log('  (none)');
  } else {
    findings.strongestGenderEffects.forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.item} | n=${f.n} | eta²_gender=${formatNumber(f.eta2_gender)}`);
    });
  }

  console.log('\n-- AGE correlations within each gender --');
  const byG = findings.byGenderAgeCorrelations || {};
  const genders = Object.keys(byG);
  if (!genders.length) {
    console.log('  (none)');
  } else {
    for (const g of genders) {
      console.log(`  Gender=${g}`);
      const rows = byG[g];
      if (!rows.length) {
        console.log('    (none)');
        continue;
      }
      rows.forEach((f, idx) => {
        const sign = f.r_age >= 0 ? '+' : '';
        console.log(`    ${idx + 1}. ${f.item} | n=${f.n} | r_age=${sign}${formatNumber(f.r_age)}`);
      });
    }
  }
}

function sanitizeFilename(name) {
  return String(name)
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._\-\[\]]+/g, '_');
}

function linearRegression(x, y) {
  // Returns { slope, intercept } for y = slope*x + intercept
  const pairs = [];
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = y[i];
    if (Number.isFinite(xi) && Number.isFinite(yi)) pairs.push([xi, yi]);
  }
  if (pairs.length < 2) return null;
  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < pairs.length; i++) {
    const dx = xs[i] - mx;
    num += dx * (ys[i] - my);
    den += dx * dx;
  }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = my - slope * mx;
  return { slope, intercept };
}

async function generatePlotsForSignificantFindings({ data, itemStats, itemCorrelations, findings, outDir }) {
  // NOTE: Despite the name, this now generates plots for *all* detected numeric questionnaire items.
  // (The overall report still highlights significant findings separately.)
  const itemsToPlot = Array.from(
    new Set([
      ...(itemStats?.keys || []),
      ...(itemCorrelations?.keys || [])
    ])
  ).sort();
  if (itemsToPlot.length === 0) return;

  await fs.promises.mkdir(outDir, { recursive: true });

  const width = 900;
  const height = 500;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });

  const genders = Array.from(
    new Set(
      data
        .map(r => r.GENDER)
        .filter(g => {
          const s = g ? String(g).trim() : '';
          return s && s !== '(kA)' && s !== 'nb';
        })
    )
  ).sort();
  console.log(`\n=== Plots ===`);
  console.log(`Writing plots to: ${outDir}`);

  // Optional safety cap (set to null / undefined to plot everything).
  const maxPlots = null;

  // Create combined plots for B* blocks: SQ001+SQ002 overlaid with two trend lines.
  const bGroups = new Map();
  for (const key of itemsToPlot) {
    const m = /^B(\d+)\[(SQ00[12])\]$/.exec(String(key));
    if (!m) continue;
    const group = `B${m[1]}`;
    if (!bGroups.has(group)) bGroups.set(group, new Set());
    bGroups.get(group).add(m[2]);
  }

  for (const [group, sqs] of bGroups.entries()) {
    if (!(sqs.has('SQ001') && sqs.has('SQ002'))) continue;

    const item1 = `${group}[SQ001]`;
    const item2 = `${group}[SQ002]`;
    const points1 = [];
    const points2 = [];
    for (const r of data) {
      const age = toNumber(r.AGE);
      const v1 = toNumber(r[item1]);
      const v2 = toNumber(r[item2]);
      if (Number.isFinite(age) && Number.isFinite(v1)) points1.push({ x: age, y: v1 });
      if (Number.isFinite(age) && Number.isFinite(v2)) points2.push({ x: age, y: v2 });
    }
    if (points1.length >= 2 || points2.length >= 2) {
      const makeTrend = (pts) => {
        if (!pts || pts.length < 2) return [];
        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        const lr = linearRegression(xs, ys);
        if (!lr) return [];
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        return [{ x: minX, y: lr.slope * minX + lr.intercept }, { x: maxX, y: lr.slope * maxX + lr.intercept }];
      };

      const trend1 = makeTrend(points1);
      const trend2 = makeTrend(points2);

      const r1 = itemCorrelations?.global?.[item1]?.r_age;
      const r2 = itemCorrelations?.global?.[item2]?.r_age;
      const filename = `scatter_age_${sanitizeFilename(group)}_SQ001_SQ002.png`;
      const buffer = await chartJSNodeCanvas.renderToBuffer({
        type: 'scatter',
        data: {
          datasets: [
            ...(points1.length
              ? [{
                label: `${item1} (n=${points1.length}, r=${formatNumber(r1)})`,
                data: points1,
                pointRadius: 4,
                pointHoverRadius: 5,
                backgroundColor: 'rgba(54, 162, 235, 0.65)'
              }]
              : []),
            ...(trend1.length
              ? [{
                label: `${group} SQ001 trend`,
                data: trend1,
                showLine: true,
                pointRadius: 0,
                borderWidth: 2,
                borderColor: 'rgba(54, 162, 235, 0.95)'
              }]
              : []),
            ...(points2.length
              ? [{
                label: `${item2} (n=${points2.length}, r=${formatNumber(r2)})`,
                data: points2,
                pointRadius: 4,
                pointHoverRadius: 5,
                backgroundColor: 'rgba(255, 99, 132, 0.65)'
              }]
              : []),
            ...(trend2.length
              ? [{
                label: `${group} SQ002 trend`,
                data: trend2,
                showLine: true,
                pointRadius: 0,
                borderWidth: 2,
                borderColor: 'rgba(255, 99, 132, 0.95)'
              }]
              : [])
          ]
        },
        options: {
          responsive: false,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: `Scatter: ${group} SQ001 vs SQ002 over age` }
          },
          scales: {
            x: { title: { display: true, text: 'Age' } },
            y: { title: { display: true, text: group } }
          }
        }
      });
      await fs.promises.writeFile(path.join(outDir, filename), buffer);
    }
  }

  const itemsIterable = maxPlots ? itemsToPlot.slice(0, maxPlots) : itemsToPlot;
  for (const item of itemsIterable) {
    // Scatter: item vs age
    const points = [];
    for (const r of data) {
      const age = toNumber(r.AGE);
      const v = toNumber(r[item]);
      if (Number.isFinite(age) && Number.isFinite(v)) points.push({ x: age, y: v });
    }
    if (points.length >= 2) {
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const lr = linearRegression(xs, ys);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const trend = lr
        ? [{ x: minX, y: lr.slope * minX + lr.intercept }, { x: maxX, y: lr.slope * maxX + lr.intercept }]
        : [];

      const rAge = itemCorrelations?.global?.[item]?.r_age;
      const filename = `scatter_age_${sanitizeFilename(item)}.png`;
      const buffer = await chartJSNodeCanvas.renderToBuffer({
        type: 'scatter',
        data: {
          datasets: [
            {
              label: `${item} vs AGE (n=${points.length}, r=${formatNumber(rAge)})`,
              data: points,
              pointRadius: 4,
              pointHoverRadius: 5,
              backgroundColor: 'rgba(54, 162, 235, 0.65)'
            },
            ...(trend.length
              ? [{
                label: 'Trend',
                data: trend,
                showLine: true,
                pointRadius: 0,
                borderWidth: 2,
                borderColor: 'rgba(255, 99, 132, 0.9)'
              }]
              : [])
          ]
        },
        options: {
          responsive: false,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: `Scatter: ${item} vs Age` }
          },
          scales: {
            x: { title: { display: true, text: 'Age' } },
            y: { title: { display: true, text: item } }
          }
        }
      });
      await fs.promises.writeFile(path.join(outDir, filename), buffer);
    }

  // Bar: mean by gender (with n)
    const labels = genders;
    const means = [];
    const ns = [];
    for (const g of genders) {
      const s = itemStats?.byGender?.[g]?.[item];
      means.push(s?.mean ?? null);
      ns.push(s?.n ?? 0);
    }
    const hasAny = means.some(v => Number.isFinite(v));
    if (hasAny) {
      const eta2 = itemCorrelations?.global?.[item]?.eta2_gender;
      const filename = `bar_gender_mean_${sanitizeFilename(item)}.png`;
      const meanData = means.map(v => (Number.isFinite(v) ? v : null));
      const buffer = await chartJSNodeCanvas.renderToBuffer({
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: `Mean(${item}) by gender (eta²=${formatNumber(eta2)})`,
              data: meanData,
              backgroundColor: 'rgba(153, 102, 255, 0.65)'
            }
          ]
        },
        options: {
          responsive: false,
          animation: false,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: `Group means by gender: ${item}` },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const i = ctx.dataIndex;
                  const val = ctx.raw;
                  return `mean=${formatNumber(val)} (n=${ns[i]})`;
                }
              }
            }
          },
          scales: {
            x: { title: { display: true, text: 'Gender' } },
            y: { title: { display: true, text: `Mean of ${item}` } }
          },
          // Use a plugin without extra deps to draw labels on the bars.
          plugins: [
            {
              id: 'valueLabels',
              afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const meta = chart.getDatasetMeta(0);
                ctx.save();
                ctx.font = '12px sans-serif';
                ctx.fillStyle = '#111';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                meta.data.forEach((bar, index) => {
                  const v = meanData[index];
                  const n = ns[index];
                  if (!Number.isFinite(v)) return;

                  // Place label slightly above the bar; if value is 0, nudge above baseline.
                  const y = v === 0 ? (bar.y - 6) : (bar.y - 6);
                  const label = `${formatNumber(v, 2)} (n=${n})`;
                  ctx.fillText(label, bar.x, y);
                });

                ctx.restore();
              }
            }
          ]
        }
      });
      await fs.promises.writeFile(path.join(outDir, filename), buffer);
    }
  }
}