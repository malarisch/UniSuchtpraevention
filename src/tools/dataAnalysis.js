import csv from 'csv-parser'
import fs from 'fs'
import path from 'path'
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'
import { database, logger as loggerConstructor, substanceTagger } from '@suchtModules/index'
import dotenv from "dotenv"; dotenv.config({ path: (!process.env.dotenv ? undefined : process.env.dotenv) });
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pcorrtest = require('@stdlib/stats/pcorrtest');

await database.sync();


// OHS Künstler Auswertung
// Ruft das arithmetische Mittel der OHS-Werte aller Künstler eines music Objekts ab
async function getOHSArtists(music, artistCache = null) {
  if (!music || !Array.isArray(music.artists) || music.artists.length === 0) {
    console.log ('No artists found in music object:', music);
    return null;
  };
  let ohsSum = 0;
  let count = 0;
  for (const artist of music.artists) {
    let artistData = artistCache?.get(artist);
    if (!artistData) {
      artistData = await database.Artist.findOne({ where: { name: artist } });
      if (artistCache) artistCache.set(artist, artistData);
    }
    if (!artistData || !Number.isFinite(artistData.OHS)) continue;
    ohsSum += artistData.OHS;
    count += 1;
  }
  if (count === 0) return null;
  return ohsSum / count;
}

// OHS Fragebogen Auswertung - input ist eine Line aus dem CSV
function calculteOHS_FragebogenAntwort(line) {
  const parseIntField = (key) => {
    const raw = line?.[key];
    if (raw === undefined || raw === null) return null;
    const num = Number.parseInt(String(raw).trim(), 10);
    return Number.isNaN(num) ? null : num;
  };
  const mapA = { 0: 2, 1: 1, 2: 0 };
  const mapBPos = { '-2': 0, '-1': 1, 0: 2, 1: 3, 2: 4 };
  const mapBNeg = { '-2': 4, '-1': 3, 0: 2, 1: 1, 2: 0 };
  const mapR = { 3: 0, 2: 1, 1: 2, 0: 3 };

  let score = 0;
  let missing = false;

  const addMapped = (map, key) => {
    const v = parseIntField(key);
    if (v === null || !(v in map)) {
      missing = true;
      return 0;
    }
    return map[v];
  };

  score += addMapped(mapA, 'A1[AAlk]');
  score += addMapped(mapA, 'A1[ACan]');
  score += addMapped(mapA, 'A1[AStim]');
  score += addMapped(mapA, 'A1[ASed]');
  score += addMapped(mapA, 'A1[AAna]');
  function B(i) {
    const v1 = parseIntField('B' + i + '[SQ001]');
    const v2 = parseIntField('B' + i + '[SQ002]');
    if (v1 === null || !(v1 in mapBPos)) missing = true;
    if (v2 === null || !(v2 in mapBNeg)) missing = true;
    return (v1 in mapBPos ? mapBPos[v1] : 0) + (v2 in mapBNeg ? mapBNeg[v2] : 0);
  }
  score += B('1');
  score += B('2');
  score += B('3');
  score += B('4');
  score += B('5');

  score += addMapped(mapR, 'R1[RCan]');
  score += addMapped(mapR, 'R1[RAlk]');
  score += addMapped(mapR, 'R1[RSti]');
  
  return missing ? null : score;


  
  
}


