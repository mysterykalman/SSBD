#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const DATA_ROOT=path.resolve(process.env.PAM_KNOWLEDGE_ROOT||'/Volumes/Samsung_T5/Pam-Knowledge');
const ENRICH_DIR=path.resolve(process.env.PAM_ENRICHMENT_DIR||path.join(DATA_ROOT,'validated-enrichment'));
const APPROVED=path.join(ENRICH_DIR,'approved-runtime-evidence.json');
const INVENTORY=path.join(ROOT,'.dev-data','mom-playable-50k','playable_50k.jsonl');
const COVERAGE=path.join(ROOT,'.dev-data','mom-trait-coverage','evidence.jsonl');
const DEFAULT_EXTRA=path.join(ROOT,'.dev-data','trait-sources','extra-public-evidence.json');
const OUT=path.join(ENRICH_DIR,'runtime-ab');
const BASELINE_PROFILES=path.join(OUT,'baseline-profiles');
const ENRICHED_PROFILES=path.join(OUT,'enriched-profiles');
const BASELINE_RUNTIME_DIR=path.join(OUT,'baseline-runtime');
const ENRICHED_RUNTIME_DIR=path.join(OUT,'enriched-runtime');
const BASELINE_RUNTIME=path.join(BASELINE_RUNTIME_DIR,'knowledge.runtime.json');
const ENRICHED_RUNTIME=path.join(ENRICHED_RUNTIME_DIR,'knowledge.runtime.json');

function fail(message){
  console.error(`[pam runtime A/B] ${message}`);
  process.exit(1);
}
function run(command,args,env={}){
  console.log(`\n[pam runtime A/B] ${command} ${args.join(' ')}`);
  const result=spawnSync(command,args,{cwd:ROOT,stdio:'inherit',env:{...process.env,...env}});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
function mustExist(file,label){
  if(!fs.existsSync(file))fail(`Missing ${label}: ${file}`);
}
function bootstrapPrerequisites(){
  if(!fs.existsSync(INVENTORY)){
    console.log(`[pam runtime A/B] Playable 50k inventory is missing. Rebuilding it with the existing deterministic builder.`);
    run(process.execPath,['scripts/build-mom-playable-50k.mjs']);
  }
  mustExist(INVENTORY,'playable 50k inventory after rebuild');

  if(!fs.existsSync(COVERAGE)){
    console.log(`[pam runtime A/B] Trait coverage evidence is missing. Rebuilding it with the existing offline coverage pipeline.`);
    run(process.execPath,['scripts/analyze-mom-trait-coverage.mjs']);
  }
  mustExist(COVERAGE,'trait coverage evidence after rebuild');
}

mustExist(APPROVED,'approved enrichment evidence');
bootstrapPrerequisites();

let approved;
try{approved=JSON.parse(fs.readFileSync(APPROVED,'utf8'));}
catch(error){fail(`Could not parse approved enrichment evidence: ${error.message}`);}
if(!Array.isArray(approved)||!approved.length)fail('Approved enrichment evidence is empty.');
if(!approved.every(row=>row&&typeof row.concept==='string'&&Array.isArray(row.evidence))){
  fail('Approved enrichment evidence does not match the controlled-profile adapter schema.');
}

fs.mkdirSync(OUT,{recursive:true});
const baselineExtraFiles=fs.existsSync(DEFAULT_EXTRA)?[DEFAULT_EXTRA]:[];
const enrichedExtraFiles=[...baselineExtraFiles,APPROVED];

run(process.execPath,['scripts/build-mom-controlled-profiles.mjs'],{
  MOM_PROFILE_INVENTORY:INVENTORY,
  MOM_PROFILE_COVERAGE_EVIDENCE:COVERAGE,
  MOM_PROFILE_EXTRA_FILES:baselineExtraFiles.join(path.delimiter),
  MOM_PROFILE_OUT_DIR:BASELINE_PROFILES
});
run(process.execPath,['scripts/build-mom-runtime-knowledge.mjs'],{
  MOM_RUNTIME_INVENTORY:INVENTORY,
  MOM_RUNTIME_PROFILES:path.join(BASELINE_PROFILES,'mom-controlled-profiles.json'),
  MOM_RUNTIME_OUT_DIR:BASELINE_RUNTIME_DIR
});

run(process.execPath,['scripts/build-mom-controlled-profiles.mjs'],{
  MOM_PROFILE_INVENTORY:INVENTORY,
  MOM_PROFILE_COVERAGE_EVIDENCE:COVERAGE,
  MOM_PROFILE_EXTRA_FILES:enrichedExtraFiles.join(path.delimiter),
  MOM_PROFILE_OUT_DIR:ENRICHED_PROFILES
});
run(process.execPath,['scripts/build-mom-runtime-knowledge.mjs'],{
  MOM_RUNTIME_INVENTORY:INVENTORY,
  MOM_RUNTIME_PROFILES:path.join(ENRICHED_PROFILES,'mom-controlled-profiles.json'),
  MOM_RUNTIME_OUT_DIR:ENRICHED_RUNTIME_DIR
});

run(process.execPath,['scripts/mom-runtime-ab-benchmark.mjs'],{
  MOM_RUNTIME_WITH_WIKIDATA:ENRICHED_RUNTIME,
  MOM_RUNTIME_WITHOUT_WIKIDATA:BASELINE_RUNTIME,
  MOM_RUNTIME_WITH_REPORT:path.join(OUT,'no-cache-report.json'),
  MOM_RUNTIME_AB_OUT_DIR:OUT,
  MOM_RUNTIME_AB_ENFORCE:'1'
});

const comparisonPath=path.join(OUT,'comparison.json');
mustExist(comparisonPath,'runtime A/B comparison');
const comparison=JSON.parse(fs.readFileSync(comparisonPath,'utf8'));
const baselineProfileSummary=JSON.parse(fs.readFileSync(path.join(BASELINE_PROFILES,'summary.json'),'utf8'));
const enrichedProfileSummary=JSON.parse(fs.readFileSync(path.join(ENRICHED_PROFILES,'summary.json'),'utf8'));

const summary={
  mode:'isolated-pam-enrichment-runtime-ab',
  approvedEvidenceConceptRows:approved.length,
  defaultExtraEvidencePresent:fs.existsSync(DEFAULT_EXTRA),
  baselineRuntime:BASELINE_RUNTIME,
  enrichedRuntime:ENRICHED_RUNTIME,
  baselineProfiles:{
    total:baselineProfileSummary.total,
    needsEnrichment:baselineProfileSummary.needsEnrichment,
    preservedEvidence:baselineProfileSummary.preservedEvidence,
    extraMatched:baselineProfileSummary.extraMatched
  },
  enrichedProfiles:{
    total:enrichedProfileSummary.total,
    needsEnrichment:enrichedProfileSummary.needsEnrichment,
    preservedEvidence:enrichedProfileSummary.preservedEvidence,
    extraMatched:enrichedProfileSummary.extraMatched
  },
  delta:comparison.delta,
  withEnrichment:comparison.withWikidata,
  withoutEnrichment:comparison.withoutWikidata,
  promotionDecision:(comparison.delta.netHelped>=0&&comparison.delta.pathFlags<=0)?'RUNTIME_A_B_PASS':'RUNTIME_A_B_FAIL'
};
fs.writeFileSync(path.join(OUT,'pam-enrichment-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log('\n=== PAM ENRICHMENT RUNTIME A/B SUMMARY ===');
console.log(JSON.stringify(summary,null,2));
