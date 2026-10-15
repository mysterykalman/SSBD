import fs from 'node:fs';
import path from 'node:path';
import {loadBenchmarkRows} from '../test/fixtures/mom-benchmark-data.mjs';
import {evaluateRuntimeBenchmark,summarizeRuntimeBenchmark} from './mom-runtime-benchmark.mjs';

const ROOT=process.cwd();
const WITH_PATH=path.resolve(ROOT,process.env.MOM_RUNTIME_WITH_WIKIDATA||'.dev-data/mom-runtime-ab/with-wikidata.json');
const WITHOUT_PATH=path.resolve(ROOT,process.env.MOM_RUNTIME_WITHOUT_WIKIDATA||'.dev-data/mom-runtime-ab/without-wikidata.json');
const BENCHMARK_REPORT_PATH=path.resolve(ROOT,process.env.MOM_RUNTIME_WITH_REPORT||'.dev-data/mom-runtime-benchmark/report.json');
const OUT_DIR=path.resolve(ROOT,process.env.MOM_RUNTIME_AB_OUT_DIR||'.dev-data/mom-runtime-ab');
const PROGRESS_EVERY=Math.max(1,Number(process.env.MOM_RUNTIME_AB_PROGRESS_EVERY||50));

function readRuntime(filename){
  if(!fs.existsSync(filename))throw new Error(`Missing runtime: ${filename}`);
  return JSON.parse(fs.readFileSync(filename,'utf8'));
}
function average(values){
  const finite=values.filter(Number.isFinite);
  return finite.length?finite.reduce((sum,value)=>sum+value,0)/finite.length:null;
}
function compact(row){
  return{
    item:row.item,tier:row.tier,category:row.category,present:row.present,pamWon:row.pamWon,turns:row.turns,
    failureReason:row.failureReason,pathFlags:row.pathFlags,matchedName:row.matchedName
  };
}
function reusableBenchmarkRows(runtime,benchmarkRows){
  if(!fs.existsSync(BENCHMARK_REPORT_PATH))return null;
  let report;
  try{
    report=JSON.parse(fs.readFileSync(BENCHMARK_REPORT_PATH,'utf8'));
  }catch(error){
    console.warn(`Ignoring unreadable with-Wikidata benchmark report: ${error.message}`);
    return null;
  }
  if(report.runtimeSourceHash!==(runtime.meta?.sourceHash||''))return null;
  if(report.rowCount!==benchmarkRows.length||!Array.isArray(report.rows)||report.rows.length!==benchmarkRows.length)return null;
  for(let i=0;i<benchmarkRows.length;i++){
    const expected=benchmarkRows[i];
    const actual=report.rows[i];
    if(actual?.item!==expected.item||actual?.tier!==expected.tier||actual?.category!==expected.category)return null;
  }
  return report.rows;
}

const withRuntime=readRuntime(WITH_PATH);
const withoutRuntime=readRuntime(WITHOUT_PATH);
const rows=loadBenchmarkRows();
const cachedWithRows=reusableBenchmarkRows(withRuntime,rows);
let withRows;
if(cachedWithRows){
  withRows=cachedWithRows;
  console.log(`Reusing ${withRows.length.toLocaleString()} validated enriched gameplay rows from ${path.relative(ROOT,BENCHMARK_REPORT_PATH)}.`);
}else{
  console.log(`No matching prior enriched gameplay report found. Evaluating ${rows.length.toLocaleString()} benchmark rows.`);
  withRows=evaluateRuntimeBenchmark(withRuntime,rows,{selfPlay:true,progressEvery:PROGRESS_EVERY,progressLabel:'Enriched'});
}
console.log(`Starting baseline gameplay evaluation for ${rows.length.toLocaleString()} benchmark rows.`);
const withoutRows=evaluateRuntimeBenchmark(withoutRuntime,rows,{selfPlay:true,progressEvery:PROGRESS_EVERY,progressLabel:'Baseline'});
const withSummary=summarizeRuntimeBenchmark(withRuntime,withRows);
const withoutSummary=summarizeRuntimeBenchmark(withoutRuntime,withoutRows);

const helped=[];
const hurt=[];
const changedTurns=[];
let commonPresent=0;
let sameOutcome=0;
for(let i=0;i<rows.length;i++){
  const yes=withRows[i],no=withoutRows[i];
  if(yes.present&&no.present)commonPresent++;
  if(yes.pamWon===no.pamWon)sameOutcome++;
  if(yes.pamWon&&!no.pamWon)helped.push({withWikidata:compact(yes),withoutWikidata:compact(no)});
  if(!yes.pamWon&&no.pamWon)hurt.push({withWikidata:compact(yes),withoutWikidata:compact(no)});
  if(Number.isFinite(yes.turns)&&Number.isFinite(no.turns)&&yes.turns!==no.turns){
    changedTurns.push({item:yes.item,tier:yes.tier,category:yes.category,withWikidata:yes.turns,withoutWikidata:no.turns,delta:yes.turns-no.turns});
  }
}

