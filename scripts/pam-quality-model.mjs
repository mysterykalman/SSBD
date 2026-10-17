import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {pamTraitIndex} from './pam-classic-model.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const qualityRoot=join(root,'data','pam20q','quality');
const QUALITY_TARGETS=375;
const NEXT_BATCH_TARGETS=500;
const nextBatchPath=join(qualityRoot,'quality-500.json');

async function loadQualityProfiles(){
  const parts=await Promise.all([1,2,3,4].map(i=>readFile(join(qualityRoot,`quality-375.part${i}`),'utf8')));
  const encoded=parts.join('').trim();
  const doc=JSON.parse(gunzipSync(Buffer.from(encoded,'base64')).toString('utf8'));
  if(doc.count!==QUALITY_TARGETS||!Array.isArray(doc.profiles)||doc.profiles.length!==QUALITY_TARGETS){
    throw new Error(`Expected ${QUALITY_TARGETS} Pam quality profiles`);
  }
  return doc.profiles;
}

function compileQualityProfile(profile,questionCount){
  // Four-state answer semantics are retained for known cells. Unknown cells are
  // carried separately in knownMask so they contribute zero evidence in-engine.
  const states=new Uint8Array(questionCount);
  const known=new Uint8Array(questionCount);
  const categoryIndex={animal:0,vegetable:1,mineral:2,other:3}[profile.category];
  if(categoryIndex==null)throw new Error(`Unknown Pam quality category ${profile.category} for ${profile.name}`);
  for(let q=0;q<4;q++){
    states[q]=q===categoryIndex?3:2;
    known[q]=1;
  }
  const apply=(key,value)=>{
    const index=pamTraitIndex[key];
    if(index==null)throw new Error(`Unknown Pam quality trait ${key} for ${profile.name}`);
    states[index]=value;
    known[index]=1;
  };
  for(const key of profile.yes||[])apply(key,3);
  for(const key of profile.weakYes||[])apply(key,1);
  for(const key of profile.no||[])apply(key,2);
  return{states,known};
}

export async function appendPamQuality375(model){
  const profiles=await loadQualityProfiles();
  const seen=new Set(model.targets.map(name=>String(name).trim().toLowerCase()));
  for(const profile of profiles){
    const key=String(profile.name||'').trim().toLowerCase();
    if(!key)throw new Error('Pam quality profile contains a blank target');
    if(seen.has(key))throw new Error(`Pam quality target duplicates an existing target: ${profile.name}`);
    seen.add(key);
  }

  const targets=[...model.targets,...profiles.map(p=>p.name)];
  const weights=Buffer.alloc(model.questions.length*targets.length);
  const knownMask=Buffer.alloc(model.questions.length*targets.length,1);
  for(let q=0;q<model.questions.length;q++){
    model.weights.copy(weights,q*targets.length,q*model.targets.length,(q+1)*model.targets.length);
  }
  for(let e=0;e<profiles.length;e++){
    const {states,known}=compileQualityProfile(profiles[e],model.questions.length);
    const targetIndex=model.targets.length+e;
    for(let q=0;q<model.questions.length;q++){
      weights[q*targets.length+targetIndex]=states[q];
      knownMask[q*targets.length+targetIndex]=known[q];
    }
  }
  for(const value of weights)if(value>3)throw new Error(`Pam 1775 matrix contains invalid state ${value}`);

  return{
    ...model,
    targets,
    weights,
    knownMask,
    qualityCount:profiles.length,
    totalExtensionCount:(model.extensionCount||0)+profiles.length
  };
}

export async function loadPam1775Model(loadBaseModel){
  const model=await loadBaseModel();
  const full=await appendPamQuality375(model);
  if(full.targets.length!==1775)throw new Error(`Expected 1775 Pam targets, found ${full.targets.length}`);
  return full;
}

// A new batch is optional until the reviewed file is committed. Existing 1775
// production builds remain unchanged; partial batches are rejected.
export async function loadPamExpandedModel(loadBaseModel){
  const baseline=await loadPam1775Model(loadBaseModel);
  if(!existsSync(nextBatchPath))return baseline;
  const doc=JSON.parse(await readFile(nextBatchPath,'utf8'));
  // Candidate files must never silently become playable in a preview build.
  // Explicit test opt-in is local to the CI jobs; production requires review.
  if(doc.review_status!=='approved'&&process.env.PAM_ALLOW_UNREVIEWED_500!=='1')return baseline;
  if(doc.count!==NEXT_BATCH_TARGETS||!Array.isArray(doc.profiles)||doc.profiles.length!==NEXT_BATCH_TARGETS){
    throw new Error('Pam expansion requires exactly 500 reviewed quality profiles');
  }
  const seen=new Set(baseline.targets.map(x=>String(x).trim().toLowerCase()));
  for(const p of doc.profiles){
    const key=String(p.name||'').trim().toLowerCase();
    if(!key||seen.has(key))throw new Error('Duplicate or empty Pam 500 target: '+p.name);
    seen.add(key);
    if(!Array.isArray(p.yes)||!Array.isArray(p.no)||!Array.isArray(p.weakYes))throw new Error('Incomplete trait arrays: '+p.name);
    const traits=[...p.yes,...p.no,...p.weakYes];
    if(new Set(traits).size!==traits.length)throw new Error('Contradictory Pam 500 traits: '+p.name);
  }
  const targets=[...baseline.targets,...doc.profiles.map(p=>p.name)];
  const weights=Buffer.alloc(baseline.questions.length*targets.length);
  const knownMask=Buffer.alloc(weights.length,0);
  for(let q=0;q<baseline.questions.length;q++){
    baseline.weights.copy(weights,q*targets.length,q*baseline.targets.length,(q+1)*baseline.targets.length);
    baseline.knownMask.copy(knownMask,q*targets.length,q*baseline.targets.length,(q+1)*baseline.targets.length);
  }
  for(let e=0;e<doc.profiles.length;e++){
    const {states,known}=compileQualityProfile(doc.profiles[e],baseline.questions.length);
    for(let q=0;q<baseline.questions.length;q++){
      const offset=q*targets.length+baseline.targets.length+e;
      weights[offset]=states[q];knownMask[offset]=known[q];
    }
  }
  return{...baseline,targets,weights,knownMask,newQualityCount:NEXT_BATCH_TARGETS,totalExtensionCount:baseline.totalExtensionCount+NEXT_BATCH_TARGETS};
}