const inputData = [];
fs.createReadStream('ergebnisse.csv')
  .pipe(csv())
  .on('data', (data) => inputData.push(data))
  .on('end', async () => {
    
    try {
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
      const artistVsSurveyOhs = await correlateArtistOhsWithSurveyOhs(inputData);
      const questionnaireOhsVsAge = correlateQuestionnaireOhsWithAge(inputData);
      const musicOhsVsAge = await correlateMusicOhsWithAge(inputData);
      const significantFindings = extractSignificantFindings({ itemStats, itemCorrelations });
      const plotDir = path.resolve('plots');
      // Pretty overall report (keeps console output readable)
      printOverallFindingsReport({
        musicStats,
        participationRates,
        itemStats,
        itemCorrelations,
        significantFindings,
        artistVsSurveyOhs,
        questionnaireOhsVsAge,
        musicOhsVsAge
      });

      // Generate plots for the most significant findings
      await generatePlotsForSignificantFindings({
        data: inputData,
        itemStats,
        itemCorrelations,
        findings: significantFindings,
        outDir: plotDir
      });

      await generateOhsCorrelationPlots({
        artistCorrelation: artistVsSurveyOhs,
        questionnaireAgeCorrelation: questionnaireOhsVsAge,
        musicAgeCorrelation: musicOhsVsAge,
        outDir: plotDir
      });
      process.exit(0);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  });



function calculateMusicStatistics(data) {
  const stats = {
    totalEntries: data.length,
    genreCount: {},
    artistCount: {},
    songCount: {},
    uniqueArtistList: [],
    uniqueSongList: [],
    uniqueGenreList: []
  };

  data.forEach(entry => {
    entry.MUSIK.genres.forEach(genre => {
      stats.genreCount[genre] = (stats.genreCount[genre] || 0) + 1;
      if (!stats.uniqueGenreList.includes(genre)) {
        stats.uniqueGenreList.push(genre);
      }
    });
    entry.MUSIK.artists.forEach(artist => {
      stats.artistCount[artist] = (stats.artistCount[artist] || 0) + 1;
      if (!stats.uniqueArtistList.includes(artist)) {
        stats.uniqueArtistList.push(artist);
      }
    });
    entry.MUSIK.songs.forEach(song => {
      stats.songCount[song] = (stats.songCount[song] || 0) + 1;
      if (!stats.uniqueSongList.includes(song)) {
        stats.uniqueSongList.push(song);
      }
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


function correlationStats(xValues, yValues) {
  if (!Array.isArray(xValues) || !Array.isArray(yValues) || xValues.length !== yValues.length) {
    return { n: 0, r: null, rSquared: null, t: null, df: null, p: null, ciLower: null, ciUpper: null, meanX: null, meanY: null, medianX: null, medianY: null };
  }
  const xs = [];
  const ys = [];
  for (let i = 0; i < xValues.length; i++) {
    const xv = xValues[i];
    const yv = yValues[i];
    if (Number.isFinite(xv) && Number.isFinite(yv)) {
      xs.push(xv);
      ys.push(yv);
    }
  }
  const n = xs.length;
  if (n < 4) return { n, r: null, rSquared: null, t: null, df: null, p: null, ciLower: null, ciUpper: null, meanX: mean(xs), meanY: mean(ys), medianX: median(xs), medianY: median(ys) };
  const test = pcorrtest(xs, ys, { alpha: 0.05, alternative: 'two-sided', rho: 0 });
  const r = test?.pcorr;
  const ci = Array.isArray(test?.ci) ? { lower: test.ci[0], upper: test.ci[1] } : { lower: null, upper: null };
  const stat = test?.statistic;
  const df = n - 2;
  return {
    n,
    r,
    rSquared: Number.isFinite(r) ? r * r : null,
    t: Number.isFinite(stat) ? stat : null,
    df,
    p: Number.isFinite(test?.pValue) ? test.pValue : null,
    ciLower: ci.lower,
    ciUpper: ci.upper,
    meanX: mean(xs),
    meanY: mean(ys),
    medianX: median(xs),
    medianY: median(ys)
  };
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

async function correlateArtistOhsWithSurveyOhs(data) {
  const artistOhs = [];
  const surveyOhs = [];
  const pairs = [];
  const artistCache = new Map();
  const perGender = {
    m: { artist: [], survey: [], pairs: [] },
    w: { artist: [], survey: [], pairs: [] }
  };
  const exclusions = [];

  for (let idx = 0; idx < data.length; idx++) {
    const row = data[idx];
    const questionnaireOhs = calculteOHS_FragebogenAntwort(row);
    const music = row?.MUSIK;
    if (!music || !Array.isArray(music.artists) || music.artists.length === 0) {
      exclusions.push({ index: idx, reason: 'no artists parsed', row });
      continue;
    }
    const artistAvgOhs = await getOHSArtists(music, artistCache);
    if (!Number.isFinite(questionnaireOhs)) {
      exclusions.push({ index: idx, reason: 'invalid questionnaire OHS', row });
      continue;
    }
    if (!Number.isFinite(artistAvgOhs)) {
      exclusions.push({ index: idx, reason: 'missing artist OHS', row });
      continue;
    }
    artistOhs.push(artistAvgOhs);
    surveyOhs.push(questionnaireOhs);
    const gender = row?.GENDER ? String(row.GENDER).trim().toLowerCase() : null;
    pairs.push({ x: questionnaireOhs, y: artistAvgOhs, gender });
    if (gender === 'm' || gender === 'w') {
      perGender[gender].artist.push(artistAvgOhs);
      perGender[gender].survey.push(questionnaireOhs);
      perGender[gender].pairs.push({ x: questionnaireOhs, y: artistAvgOhs, gender });
    }
  }

  const overall = correlationStats(artistOhs, surveyOhs);
  const byGender = {
    m: correlationStats(perGender.m.artist, perGender.m.survey),
    w: correlationStats(perGender.w.artist, perGender.w.survey)
  };
  return {
    ...overall,
    byGender,
    exclusions,
    pairs,
    pairsByGender: { m: perGender.m.pairs, w: perGender.w.pairs }
  };
}

function correlateQuestionnaireOhsWithAge(data) {
  const ages = [];
  const qOhs = [];
  const pairs = [];
  const exclusions = [];
  data.forEach((row, idx) => {
    const age = toNumber(row?.AGE);
    const q = calculteOHS_FragebogenAntwort(row);
    if (!Number.isFinite(age) || !Number.isFinite(q)) {
      exclusions.push({ index: idx, reason: 'missing age or questionnaire OHS', row });
      return;
    }
    ages.push(age);
    qOhs.push(q);
    pairs.push({ x: age, y: q });
  });
  const stats = correlationStats(ages, qOhs);
  return { ...stats, pairs, exclusions };
}

async function correlateMusicOhsWithAge(data) {
  const ages = [];
  const musicOhs = [];
  const pairs = [];
  const exclusions = [];
  const artistCache = new Map();
  for (let idx = 0; idx < data.length; idx++) {
    const row = data[idx];
    const age = toNumber(row?.AGE);
    const music = row?.MUSIK;
    if (!Number.isFinite(age) || !music || !Array.isArray(music.artists) || music.artists.length === 0) {
      exclusions.push({ index: idx, reason: 'missing age or artists', row });
      continue;
    }
    const artistAvgOhs = await getOHSArtists(music, artistCache);
    if (!Number.isFinite(artistAvgOhs)) {
      exclusions.push({ index: idx, reason: 'missing artist OHS', row });
      continue;
    }
    ages.push(age);
    musicOhs.push(artistAvgOhs);
    pairs.push({ x: age, y: artistAvgOhs });
  }
  const stats = correlationStats(ages, musicOhs);
  return { ...stats, pairs, exclusions };
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

    const ageStats = correlationStats(itemVals, ages);
    global[key] = {
      n: ageStats.n,
      r_age: ageStats.r,
      p_age: ageStats.p,
      ci_age_lower: ageStats.ciLower,
      ci_age_upper: ageStats.ciUpper,
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
      const gStats = correlationStats(gItem, gAge);
      byGender[g][key] = {
        n: gStats.n,
        r_age: gStats.r,
        p_age: gStats.p,
        ci_age_lower: gStats.ciLower,
        ci_age_upper: gStats.ciUpper
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

function printOverallFindingsReport({ musicStats, participationRates, itemStats, itemCorrelations, significantFindings, artistVsSurveyOhs, questionnaireOhsVsAge, musicOhsVsAge }) {
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

    console.log('Unique genres list:');
    console.log(`  ${musicStats.uniqueGenreList.join('; ')}`);
    console.log('Unique artists list:');
    console.log(`  ${musicStats.uniqueArtistList.join('; ')}`);
  console.log('Unique songs list:');
  console.log(`  ${musicStats.uniqueSongList.join('; ')}`);
  }

  if (artistVsSurveyOhs) {
    console.log('\n## OHS correlation (artists listened vs questionnaire)');
    const printCorr = (label, stats) => {
      const n = stats?.n ?? 0;
      const r = stats?.r;
      const p = stats?.p;
      const t = stats?.t;
      const df = stats?.df;
      const r2 = stats?.rSquared;
      const ciL = stats?.ciLower;
      const ciU = stats?.ciUpper;
      if (!n || !Number.isFinite(r)) {
        console.log(`  ${label}: Not enough paired OHS data.`);
        return;
      }
      const meanX = Number.isFinite(stats?.meanX) ? formatNumber(stats.meanX) : 'n/a';
      const meanY = Number.isFinite(stats?.meanY) ? formatNumber(stats.meanY) : 'n/a';
      const medX = Number.isFinite(stats?.medianX) ? formatNumber(stats.medianX) : 'n/a';
      const medY = Number.isFinite(stats?.medianY) ? formatNumber(stats.medianY) : 'n/a';
      const sign = r >= 0 ? '+' : '';
      const pStr = Number.isFinite(p) ? formatNumber(p, 4) : 'n/a';
      const tStr = Number.isFinite(t) && Number.isFinite(df) ? ` | t(${df})=${formatNumber(t)}` : '';
      const r2Str = Number.isFinite(r2) ? ` | r²=${formatNumber(r2)}` : '';
      const ciStr = Number.isFinite(ciL) && Number.isFinite(ciU)
        ? ` | 95% CI [${formatNumber(ciL)}, ${formatNumber(ciU)}]`
        : '';
      console.log(`  ${label}: n=${n} | r=${sign}${formatNumber(r)}${r2Str}${tStr} | p=${pStr}${ciStr} | meanX=${meanX} | meanY=${meanY} | medianX=${medX} | medianY=${medY}`);
    };

    printCorr('Gesamt', artistVsSurveyOhs);
    if (artistVsSurveyOhs.byGender) {
      printCorr('m', artistVsSurveyOhs.byGender.m);
      printCorr('w', artistVsSurveyOhs.byGender.w);
    }
    if (Array.isArray(artistVsSurveyOhs.exclusions) && artistVsSurveyOhs.exclusions.length) {
      console.log('  Ausgeschlossene Datensätze (OHS-Korrelation):');
      artistVsSurveyOhs.exclusions.slice(0, 10).forEach((ex) => {
        const gender = ex.row?.GENDER ?? '';
        const musicRaw = ex.row?.MUSIK_RAW ?? ex.row?.MUSIK ?? '';
        console.log(`    idx=${ex.index} | reason=${ex.reason} | gender=${gender} | music=${JSON.stringify(musicRaw)}`);
      });
      if (artistVsSurveyOhs.exclusions.length > 10) {
        console.log(`    ... ${artistVsSurveyOhs.exclusions.length - 10} weitere`);
      }
    }
  }

  if (questionnaireOhsVsAge) {
    console.log('\n## OHS (Fragebogen) vs Age');
    const stats = questionnaireOhsVsAge;
    const n = stats?.n ?? 0;
    const r = stats?.r;
    const p = stats?.p;
    const r2 = stats?.rSquared;
    const t = stats?.t;
    const df = stats?.df;
    const ciL = stats?.ciLower;
    const ciU = stats?.ciUpper;
    const meanOhs = Number.isFinite(stats?.meanY) ? formatNumber(stats.meanY) : 'n/a';
    const medOhs = Number.isFinite(stats?.medianY) ? formatNumber(stats.medianY) : 'n/a';
    if (!n || !Number.isFinite(r)) {
      console.log('  Not enough data to compute correlation.');
    } else {
      const sign = r >= 0 ? '+' : '';
      const pStr = Number.isFinite(p) ? formatNumber(p, 4) : 'n/a';
      const tStr = Number.isFinite(t) && Number.isFinite(df) ? ` | t(${df})=${formatNumber(t)}` : '';
      const r2Str = Number.isFinite(r2) ? ` | r²=${formatNumber(r2)}` : '';
      const ciStr = Number.isFinite(ciL) && Number.isFinite(ciU)
        ? ` | 95% CI [${formatNumber(ciL)}, ${formatNumber(ciU)}]`
        : '';
      console.log(`  n=${n} | r=${sign}${formatNumber(r)}${r2Str}${tStr} | p=${pStr}${ciStr} | mean(OHS)=${meanOhs} | median(OHS)=${medOhs}`);
    }
  }

  if (musicOhsVsAge) {
    console.log('\n## OHS (gehört, Artist-Avg) vs Age');
    const stats = musicOhsVsAge;
    const n = stats?.n ?? 0;
    const r = stats?.r;
    const p = stats?.p;
    const r2 = stats?.rSquared;
    const t = stats?.t;
    const df = stats?.df;
    const ciL = stats?.ciLower;
    const ciU = stats?.ciUpper;
    const meanOhs = Number.isFinite(stats?.meanY) ? formatNumber(stats.meanY) : 'n/a';
    const medOhs = Number.isFinite(stats?.medianY) ? formatNumber(stats.medianY) : 'n/a';
    if (!n || !Number.isFinite(r)) {
      console.log('  Not enough data to compute correlation.');
    } else {
      const sign = r >= 0 ? '+' : '';
      const pStr = Number.isFinite(p) ? formatNumber(p, 4) : 'n/a';
      const tStr = Number.isFinite(t) && Number.isFinite(df) ? ` | t(${df})=${formatNumber(t)}` : '';
      const r2Str = Number.isFinite(r2) ? ` | r²=${formatNumber(r2)}` : '';
      const ciStr = Number.isFinite(ciL) && Number.isFinite(ciU)
        ? ` | 95% CI [${formatNumber(ciL)}, ${formatNumber(ciU)}]`
        : '';
      console.log(`  n=${n} | r=${sign}${formatNumber(r)}${r2Str}${tStr} | p=${pStr}${ciStr} | mean(OHS)=${meanOhs} | median(OHS)=${medOhs}`);
    }
  }

  // Questionnaire items
  console.log('\n## Questionnaire items');
  console.log(`Numeric item columns detected: ${itemStats?.keys?.length ?? 0}`);

  // Full (unfiltered) rankings
  console.log('\n## All findings (unfiltered)');
  const allKeys = itemCorrelations?.keys || [];
  const globalCorr = itemCorrelations?.global || {};

  const allAge = allKeys
    .map(k => ({
      item: k,
      n: globalCorr?.[k]?.n ?? 0,
      r_age: globalCorr?.[k]?.r_age,
      p_age: globalCorr?.[k]?.p_age,
      ciL: globalCorr?.[k]?.ci_age_lower,
      ciU: globalCorr?.[k]?.ci_age_upper
    }))
    .filter(x => Number.isFinite(x.r_age))
    .sort((a, b) => Math.abs(b.r_age) - Math.abs(a.r_age));

  console.log('\nCorrelations with age (all items, sorted by |r|):');
  if (!allAge.length) {
    console.log('  (none)');
  } else {
    allAge.forEach((f, idx) => {
      const sign = f.r_age >= 0 ? '+' : '';
      const pStr = Number.isFinite(f.p_age) ? ` | p=${formatNumber(f.p_age, 4)}` : '';
      const ciStr = Number.isFinite(f.ciL) && Number.isFinite(f.ciU) ? ` | 95% CI [${formatNumber(f.ciL)}, ${formatNumber(f.ciU)}]` : '';
      console.log(`  ${idx + 1}. ${f.item} | n=${f.n} | r_age=${sign}${formatNumber(f.r_age)}${pStr}${ciStr}`);
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
    console.log(`Thresholds: minN>=${t.minN}, |r_age|>=${t.minAbsR}, p<=${t.maxP}, CI excludes 0=${t.requireCIExcludesZero}, eta²_gender>=${t.minEta2}`);
  }

  const topAge = significantFindings?.strongestAgeCorrelations || [];
  console.log('\nTop correlations with age:');
  if (!topAge.length) {
    console.log('  (none)');
  } else {
    topAge.slice(0, 10).forEach((f, idx) => {
      const sign = f.r_age >= 0 ? '+' : '';
      const pStr = Number.isFinite(f.p_age) ? ` | p=${formatNumber(f.p_age, 4)}` : '';
      const ciStr = Number.isFinite(f.ci_age_lower) && Number.isFinite(f.ci_age_upper)
        ? ` | 95% CI [${formatNumber(f.ci_age_lower)}, ${formatNumber(f.ci_age_upper)}]`
        : '';
      console.log(`  ${idx + 1}. ${f.item} | n=${f.n} | r_age=${sign}${formatNumber(f.r_age)}${pStr}${ciStr}`);
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
        const pStr = Number.isFinite(f.p_age) ? ` | p=${formatNumber(f.p_age, 4)}` : '';
        const ciStr = Number.isFinite(f.ci_age_lower) && Number.isFinite(f.ci_age_upper)
          ? ` | 95% CI [${formatNumber(f.ci_age_lower)}, ${formatNumber(f.ci_age_upper)}]`
          : '';
        console.log(`    ${idx + 1}. ${f.item} | n=${f.n} | r_age=${sign}${formatNumber(f.r_age)}${pStr}${ciStr}`);
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
    maxP: 0.05,
    requireCIExcludesZero: true,
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
    const p = entry.p_age;
    const ciL = entry.ci_age_lower;
    const ciU = entry.ci_age_upper;
    const ciOk = !opts.requireCIExcludesZero || (!Number.isFinite(ciL) || !Number.isFinite(ciU) ? true : (ciL * ciU > 0));
    const pOk = Number.isFinite(p) ? p <= opts.maxP : false;
    if (n >= opts.minN && Number.isFinite(r) && Math.abs(r) >= opts.minAbsR && pOk && ciOk) {
      findings.strongestAgeCorrelations.push({
        item: key,
        n,
        r_age: r,
        p_age: p,
        ci_age_lower: ciL,
        ci_age_upper: ciU
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
      const p = entry.p_age;
      const ciL = entry.ci_age_lower;
      const ciU = entry.ci_age_upper;
      const ciOk = !opts.requireCIExcludesZero || (!Number.isFinite(ciL) || !Number.isFinite(ciU) ? true : (ciL * ciU > 0));
      const pOk = Number.isFinite(p) ? p <= opts.maxP : false;
      if (n >= Math.max(3, Math.floor(opts.minN / 2)) && Number.isFinite(r) && Math.abs(r) >= opts.minAbsR && pOk && ciOk) {
        list.push({ item: key, n, r_age: r, p_age: p, ci_age_lower: ciL, ci_age_upper: ciU });
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
  console.log(`Thresholds: minN>=${t.minN}, |r_age|>=${t.minAbsR}, p<=${t.maxP}, CI excludes 0=${t.requireCIExcludesZero}, eta²_gender>=${t.minEta2}, topK=${t.topK}`);

  console.log('\n-- Strongest correlations with AGE (global) --');
  if (!findings.strongestAgeCorrelations.length) {
    console.log('  (none)');
  } else {
    findings.strongestAgeCorrelations.forEach((f, idx) => {
      const sign = f.r_age >= 0 ? '+' : '';
      const pStr = Number.isFinite(f.p_age) ? ` | p=${formatNumber(f.p_age, 4)}` : '';
      const ciStr = Number.isFinite(f.ci_age_lower) && Number.isFinite(f.ci_age_upper)
        ? ` | 95% CI [${formatNumber(f.ci_age_lower)}, ${formatNumber(f.ci_age_upper)}]`
        : '';
      console.log(`  ${idx + 1}. ${f.item} | n=${f.n} | r_age=${sign}${formatNumber(f.r_age)}${pStr}${ciStr}`);
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
        const pStr = Number.isFinite(f.p_age) ? ` | p=${formatNumber(f.p_age, 4)}` : '';
        const ciStr = Number.isFinite(f.ci_age_lower) && Number.isFinite(f.ci_age_upper)
          ? ` | 95% CI [${formatNumber(f.ci_age_lower)}, ${formatNumber(f.ci_age_upper)}]`
          : '';
        console.log(`    ${idx + 1}. ${f.item} | n=${f.n} | r_age=${sign}${formatNumber(f.r_age)}${pStr}${ciStr}`);
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
  const baseFont = { family: 'Times New Roman, Times, serif', size: 14 };
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
      const p1 = itemCorrelations?.global?.[item1]?.p_age;
      const r2 = itemCorrelations?.global?.[item2]?.r_age;
      const p2 = itemCorrelations?.global?.[item2]?.p_age;
      const filename = `scatter_age_${sanitizeFilename(group)}_SQ001_SQ002.png`;
      const buffer = await chartJSNodeCanvas.renderToBuffer({
        type: 'scatter',
        data: {
          datasets: [
            ...(points1.length
              ? [{
                label: `${item1} (n=${points1.length}, r=${formatNumber(r1)}, p=${formatNumber(p1, 4)})`,
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
                label: `${item2} (n=${points2.length}, r=${formatNumber(r2)}, p=${formatNumber(p2, 4)})`,
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
            legend: { position: 'top', labels: { font: baseFont } },
            title: { display: true, text: `Scatter: ${group} SQ001 vs SQ002 over age`, font: { ...baseFont, size: 16 } }
          },
          scales: {
            x: { title: { display: true, text: 'Age', font: baseFont }, ticks: { font: baseFont } },
            y: { title: { display: true, text: group, font: baseFont }, ticks: { font: baseFont } }
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
      const pAge = itemCorrelations?.global?.[item]?.p_age;
      const filename = `scatter_age_${sanitizeFilename(item)}.png`;
      const buffer = await chartJSNodeCanvas.renderToBuffer({
        type: 'scatter',
        data: {
          datasets: [
            {
              label: `${item} vs AGE (n=${points.length}, r=${formatNumber(rAge)}, p=${formatNumber(pAge, 4)})`,
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
            legend: { position: 'top', labels: { font: baseFont } },
            title: { display: true, text: `Scatter: ${item} vs Age`, font: { ...baseFont, size: 16 } }
          },
          scales: {
            x: { title: { display: true, text: 'Age', font: baseFont }, ticks: { font: baseFont } },
            y: { title: { display: true, text: item, font: baseFont }, ticks: { font: baseFont } }
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
            legend: { position: 'top', labels: { font: baseFont } },
            title: { display: true, text: `Group means by gender: ${item}`, font: { ...baseFont, size: 16 } },
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
            x: { title: { display: true, text: 'Gender', font: baseFont }, ticks: { font: baseFont } },
            y: { title: { display: true, text: `Mean of ${item}`, font: baseFont }, ticks: { font: baseFont } }
          },
          // Use a plugin without extra deps to draw labels on the bars.
          plugins: [
            {
              id: 'valueLabels',
              afterDatasetsDraw(chart) {
                const { ctx } = chart;
                const meta = chart.getDatasetMeta(0);
                ctx.save();
                ctx.font = '12px "Times New Roman", Times, serif';
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

async function generateOhsCorrelationPlots({ artistCorrelation, questionnaireAgeCorrelation, musicAgeCorrelation, outDir }) {
  await fs.promises.mkdir(outDir, { recursive: true });

  const width = 900;
  const height = 500;
  const baseFont = { family: 'Times New Roman, Times, serif', size: 14 };
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });

  const renderScatter = async (label, pairs, stats, filename, { xLabel, yLabel }) => {
    if (!pairs || pairs.length < 2) return;
    const points = pairs
      .filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y))
      .map(p => ({ x: p.x, y: p.y }));
    if (points.length < 2) return;
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const lr = linearRegression(xs, ys);
    const trend = lr
      ? (() => {
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        return [
          { x: minX, y: lr.slope * minX + lr.intercept },
          { x: maxX, y: lr.slope * maxX + lr.intercept }
        ];
      })()
      : [];

    const r = stats?.r;
    const pVal = stats?.p;
    const rStr = Number.isFinite(r) ? `r=${formatNumber(r)}` : 'r=n/a';
    const pStr = Number.isFinite(pVal) ? `p=${formatNumber(pVal, 4)}` : 'p=n/a';
    const title = `${label} (${rStr}, ${pStr})`;

    const buffer = await chartJSNodeCanvas.renderToBuffer({
      type: 'scatter',
      data: {
        datasets: [
          {
            label: `${label} Daten (n=${points.length})`,
            data: points,
            pointRadius: 4,
            pointHoverRadius: 5,
            backgroundColor: 'rgba(54, 162, 235, 0.7)'
          },
          ...(trend.length
            ? [{
              label: `${label} Trendlinie`,
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
          legend: { position: 'top', labels: { font: baseFont } },
          title: { display: true, text: title, font: { ...baseFont, size: 16 } }
        },
        scales: {
          x: { title: { display: true, text: xLabel, font: baseFont }, ticks: { font: baseFont } },
          y: { title: { display: true, text: yLabel, font: baseFont }, ticks: { font: baseFont } }
        }
      }
    });
    await fs.promises.writeFile(path.join(outDir, filename), buffer);
  };

  if (artistCorrelation?.pairs?.length) {
    await renderScatter('OHS Musik vs Fragebogen (Gesamt)', artistCorrelation.pairs, artistCorrelation, 'scatter_ohs_overall.png', { xLabel: 'Fragebogen-OHS', yLabel: 'Artist-OHS' });
    if (artistCorrelation.byGender?.m && artistCorrelation.pairsByGender?.m?.length) {
      await renderScatter('OHS Musik vs Fragebogen (m)', artistCorrelation.pairsByGender.m, artistCorrelation.byGender.m, 'scatter_ohs_m.png', { xLabel: 'Fragebogen-OHS', yLabel: 'Artist-OHS' });
    }
    if (artistCorrelation.byGender?.w && artistCorrelation.pairsByGender?.w?.length) {
      await renderScatter('OHS Musik vs Fragebogen (w)', artistCorrelation.pairsByGender.w, artistCorrelation.byGender.w, 'scatter_ohs_w.png', { xLabel: 'Fragebogen-OHS', yLabel: 'Artist-OHS' });
    }
  }
  if (questionnaireAgeCorrelation?.pairs?.length) {
    const stats = questionnaireAgeCorrelation;
    await renderScatter('Fragebogen-OHS vs Age', stats.pairs, stats, 'scatter_age_questionnaire_ohs.png', { xLabel: 'Age', yLabel: 'Fragebogen-OHS' });
  }
  if (musicAgeCorrelation?.pairs?.length) {
    const stats = musicAgeCorrelation;
    await renderScatter('Music-OHS vs Age', stats.pairs, stats, 'scatter_age_music_ohs.png', { xLabel: 'Age', yLabel: 'Artist-OHS' });
  }
}