const presentWith=withRows.filter(row=>row.present);
const presentWithout=withoutRows.filter(row=>row.present);
const comparison={
  generatedAt:new Date().toISOString(),
  rowCount:rows.length,
  commonPresent,
  sameOutcome,
  changedOutcome:rows.length-sameOutcome,
  withWikidata:{
    runtimeSourceHash:withRuntime.meta?.sourceHash||'',
    conceptCount:withRuntime.meta?.conceptCount??withRuntime.concepts.length,
    featureCount:withRuntime.meta?.questionCount??withRuntime.questions.length,
    presentCount:withSummary.presentCount,
    winCount:withSummary.pamWinCount,
    winRateOverall:withSummary.pamWinRateOverall,
    winRatePresent:withSummary.pamWinRatePresent,
    averageTurnsPresent:average(presentWith.map(row=>row.turns)),
    questionQuality:withSummary.questionQuality,
    pathFlagCount:withSummary.pathFlagCount,
    failureClasses:withSummary.failureClasses
  },
  withoutWikidata:{
    runtimeSourceHash:withoutRuntime.meta?.sourceHash||'',
    conceptCount:withoutRuntime.meta?.conceptCount??withoutRuntime.concepts.length,
    featureCount:withoutRuntime.meta?.questionCount??withoutRuntime.questions.length,
    presentCount:withoutSummary.presentCount,
    winCount:withoutSummary.pamWinCount,
    winRateOverall:withoutSummary.pamWinRateOverall,
    winRatePresent:withoutSummary.pamWinRatePresent,
    averageTurnsPresent:average(presentWithout.map(row=>row.turns)),
    questionQuality:withoutSummary.questionQuality,
    pathFlagCount:withoutSummary.pathFlagCount,
    failureClasses:withoutSummary.failureClasses
  },
  delta:{
    wins:withSummary.pamWinCount-withoutSummary.pamWinCount,
    winRateOverall:withSummary.pamWinRateOverall-withoutSummary.pamWinRateOverall,
    winRatePresent:withSummary.pamWinRatePresent-withoutSummary.pamWinRatePresent,
    helpedCount:helped.length,
    hurtCount:hurt.length,
    netHelped:helped.length-hurt.length,
    averageTurnsPresent:(average(presentWith.map(row=>row.turns))??0)-(average(presentWithout.map(row=>row.turns))??0),
    unknownHeavyRate:withSummary.questionQuality.unknownHeavyRate-withoutSummary.questionQuality.unknownHeavyRate,
    repeatedFamilyRate:withSummary.questionQuality.repeatedFamilyRate-withoutSummary.questionQuality.repeatedFamilyRate,
    prematureSpecificRate:withSummary.questionQuality.prematureSpecificRate-withoutSummary.questionQuality.prematureSpecificRate,
    weakSemanticRate:withSummary.questionQuality.weakSemanticRate-withoutSummary.questionQuality.weakSemanticRate,
    pathFlags:withSummary.pathFlagCount-withoutSummary.pathFlagCount
  },
  helped,
  hurt,
  changedTurns:changedTurns.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||a.item.localeCompare(b.item,'en'))
};

fs.mkdirSync(OUT_DIR,{recursive:true});
fs.writeFileSync(path.join(OUT_DIR,'with-wikidata-report.json'),JSON.stringify(withSummary,null,2)+'\n');
fs.writeFileSync(path.join(OUT_DIR,'without-wikidata-report.json'),JSON.stringify(withoutSummary,null,2)+'\n');
fs.writeFileSync(path.join(OUT_DIR,'comparison.json'),JSON.stringify(comparison,null,2)+'\n');

console.log(JSON.stringify({
  rowCount:comparison.rowCount,
  commonPresent:comparison.commonPresent,
  withWikidata:comparison.withWikidata,
  withoutWikidata:comparison.withoutWikidata,
  delta:comparison.delta,
  helped:helped.slice(0,20).map(entry=>entry.withWikidata.item),
  hurt:hurt.slice(0,20).map(entry=>entry.withWikidata.item)
},null,2));

if(process.env.MOM_RUNTIME_AB_ENFORCE==='1'){
  if(comparison.delta.netHelped<0)throw new Error(`Static Wikidata hurts more benchmark items than it helps (${helped.length} helped, ${hurt.length} hurt).`);
  if(comparison.withWikidata.pathFlagCount>comparison.withoutWikidata.pathFlagCount)throw new Error('Static Wikidata increased human-intent path violations.');
}
