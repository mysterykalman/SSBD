/** Deterministically keep question-relevant Wikidata claims, with dated quantities.
 * Source stays research-only. This is a data-preservation helper, not approval.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
const path='data/pam20q/expansion/';
const input=process.argv[2];
if(!input)throw Error('Usage: node scripts/pam-compact-source-snapshot.mjs <downloaded-research.json>');
const raw=JSON.parse(fs.readFileSync(input,'utf8'));
if(raw.status!=='RESEARCH_CLAIMS_UNREVIEWED'||raw.subjects.length!==467)throw Error('Expected complete 467 unreviewed 550-subject research snapshot');
const roles=new Set(['country','country_of_origin','citizenship','birthplace','occupation','genre',
 'birth_date','death_date','release_date','inception_date','creator','author','composer',
 'formation_location','administrative_location','capital','languages_spoken','continent',
 'instance_of','film_director','original_language','industry','headquarters_location',
 'collection','current_location','movement','material','depicts','architecture_style',
 'field_of_work','series','dissolved_or_abolished_date',
 'official_language','currency','shares_border','population','area']);
const year=c=>Number(/^\+?(\d{4})/.exec(c.point_in_time||'')?.[1])||null;
const numClaims=(claims,field)=>{
 const items=claims.filter(x=>x.field===field&&x.kind==='quantity'&&Number.isFinite(x.value_amount)&&x.value_amount>0&&!x.ended_at);
 const unit=field==='area'?'http://www.wikidata.org/entity/Q712226':'1';
 const matches=items.filter(x=>x.unit===unit);
 if(!matches.length)return[];
 if(field==='population'){
  const recent=matches.filter(x=>year(x)>=2018&&year(x)<=2026);
  if(!recent.length)return[];
  recent.sort((a,b)=>(year(b)-year(a))||((b.rank==='preferred')-(a.rank==='preferred')));
  return [recent[0]];
 }
 matches.sort((a,b)=>((b.rank==='preferred')-(a.rank==='preferred'))||(year(b)||0)-(year(a)||0));
 const chosen=matches[0];
 if(matches.some(x=>Math.abs(x.value_amount-chosen.value_amount)/chosen.value_amount>.20))return[];
 return[chosen];
};
const keepFields=(claims,kind)=>{
 const filtered=claims.filter(x=>roles.has(x.field)&&x.kind!=='quantity');
 if(kind==='Cities'||kind==='Countries')filtered.push(...numClaims(claims,'population'),...numClaims(claims,'area'));
 return filtered;
};
const facts=raw.subjects.map(x=>({id:x.id,name:x.name,category:x.category,qid:x.qid,verified:false,entity_label:x.entity_label,status:x.source_status,claims:keepFields(x.claims,x.category).map(c=>({
 p:c.property,f:c.field,k:c.kind,v:c.value_id??c.value_time??c.value_amount,
 precision:c.precision??null,unit:c.unit??null,t:c.point_in_time??null,tprecision:c.point_precision??null,
 rank:c.rank??'normal',end:c.ended_at??null,source:c.source,claim_id:c.claim_id
}))}));
const doc={version:2,review_status:'research_only_unverified',count:facts.length,source_artifact:'Wikidata 550 claims dated quantitative research snapshot',subjects:facts};
const rawBuffer=Buffer.from(JSON.stringify(doc));
const compressed=zlib.brotliCompressSync(rawBuffer,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:9}});
fs.writeFileSync(path+'first550-source-facts.br.b64',compressed.toString('base64')+'\n');
const sha=crypto.createHash('sha256').update(rawBuffer).digest('hex');
const manifest={version:2,source_subjects:facts.length,source_claims:facts.reduce((n,x)=>n+x.claims.length,0),sha256:sha,review_status:'research_only_unverified'};
fs.writeFileSync(path+'first550-source-facts-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(manifest);