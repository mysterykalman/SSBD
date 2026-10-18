/**
 * Conservative, offline-first question laboratory for the 1,650 SSBD themed answers.
 * This is a candidate/test module, deliberately NOT imported by the live Pam build.
 * Never turn missing contextual information into a confident 'no'.
 */
import {readFile} from 'node:fs/promises';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const encodedPath=join(root,'data','pam20q','expansion','roster-1650.br.b64');
const manifestPath=join(root,'data','pam20q','expansion','roster-manifest.json');

const CATEGORY_LABELS=Object.freeze({
 'Cities':'a specific city',
 'Countries':'a country',
 'Monuments, Paintings & Sculptures':'a famous monument or work of art',
 'Landmarks':'a famous landmark',
 'Bands & Music Groups':'a band or musical group',
 'People':'a specific real person',
 'Brands':'a recognizable brand',
 'Movies':'a movie',
 'TV Shows':'a television show',
 'Musicals':'a stage musical',
 'Car Companies':'a car manufacturer'
});

const SUBCATEGORY_PROMPTS=Object.freeze({
 'Paintings':'Is it a painting?',
 'Sculptures & Public Art':'Is it a sculpture or public artwork?',
 'Monuments & Historic Sites':'Is it a historic building, site, or monument?',
 'Natural Landmarks':'Is it a naturally occurring landmark?',
 'Built Landmarks & Attractions':'Was it built or created by people?',
 'Scientists, Inventors & Mathematicians':'Is this person best known for science, mathematics, or invention?',
 'Politics, Leaders & History':'Is this person especially known for politics or historical leadership?',
 'Film, TV & Comedy':'Is this person best known for acting, filmmaking, or comedy?',
 'Solo Musicians & Composers':'Is this person mainly known for music?',
 'Athletes':'Is this person especially known for sports?',
 'Writers, Artists & Cultural Figures':'Is this person chiefly known for writing, art, or cultural work?',
 'Classic Rock & Rock':'Is this group mostly associated with rock music?',
 'Pop, Dance & Vocal Groups':'Is this group chiefly known for pop or dance music?',
 'Hip-Hop, R&B & Funk':'Is it chiefly associated with hip-hop, R&B, or funk?',
 'Latin & Global Groups':'Is it a group known for Latin or international music?',
 'Technology, Media & Gaming':'Is the brand mainly connected to technology, media, or gaming?',
 'Clothing, Fashion & Sportswear':'Is it primarily a fashion or sportswear brand?',
 'Food, Drinks & Restaurants':'Is the brand best known for food or drink?',
 'Retail, Home, Beauty & Other':'Is the brand associated with retail, home goods, or beauty?',
 'Travel, Finance & Platforms':'Is the brand associated with travel, finance, or an online platform?',
 'Drama, Sci-Fi & Fantasy':'Is the TV show a drama, sci-fi, or fantasy series?',
 'Comedy & Sitcoms':'Is the TV show a comedy or sitcom?',
 'Reality, Competition & Documentary':'Is the TV show reality, competition, or documentary?',
 'Stage Musicals':'Is it a work created for musical theatre?'
});
// Shared humanlike routing filters are deliberately based on mutually exclusive
// answer topics, not the target's spelling. They help Pam narrow naturally
// without serially asking all eleven category labels.
const BROAD_ROUTING_QUESTIONS=Object.freeze({
  'geographic-place':'Is it primarily a specific geographic place or historic site?',
  'screen-or-stage':'Is it a particular movie, television show, or stage musical?',
  'real-person':'Is it an individual real person?',
  'organization':'Is it a commercial brand or car manufacturer?',
  'artwork':'Is it a particular painting or sculpture?',
  'music-work':'Is it a band or stage musical?'
});
function broadRoutingFlags(t){
 const c=t.category,sub=t.subcategory;
 const places=['Cities','Countries','Landmarks'].includes(c)||(c==='Monuments, Paintings & Sculptures'&&sub==='Monuments & Historic Sites');
 const screen=['Movies','TV Shows','Musicals'].includes(c);
 const works=c==='Monuments, Paintings & Sculptures'&&['Paintings','Sculptures & Public Art'].includes(sub);
 const music=['Bands & Music Groups','Musicals'].includes(c);
 return [places?'geographic-place':null,screen?'screen-or-stage':null,
   c==='People'?'real-person':null,
   ['Brands','Car Companies'].includes(c)?'organization':null,
   works?'artwork':null,music?'music-work':null].filter(Boolean);
}
const PERSON_FIELDS=Object.freeze({
  'physics':/\b(physicist|physics|theoretical physicist)\b/i,
  'mathematics':/\b(mathematician|mathematics)\b/i,
  'invention':/\b(inventor|invented|pioneer|engineer)\b/i,
  'medicine':/\b(medicine|medical|doctor|physician|nurse|surgeon|microbiologist|immunologist|virologist)\b/i,
  'astronomy':/\b(astronomer|astronomy|cosmolog)\b/i,
  'computing':/\b(comput|software|programmer|computer scientist|cryptograph)\b/i,
  'biology':/\b(biolog|naturalist|evolution|genetic|botanist|ecolog)\b/i,
  'chemistry':/\b(chemistry|chemist|biochem)\b/i,
  'US-president':/\b(U\.S\. president|first U\.S\. president)\b/i,
  'Canadian-PM':/\bCanadian prime minister\b/i,
  'prime-minister':/\bprime minister\b/i,
  'monarch':/\b(queen|king|monarch|emperor|empress)\b/i
});
const PERSON_TEXT=Object.freeze({
 'physics':'Was this person known for physics?',
 'mathematics':'Were they known for mathematics?',
 'invention':'Were they known for invention or engineering?',
 'medicine':'Were they known for medicine or medical science?',
 'astronomy':'Were they known for studying space or astronomy?',
 'computing':'Were they known for computing or computer science?',
 'biology':'Were they known for biology or natural history?',
 'chemistry':'Were they known for chemistry?',
 'US-president':'Did they serve as a U.S. president?',
 'Canadian-PM':"Did they serve as Canada's prime minister?",
 'prime-minister':'Did they serve as a prime minister?',
 'monarch':'Were they a monarch or emperor?'
});
const REGIONAL_SUBCATS=Object.freeze({
 'North America':['North America'],
 'South America':['South America'],
 'Europe':['Europe'],
 'Asia':['Asia'],
 'Africa':['Africa'],
 'Oceania':['Oceania'],
 'Africa & Oceania':[],
 'Asia & Middle East':['Asia'],
 'Americas':[]
});
function norm(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
function normalName(value){return norm(value).toLocaleLowerCase('en');}
function stableHash(value){return createHash('sha256').update(value).digest('hex');}
export async function loadThematicRoster(){
 const [encoded,manifestText]=await Promise.all([readFile(encodedPath,'utf8'),readFile(manifestPath,'utf8')]);
 const raw=brotliDecompressSync(Buffer.from(encoded.trim(),'base64'));
 const manifest=JSON.parse(manifestText),bundle=JSON.parse(raw.toString('utf8'));
 if(stableHash(raw)!==manifest.sha256_uncompressed)throw Error('Pam 1650 roster integrity mismatch');
 if(bundle.review_status!=='candidate_unreviewed')throw Error('Do not silently change the editorial approval state');
 if(bundle.entries.length!==1650)throw Error('Pam expansion must contain exactly 1,650 candidates');
 if(bundle.categories.length!==11)throw Error('Expected eleven themed categories');
 const seen=new Set();let index=0;
 const results=[];
 for(const [category,count] of bundle.categories){
  if(!CATEGORY_LABELS[category]||!Number.isInteger(count))throw Error(`Unknown expansion category ${category}`);
  for(let k=0;k<count;k++){
   const row=bundle.entries[index];
   if(!Array.isArray(row)||row.length!==3)throw Error(`Bad expansion row ${index}`);
   const name=norm(row[0]);
   const key=normalName(name);
   if(!name||seen.has(key))throw Error(`Blank or duplicate expansion answer ${name}`);
   seen.add(key);
   results.push(Object.freeze({id:`PAM-${String(index+1).padStart(4,'0')}`,name,category,subcategory:bundle.subcategories[row[1]],context:bundle.contexts[row[2]],review_status:'candidate_unreviewed'}));
   index++;
  }
 }
 if(index!==1650)throw Error('Category totals do not sum to 1650');
 return Object.freeze(results);
}

/** Supports true / false / unknown knowledge values; no fabricated fallback. */
export function traitsFromWorkBook(target){
 const facts=new Map();
 const set=(field,value)=>{
  if(Array.isArray(value)){
   const members=value.map(norm).filter(Boolean);if(members.length)facts.set(field,members);
  }else if(value!=null&&norm(value))facts.set(field,norm(value));
 };
 set('topic',target.category);
 set('macro_topic',broadRoutingFlags(target));
 set('subtopic',target.subcategory);
 const c=norm(target.context);
 const t=target.category;
 if((t==='Cities'||t==='Countries')&&REGIONAL_SUBCATS[target.subcategory]?.length===1){
  set('region',REGIONAL_SUBCATS[target.subcategory][0]);
 }
 if(t==='Cities'&&c)set('city_country',c);
 if(t==='Car Companies'&&c&&!c.includes('/')&&!c.includes('('))set('car_origin',c);
 if(t==='Movies'&&/^(18|19|20)\d{2}$/.test(c)){
  const year=Number(c);
  set('movie_decade',`${Math.floor(year/10)*10}s`);
  set('movie_year',String(year));
  set('movie_period',year<1980?'before 1980':year<2000?'1980–1999':year<2010?'2000–2009':'2010 or later');
 }
 if(t==='Monuments, Paintings & Sculptures'&&target.subcategory==='Paintings'&&c&&!/\d/.test(c))set('painting_artist',c);
 if(t==='Musicals'&&c){
  const creators=c.split(/[;/]/g).map(x=>norm(x)).filter(x=>x&&!/^(stage adaptation|stage version|adapted from|original cast|book by|songs by|based on)/i.test(x));
  if(creators.length&&creators.every(x=>x.length<90))set('musical_creators',creators);
 }
 if(t==='People'&&c){
  set('person_bio_source',c); // stored only for provenance, not emitted as an unreviewed question.
  const roles=Object.entries(PERSON_FIELDS).filter(([,rx])=>rx.test(c)).map(([key])=>key);
  if(roles.length)set('person_occupation',roles);
 }
 return facts;
}

function isScoped(target,field){
 const t=target.category;
 if(field==='topic'||field==='macro_topic')return true;
 if(field==='subtopic')return true;
 if(field==='region')return t==='Cities'||t==='Countries';
 if(field==='city_country')return t==='Cities';
 if(field==='car_origin')return t==='Car Companies';
 if(field.startsWith('movie_'))return t==='Movies';
 if(field==='painting_artist')return t==='Monuments, Paintings & Sculptures'&&target.subcategory==='Paintings';
 if(field==='musical_creators')return t==='Musicals';
 if(field==='person_occupation')return t==='People';
 return false;
}

const QUESTION_TEMPLATES={
 macro_topic:value=>BROAD_ROUTING_QUESTIONS[value],
 topic:v=>`Is it ${CATEGORY_LABELS[v]}?`,
 subtopic:(v)=>SUBCATEGORY_PROMPTS[v],
 region:v=>`Is it associated with ${v}?`,
 city_country:v=>`Is this city in ${v}?`,
 car_origin:v=>`Is this automaker based in ${v}?`,
 movie_decade:v=>`Was this movie released in the ${v}?`,
 movie_year:v=>`Was this movie released in ${v}?`,
 movie_period:v=>`Was it released ${v}?`,
 painting_artist:v=>`Was this painting made by ${v}?`,
 musical_creators:v=>`Was ${v} involved in creating this musical?`,
 person_occupation:v=>PERSON_TEXT[v]
};
function safeQuestionText(field,value){
 const render=QUESTION_TEMPLATES[field];
 if(!render)throw Error(`No question text template for ${field}`);
 const q=render(value);
 if(!q||!q.endsWith('?')||q.length>145)throw Error('Question punctuation or length invalid for '+field+': '+value);
 return q;
}
function token(field,value){return `${field}:${value}`;}
export function compileThematicModel(targets,{minYes=1,minNo=1}={}){
 const profiles=targets.map(t=>traitsFromWorkBook(t));
 const potentials=new Map();
 for(let i=0;i<targets.length;i++){
  for(const [field,value] of profiles[i]){
   if(!QUESTION_TEMPLATES[field])continue;
   if(field==='subtopic'&&!SUBCATEGORY_PROMPTS[value])continue;
   const choices=Array.isArray(value)?value:[value];
   for(const part of choices){
    const key=token(field,part);
    if(!potentials.has(key))potentials.set(key,{field,value:part,yes:new Set()});
    potentials.get(key).yes.add(i);
   }
  }
 }
 const questions=[];
 for(const item of potentials.values()){
  const {field,value,yes}=item;
  const known=new Uint8Array(targets.length);
  const states=new Uint8Array(targets.length);
  let valid=0,no=0;
  for(let i=0;i<targets.length;i++){
   if(!isScoped(targets[i],field))continue;
   const profile=profiles[i];
   if(!profile.has(field))continue;
   known[i]=1;
   states[i]=yes.has(i)?3:2;
   valid++;if(!yes.has(i))no++;
  }
  if(yes.size<minYes||no<minNo)continue;
  const text=safeQuestionText(field,value);
  questions.push(Object.freeze({id:`theme_${questions.length}`,field,value,text,known,states,yes:yes.size,no,coverage:valid,scope:field==='topic'?'global':field==='subtopic'?'topic':'specialized'}));
 }
 return {targets,profiles,questions};
}

export function collisionAudit(model){
 const groups=new Map();
 const list=[];
 const {targets,questions}=model;
 for(let i=0;i<targets.length;i++){
  // Every known, binary questionnaire answer contributes; unknown is explicit.
  const fingerprint=questions.map(q=>q.known[i]?q.states[i]===3?'1':'0':'?').join('');
  let group=groups.get(fingerprint);
  if(!group){group=[];groups.set(fingerprint,group);}
  group.push(i);
 }
 const perCategory={};
 for(const t of targets){if(!perCategory[t.category])perCategory[t.category]={count:0,unique:0,colliding:0,maxCluster:0};perCategory[t.category].count++;}
 for(const group of groups.values()){
  const s=group.length;
  for(const i of group){
   const stat=perCategory[targets[i].category];
   if(s===1)stat.unique++;else stat.colliding++;
   stat.maxCluster=Math.max(stat.maxCluster,s);
  }
  if(s>1)list.push({size:s,topic:targets[group[0]].category,sample:group.slice(0,8).map(i=>targets[i].name)});
 }
 list.sort((a,b)=>b.size-a.size);
 return{count:targets.length,questionCount:questions.length,distinctSignatures:groups.size,uniqueProfiles:Object.values(perCategory).reduce((a,b)=>a+b.unique,0),collidingProfiles:Object.values(perCategory).reduce((a,b)=>a+b.colliding,0),perCategory,largestCollisions:list.slice(0,15)};
}

export function selectQuestion(model,remaining,asked=new Set(),recentFamilies=[]){
 if(remaining.length<=1)return null;
 const familyCooldown=new Set(recentFamilies.slice(-2));
 const askedHasYear=recentFamilies.includes('movie_year');
 let best=null;
 for(const q of model.questions){
  if(asked.has(q.id))continue;
  if(q.field==='movie_year'&&(remaining.length>28||askedHasYear))continue;
  let yes=0,no=0,unknown=0;
  for(const i of remaining){
   if(!q.known[i])unknown++;
   else if(q.states[i]===3)yes++;else no++;
  }
  const coverage=(yes+no)/remaining.length;
  if(!yes||!no||coverage<.35)continue;
  // Expected reduction given a yes/no answer, discounted for uncertainty.
  const split=1-Math.abs(yes-no)/(yes+no);
  const score=coverage*split*(familyCooldown.has(q.field)?0.65:1);
  if(!best||score>best.score+1e-12||Math.abs(score-best.score)<1e-12&&q.id<best.id)
   best={...q,score,yesCount:yes,noCount:no,unknownCount:unknown};
 }
 return best;
}
export function applyAnswer(model,remaining,question,value){
 if(!['yes','no','probably','probably_not','unknown'].includes(value))throw Error('Invalid Pam reply');
 if(value==='unknown')return remaining;
 const yes=value==='yes'||value==='probably';
 const soft=value==='probably'||value==='probably_not';
 if(soft){
  // Soft responses should be probabilistic in full gameplay. The lab deliberately
  // retains both strong and unknown answers rather than pretending soft == exact.
  return remaining;
 }
 return remaining.filter(i=>!question.known[i]||(question.states[i]===3)===yes);
}
export function oracleTrial(model,answerIndex,{limit=20,softEvery=0}={}){
 const remainingAll=Array.from({length:model.targets.length},(_,i)=>i);
 let remaining=remainingAll,asked=new Set(),families=[],log=[];
 for(let turn=1;turn<=limit;turn++){
  if(remaining.length===1)return{correct:remaining[0]===answerIndex,turns:turn-1,remaining:remaining.length,log};
  const q=selectQuestion(model,remaining,asked,families);
  if(!q)return{correct:false,turns:turn-1,remaining:remaining.length,reason:'insufficient_known_distinguishers',log};
  asked.add(q.id);families.push(q.field);
  const actual=q.known[answerIndex]?(q.states[answerIndex]===3?'yes':'no'):'unknown';
  const value=softEvery&&turn%softEvery===0&&actual!=='unknown'?(actual==='yes'?'probably':'probably_not'):actual;
  log.push({turn,question:q.text,answer:value,field:q.field,candidateCount:remaining.length});
  remaining=applyAnswer(model,remaining,q,value);
 }
 return{correct:remaining.length===1&&remaining[0]===answerIndex,turns:limit,remaining:remaining.length,reason:'budget',log};
}