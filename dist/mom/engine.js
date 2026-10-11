(function(global){
'use strict';
const base=global.MOM_KNOWLEDGE;
if(!base) throw new Error('Mom knowledge not loaded');
const general=global.MOM_GENERAL_KNOWLEDGE||{FEATURES:[],OBJECTS:[],meta:{}};
const extra=global.MOM_GENERATED_KNOWLEDGE||{FEATURES:[],OBJECTS:[],meta:{}};
const controlled=global.MOM_CONTROLLED_KNOWLEDGE||{FEATURES:[],OBJECTS:[],meta:{}};
const featureMap=new Map();
for(const source of [base.FEATURES||[],general.FEATURES||[],extra.FEATURES||[],controlled.FEATURES||[]])for(const f of source){if(!f?.id||!f?.q)continue;if(!featureMap.has(f.id))featureMap.set(f.id,{id:f.id,q:f.q,label:f.label||f.id,group:f.group||null,requires:f.requires||null});}
const FEATURES=[...featureMap.values()];
const idx=Object.fromEntries(FEATURES.map((f,i)=>[f.id,i]));
const objectMap=new Map();
for(const source of [base.OBJECTS||[],general.OBJECTS||[],extra.OBJECTS||[],controlled.OBJECTS||[]])for(const raw of source){if(!raw?.name)continue;const key=String(raw.name).trim().toLocaleLowerCase('en');const clean={...raw,name:String(raw.name).trim(),yes:[...new Set((raw.yes||[]).filter(id=>idx[id]!=null))],maybe:[...new Set((raw.maybe||[]).filter(id=>idx[id]!=null))],weight:Number.isFinite(Number(raw.weight))&&Number(raw.weight)>0?Number(raw.weight):1};if(!objectMap.has(key)){objectMap.set(key,clean);continue;}const old=objectMap.get(key);const yes=[...new Set([...old.yes,...clean.yes])];const maybe=[...new Set([...old.maybe,...clean.maybe].filter(id=>!yes.includes(id)))];objectMap.set¶»§q«^