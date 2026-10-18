/**
 * Lab-only compiler: can candidate external evidence improve 20Q separability?
 * Every source fact is still UNVERIFIED and MUST NOT be shipped as game truth.
 * It generates natural predicate questions only when Wikidata explicitly
 * supplies the field; missing fields stay UNKNOWN and never become no.
 */
import {readFile} from 'node:fs/promises';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..','data','pam20q','expansion');
const hash=x=>createHash('sha256').update(x).digest('hex');

export async function loadSourceEvidence550(){
 const [text,meta]=await Promise.all([readFile(join(ROOT,'first550-source-facts.br.b64'),'utf8'),readFile(join(ROOT,'first550-source-facts-manifest.json'),'utf8')]);
 const raw=brotliDecompressSync(Buffer.from(text.trim(),'base64'));
 const manifest=JSON.parse(meta);
 if(hash(raw)!==manifest.sha256)throw Error('Research-source integrity mismatch');
 const doc=JSON.parse(raw.toString('utf8'));
 if(doc.review_status!=='research_only_unverified'||doc.subjects.length!==467||doc.subjects.some(x=>x.verified))throw Error('Research source was incorrectly marked approved');
 return doc;
}

const PLACE=new Set(['Cities','Monuments, Paintings & Sculptures','Landmarks']);
const ORIGIN=new Set(['Bands & Music Groups','Movies','TV Shows','Musicals','Brands','Car Companies']);
const MEDIA=new Set(['Movies','TV Shows','Musicals']);
const BUCKETS={
 'place_country':{roles:['country'],scoped:PLACE,text:v=>`Is this place in ${countryText(v)}?`},
 'origin_country':{roles:['country_of_origin'],scoped:ORIGIN,text:v=>`Is it originally from ${countryText(v)}?`},
 'person_citizenship':{roles:['citizenship'],scoped:new Set(['People']),text:v=>`Was this person a citizen of ${countryText(v)}?`},
 'continent':{roles:['continent'],scoped:new Set(['Cities','Countries','Landmarks']),text:v=>`Is it located in ${v}?`},
 'language':{roles:['original_language'],scoped:MEDIA,text:v=>`Was the original version in ${v}?`},
 'band_formed_city':{roles:['formation_location'],scoped:new Set(['Bands & Music Groups']),text:v=>`Was this group formed in ${v}?`},
 'art_creator':{roles:['creator'],scoped:new Set(['Monuments, Paintings & Sculptures']),text:v=>`Was the artwork created by ${v}?`},
 'film_director':{roles:['film_director'],scoped:new Set(['Movies']),text:v=>`Was this film directed by ${v}?`},
 'industry':{roles:['industry'],scoped:new Set(['Brands','Car Companies']),text:v=>`Is the business mainly in ${v}?`}
};
const CONTINENT_LABELS=Object.freeze({
 Q49:'North America',Q46:'Europe',Q18:'South America',Q48:'Asia',Q15:'Africa',Q538:'Oceania',Q27611:'Central America'
});
const LANG_LABELS=Object.freeze({Q1860:'English',Q150:'French',Q188:'German',Q1321:'Spanish',Q5287:'Japanese'});
function countryText(label){
 return /^(United States|United Kingdom|United Arab Emirates|Netherlands|Philippines|Czech Republic|Dominican Republic)$/i.test(label)?'the '+label:label;
}

/** Use source QIDs directly; missing property is NOT false. */
function singletonQid(subject,roles){
 const found=subject.claims.filter(x=>roles.includes(x.f)&&x.k==='item'&&/^Q\d+$/.test(x.v));
 const values=[...new Set(found.map(x=>x.v))];
 return values.length===1?values[0]:null;
}
function reliableYear(subject,role){
 const claims=subject.claims.filter(x=>x.f===role&&x.k==='time'&&x.precision>=9);
 const years=[...new Set(claims.map(x=>Number(/^\+?(\d{3,4})-/.exec(x.v)?.[1])).filter(y=>y>=1000&&y<=2090))];
 return years.length===1?years[0]:null;
}
function timeFields(subject){
 switch(subject.category){
  case 'People':return{date_field:'birth_date',prefix:'person_birth',description:'this person born'};
  case 'Movies':return{date_field:'release_date',prefix:'movie_release',description:'this movie released'};
  case 'TV Shows':return{date_field:'inception_date',prefix:'tv_start',description:'this show first airing'};
  case 'Bands & Music Groups':return{date_field:'inception_date',prefix:'band_form',description:'this band formed'};
  case 'Brands':return{date_field:'inception_date',prefix:'brand_found',description:'this brand founded'};
  case 'Car Companies':return{date_field:'inception_date',prefix:'car_found',description:'this manufacturer founded'};
  default:return null;
 }
}
function dateThresholdText(prefix,year){
 if(prefix==='person_birth')return`Was this person born before ${year}?`;
 if(prefix==='movie_release')return`Was this movie released before ${year}?`;
 if(prefix==='tv_start')return`Did this TV show start before ${year}?`;
 if(prefix==='band_form')return`Was this group formed before ${year}?`;
 if(prefix==='brand_found')return`Was this brand established before ${year}?`;
 return`Was this car manufacturer founded before ${year}?`;
}

