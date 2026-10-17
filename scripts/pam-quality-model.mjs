import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {pamTraitIndex} from './pam-classic-model.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const qualityRoot=join(root,'data','pam20q','quality');
const QUALITY_TARGETS=375;

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
  // State 0 is weak/uncertain no. Unspecified facts stay uncertain rather than becoming definite No.
  const states=new Uint8Array(questionCount);states.fill(0);
  const categoryIndex={animal:0,vegetable:1,mineral:2,other:3}[profile.category];
  if(categoryIndex==null)throw new Error(`Unknown Pam quality category ${profile.category} for ${profile.name}`);
  for(let q=0;q<4;q++)states[q]=q===categoryIndex?3:2;
  const apply=(key,value)=>{
    const index=pamTraitIndex[key];
    if(index==null)throw new Error(`Unknown Pam quality trait ${key} for ${profile.name}`);
    states[index]=value;
  };
  for(const key of profile.yes||[])apply(key,3);
  for(const key of profile.weakYes||[])apply(key,1);
  for(const key of profile.no||[])apply(key,2);
  return states;
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
  for(let q=0;q<model.questions.length;q++){
    model.weights.copy(weights,q*targets.length,q*model.targets.length,(q+1)*model.targets.length);
  }
  for(let e=0;e<profiles.length;e++){
    const states=compileQualityProfile(profiles[e],model.questions.length);
    const targetIndex=model.targets.length+e;
    for(let q=0;q<model.questions.length;q++)weights[q*targets.length+targetIndex]=states[q];
  }
  for(const value of weights)if(value>3)throw new Error(`Pam 1775 matrix contains invalid state ${value}`);

  return{
    ...model,
    targets,
    weights,
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