/**
 * The "closed" fields are exclusive only when the source gives a *single*
 * value for a subject. Fields with multiple or missing entries stay unknown.
 * Since identity matches are unreviewed, all generated questions are strictly
 * experimental. Evidence needs editorial verification before active use.
 */
export function compileSourceResearch(model,source,{minYes=2,minNo=0,minTemporalNo=2}={}){
 if(source.review_status!=='research_only_unverified')throw Error('Nonresearch data entered the lab');
 const map=new Map(model.targets.map((t,i)=>[t.id,i]));
 const labelByQid=new Map();
 for(const s of source.subjects){
  if(s.verified)throw Error('Automated factual verification is forbidden');
  if(!map.has(s.id))throw Error('Source QID is not in frozen 1650 roster: '+s.id);
  if(model.targets[map.get(s.id)].name!==s.name)throw Error('Source name does not match roster: '+s.id);
  labelByQid.set(s.qid,s.name.replace(/\s*\([^)]*\)\s*$/,''));
 }
 for(const s of source.subjects){if(s.category==='Countries')labelByQid.set(s.qid,s.name);}
 for(const [qid,name] of Object.entries(CONTINENT_LABELS))labelByQid.set(qid,name);
 for(const [qid,name] of Object.entries(LANG_LABELS))labelByQid.set(qid,name);
 const fields=new Map();
 const sourceByIndex=new Map();
 for(const subject of source.subjects){
  const idx=map.get(subject.id);sourceByIndex.set(idx,subject);
  const facts=new Map();
  for(const [key,rule] of Object.entries(BUCKETS)){
   if(!rule.scoped.has(subject.category))continue;
   const qid=singletonQid(subject,rule.roles);
   const label=labelByQid.get(qid);
   if(qid&&label)facts.set(key,{value:qid,label});
  }
  const tf=timeFields(subject);
  if(tf){const year=reliableYear(subject,tf.date_field);if(year)facts.set(tf.prefix,{value:year,label:String(year)});}
  fields.set(idx,facts);
 }
 const proposed=[];
 const questions=[];
 for(const [bucket,rule] of Object.entries(BUCKETS)){
  const values=new Map();
  for(const [idx,facts] of fields){
   const x=facts.get(bucket);if(!x)continue;
   if(!values.has(x.value))values.set(x.value,x.label);
  }
  for(const [value,label] of values){
   const known=new Uint8Array(model.targets.length),states=new Uint8Array(model.targets.length);
   let yes=0,no=0;
   for(const [idx,facts] of fields){
    const field=facts.get(bucket);if(!field)continue;
    // Wikidata item-valued fields are open-world. One observed value does
    // NOT prove another value is false, even if only one value was returned.
    // Preserve observed positive facts; every other subject stays UNKNOWN.
    if(field.value===value){known[idx]=1;states[idx]=3;yes++;}
    // A No needs a separately reviewed explicit negative or a proven
    // complete single-valued domain. This unreviewed feed provides neither.
   }
   if(yes<minYes||no<minNo)continue;
   questions.push({id:`source_${bucket}_${value}`,field:bucket,value,
    text:rule.text(label),known,states,yes,no,
    evidence_scope:'POSITIVE_ONLY_OPEN_WORLD',review_status:'SOURCE_RESEARCH_UNVERIFIED'});
  }
 }
 const thresholds=[1650,1750,1800,1850,1900,1925,1950,1960,1970,1980,1990,2000,2010,2020];
 for(const prefix of ['person_birth','movie_release','tv_start','band_form','brand_found','car_found']){
  for(const year of thresholds){
   const known=new Uint8Array(model.targets.length),states=new Uint8Array(model.targets.length);
   let yes=0,no=0;
   for(const [idx,facts] of fields){
    const f=facts.get(prefix);if(!f)continue;
    known[idx]=1;states[idx]=f.value<year?3:2;
    if(states[idx]===3)yes++;else no++;
   }
   // A precise, nonconflicting observed year supports a comparison with a
   // threshold. This is a derived answer from positive time evidence, not
   // a No manufactured from an absent property. Still research-only.
   if(yes<minYes||no<minTemporalNo)continue;
   questions.push({id:`source_${prefix}_before_${year}`,field:prefix,value:year,
    text:dateThresholdText(prefix,year),known,states,yes,no,
    review_status:'SOURCE_RESEARCH_UNVERIFIED'});
  }
 }
 for(const q of questions){if(!q.text.endsWith('?')||q.text.length>150)throw Error('Unnatural source question text: '+q.text);}
 const merged={...model,questions:[...model.questions,...questions]};
 return {model:merged,report:{sourceSubjects:source.subjects.length,
  labelCount:labelByQid.size,newQuestions:questions.length,
  oldQuestions:model.questions.length,totalQuestions:merged.questions.length,
  sourcePositiveClaims:source.subjects.reduce((n,x)=>n+x.claims.length,0),
  openWorldNegativeInferences:0,
  releaseGate:'BLOCKED: identity and Wikidata claims remain unreviewed; source-generated questions are not approved'}};
}