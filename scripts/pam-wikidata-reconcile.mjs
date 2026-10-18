/**
 * Gather public, source-linked Wikidata match CANDIDATES for SSBD's 1,650 names.
 * Does not alter gameplay, mark facts approved, or assert negative facts.
 * Respect Wikimedia API rate limits; back off on 429; throttle sequentially.
 */
import {loadThematicRoster} from './pam-thematic-lab.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(fileURLToPath(new URL('.',import.meta.url)),'..');
const SEARCH='https://www.wikidata.org/w/api.php';
const UA='SSBD-family-word-game-research/0.2 (public structured-data research; no edits)';
const DESCRIPTION_HINTS={
 'Cities':/\b(city|town|municipality|capital|metropolitan|settlement)\b/i,
 'Countries':/\b(country|sovereign state|republic|kingdom|state in|nation)\b/i,
 'Monuments, Paintings & Sculptures':/\b(painting|artwork|sculpture|statue|monument|temple|cathedral|mosque|historic|basilica|church|palace|mural|landmark|castle|archaeological|fresco|building|public art|art installation)\b/i,
 'Landmarks':/\b(mountain|landmark|volcano|waterfall|natural|park|gorge|valley|reef|canyon|island|arch|lake|river|mount|hill|coast|desert|fort|castle|tower|bridge|building|palace|site|monument|stadium|bay|forest|rock|cave)\b/i,
 'Bands & Music Groups':/\b(band|musical group|music group|rock group|hip hop|vocal group|duo|ensemble|collective|orchestra)\b/i,
 'People':/\b(person|actor|actress|singer|musician|physicist|inventor|scientist|president|prime minister|politician|author|artist|poet|writer|director|athlete|player|chemist|engineer|composer|comedian|mathematician|astronomer|monarch|king|queen|historian|activist|philosopher)\b/i,
 'Brands':/\b(brand|company|trademark|business|corporation|manufacturer|retailer|platform|firm|product|subsidiary|chain|service)\b/i,
 'Movies':/\b(film|movie|motion picture)\b/i,
 'TV Shows':/\b(television|TV series|sitcom|game show|reality show|animated series|TV show)\b/i,
 'Musicals':/\b(musical|musical theatre|stage show|Broadway|opera)\b/i,
 'Car Companies':/\b(car|automotive|automobile|manufacturer|automaker|motor company|vehicle|marque)\b/i
};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const normalize=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('en').replace(/^[Tt]he\s+/,'').replace(/\s+/g,' ').trim();
function keywords(s){return normalize(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);}
export function searchTerms(target){
 const terms=[target.name];
 const stripped=target.name.replace(/\s*\([^)]*\)\s*$/,'').trim();
 if(stripped!==target.name)terms.push(stripped);
 for(const alias of QUERY_ALIASES[target.name]||[])terms.push(alias);
 if(target.category==='Musicals')terms.push(stripped+' musical');
 return [...new Set(terms)];
}
/**
 * An entity match is an identity suggestion, never a factual assertion. The
 * context checks deliberately prefer the right film/year, painting/medium,
 * city/country and person/occupation over same-named unrelated entities.
 * Ratings must NOT be treated as verified or used in production without review.
 */
const QUERY_ALIASES=Object.freeze({
 'Czechia':['Czech Republic'],'Türkiye':['Turkey'],'Ivory Coast':["Côte d'Ivoire"],'South Korea':['Republic of Korea'],
 'The Bedroom (Van Gogh)':['Bedroom in Arles','Van Gogh bedroom'],
 'National War Memorial, Ottawa':['National War Memorial (Canada)','The Response Ottawa'],
 'Merlion statue':['Merlion'], 'Seoul N Tower':['N Seoul Tower'],
 "Bird's Nest Stadium":['Beijing National Stadium'],
 'Kremlin of Moscow':['Moscow Kremlin'], 'Ta Prohm Temple':['Ta Prohm'],
 'Grand Palace of Bangkok':['Grand Palace'], 'Tepuis of Mount Roraima':['Mount Roraima'],
 'Batu Caves temple complex':['Batu Caves'], 'Sigiriya rock fortress':['Sigiriya'],
 'Jökulsárlón Glacier Lagoon':['Jökulsárlón'], 'Gullfoss waterfall':['Gullfoss']
});
const COUNTRY_ALIASES=Object.freeze({
 'United States':['united states','u.s.','usa','american'],
 'United Kingdom':['united kingdom','u.k.','britain','british','english','scottish','welsh'],
 'South Korea':['south korea','republic of korea','korean'],
 'United Arab Emirates':['united arab emirates','emirati','uae'],
 'Türkiye':['turkey','türkiye','turkish'],
 'Czechia':['czech republic','czechia'],
});
const INFO_WORDS=new Set(['the','and','with','from','of','in','at','to','on','or','a','an','near',
 'north','south','east','west','stage','film','painting','mountain','sculpture','island','landmark',
 'located','historic','history','ancient','modern','famous','rock','known','united','states']);
function contextualTerms(context){
 const raw=String(context||'');
 const tokens=[...new Set((raw.normalize('NFKD').replace(/\p{M}/gu,'').match(/[\p{L}\p{N}]+/gu)||[])
  .map(x=>x.toLowerCase()).filter(x=>x.length>=4&&!INFO_WORDS.has(x)))];
 return tokens.filter(x=>!/^\d{4}$/.test(x)).slice(0,8);
}
function categoryEvidence(target,description){
 const d=String(description||'').toLowerCase();
 const t=target.category,sub=target.subcategory;
 let score=0;
 if(t==='Movies'){
  if(/\b(film series|soundtrack|song|album|television series|video game)\b/.test(d))score-=7;
  if(/\b(film|motion picture|movie)\b/.test(d)&&!/film series/.test(d))score+=5;
  const match=String(target.context||'').match(/^(18|19|20)\d{2}$/);
  if(match){const y=match[0];if(new RegExp('\\b'+y+'\\b').test(d))score+=7;
   else if(/\b(18|19|20)\d{2}\b/.test(d))score-=3;}
 }
 if(t==='TV Shows'){
  if(/\b(television series|tv series|sitcom|game show|reality show)\b/.test(d))score+=7;
  if(/\b(song|album|film|episode|book|pinball)\b/.test(d))score-=6;
 }
 if(t==='Musicals'){
  if(/\b(stage musical|broadway musical|musical theatre|musical with music|musical based)\b/.test(d))score+=9;
  else if(/\bmusical\b/.test(d))score+=4;
  if(/\b(film|album|city|town|musical film|film series|song|novel)\b/.test(d))score-=7;
  const ctx=contextualTerms(target.context);score+=Math.min(9,ctx.filter(x=>d.includes(x)).length*4);
 }
 if(t==='Monuments, Paintings & Sculptures'){
  if(sub==='Paintings'){
   if(/\b(painting|fresco|artwork|oil on canvas)\b/.test(d))score+=5;
   if(/\b(sculpture|song|album|novel|film)\b/.test(d))score-=5;
  }
  if(sub==='Sculptures & Public Art'){
   if(/\b(sculpture|statue|public art|installation)\b/.test(d))score+=5;
   if(/\b(painting|song|album|novel|film)\b/.test(d))score-=5;
  }
  if(sub==='Monuments & Historic Sites'&&/\b(temple|church|castle|monument|historic|archaeological|palace|heritage|cathedral|building)\b/.test(d))score+=3;
 }
 if(t==='Landmarks'){
  if(sub==='Natural Landmarks'){
   if(/\b(mountain|river|waterfall|volcano|national park|valley|canyon|lake|island|desert|reef|forest)\b/.test(d))score+=6;
   if(/\b(painting|song|band|film|building|novel)\b/.test(d))score-=6;
  }
  if(sub==='Built Landmarks & Attractions'&&/\b(bridge|tower|building|monument|stadium|cathedral|temple|castle|museum)\b/.test(d))score+=5;
 }
 if(t==='Cities'){
  if(/\b(city|large city|capital city|major city)\b/.test(d))score+=5;
  if(/\b(subdistrict|village|province|county|borough|neighbourhood|neighborhood)\b/.test(d))score-=6;
 }
 if(t==='Bands & Music Groups'){
  if(/\b(discography|album discography|record label|episode|webcomic|video game|single by|soundtrack)\b/.test(d))score-=13;
  if(/\b(girl group|boy band|pop group|rock band|musical duo|hip hop group|vocal pop group|k-pop group)\b/.test(d))score+=7;
 }
 if(t==='Brands'){
  if(/\b(restaurant chain|fast food restaurants|drink brand|energy drink|clothing brand|electronics company|fast casual)\b/.test(d))score+=6;
  if(/\b(former .*restaurant chain|former .*company|smoke-dried|edible fruit|pepper|software development team)\b/.test(d))score-=7;
 }
 if(t==='Landmarks'){
  if(/\b(observation decks? inside|observation deck at|view from the)\b/.test(d))score-=8;
  if(/\b(skyscraper|landmark building|tower in|stadium in|bridge in)\b/.test(d))score+=4;
 }
 if(t==='Monuments, Paintings & Sculptures'&&sub==='Paintings'){
  if(/\b(tapestry|reproduction|replica|after the original|weaving)\b/.test(d))score-=12;
 }
 if(t==='People'){
  if(/\b(album|song|film|band|group|submarine|book|podcast|episode)\b/.test(d))score-=6;
  const ctx=contextualTerms(target.context), normalized=d.replace(/[-]/g,'');
  if(ctx.some(w=>normalized.includes(w)))score+=6;
  if(/\b(person|human|artist|physicist|chemist|actor|politician|singer|writer|scientist|mathematician|naturalist|president|astrophysicist|inventor|athlete|author|composer|polymath|philosopher|biologist|primatologist|historian)\b/.test(d))score+=4;
 }
 if(t==='Bands & Music Groups'){
  if(/\b(band|musical group|music group|rock group|vocal group|duo|orchestra)\b/.test(d))score+=4;
  if(/\b(pinball|sculpture|song|album|novel|film|record)\b/.test(d))score-=5;
 }
 if(t==='Brands'||t==='Car Companies'){
  if(/\b(company|manufacturer|automotive|automobile|corporation|business|brand|car marque|division of general motors|retailer)\b/.test(d))score+=4;
  if(/\b(song|album|person|city|town|film|family name|genus|journal|comic)\b/.test(d))score-=5;
  if(t==='Car Companies'&&/\b(automotive|automobile manufacturing company|motor corporation|car manufacturer|motor company)\b/.test(d))score+=3;
 }
 if(t==='Countries'){
  if(/\b(country|sovereign state|republic|kingdom)\b/.test(d))score+=5;
  if(/\b(former|historical|national team|island of|part of the|state of|province of)\b/.test(d))score-=5;
 }
 return score;
}
export function scoreCandidate(target,result){
 const label=normalize(result.label||result.match?.text||''),term=normalize(searchTerms(target)[0]);
 const plain=normalize(String(target.name).replace(/\s*\([^)]*\)\s*$/,'').trim());
 const description=result.description||'';
 const hint=DESCRIPTION_HINTS[target.category];
 let score=0;
 if(label===term)score+=8;
 else if(label===plain)score+=5;
 else if(keywords(label).join(' ')===keywords(plain).join(' '))score+=4;
 else if(label.includes(plain)&&plain.length>=6)score+=1;
 if(hint?.test(description))score+=3;
 if(/\b(disambiguation|Wikimedia disambiguation|family name|given name)\b/i.test(description))score-=6;
 if(description&&!hint?.test(description))score-=2;
 score+=categoryEvidence(target,description);
 const cd=description.toLowerCase();
 if(target.category==='Cities'||target.category==='Car Companies'){
  const wanted=String(target.context||'').trim();
  if(wanted){
   const aliases=COUNTRY_ALIASES[wanted]||[wanted.toLowerCase()];
   if(aliases.some(a=>new RegExp('(^|[^a-z])'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z])').test(cd)))score+=8;
   // If another explicit country is described while the desired country's
   // English name is not, do not make the false-positive an exact match.
  }
 }else if(target.category==='Landmarks'||target.category==='Monuments, Paintings & Sculptures'){
  const tokens=contextualTerms(target.context);
  const matched=tokens.filter(t=>cd.includes(t));
  score+=Math.min(9,matched.length*3);
 }
 return score;
}
export function rankCandidates(target,searchResults){
 return (searchResults||[]).filter(r=>/^Q\d+$/.test(r.id||''))
  .map(result=>({qid:result.id,label:result.label||'',description:result.description||'',score:scoreCandidate(target,result),url:`https://www.wikidata.org/wiki/${result.id}`}))
  .sort((a,b)=>b.score-a.score||a.qid.localeCompare(b.qid)).slice(0,8);
}
export function matchSuggestion(target,ranked){
 if(!ranked.length)return 'not_found';
 if(ranked[0].score<7)return 'ambiguous_needs_review';
 if(ranked.length>1&&ranked[0].score-ranked[1].score<3)return 'ambiguous_needs_review';
 return 'single_plausible_not_verified';
}
export async function wikidataFetch(params,{fetchImpl=fetch,maxAttempts=4}={}){
 const url=new URL(SEARCH);for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  const resp=await fetchImpl(url.toString(),{headers:{'User-Agent':UA,'Accept':'application/json'},signal:AbortSignal.timeout(15000)});
  if(resp.status===429||resp.status===503){
   if(attempt===maxAttempts)throw Error(`Wikidata rate limit ${resp.status} after ${attempt} attempts`);
   const raw=Number(resp.headers.get('retry-after'));
   const ms=Math.min(60000,Math.max(1200,Number.isFinite(raw)&&raw>0?raw*1000:1000*2**attempt));
   await delay(ms);continue;
  }
  if(!resp.ok)throw Error(`Wikidata ${resp.status}: ${url.pathname}`);
  return await resp.json();
 }
 throw Error('Wikidata retry loop exited unexpectedly');
}
export async function reconcileOne(target,options={}){
 const terms=searchTerms(target);
 let ranked=[];
 const candidates=new Map();
 for(const term of terms){
  const doc=await wikidataFetch({action:'wbsearchentities',search:term,language:'en',type:'item',limit:8,format:'json',formatversion:2},options);
  for(const result of doc.search||[])if(/^Q\\d+$/.test(result.id||''))candidates.set(result.id,result);
  ranked=rankCandidates(target,[...candidates.values()]);
  // An ambiguous first search must not prevent a contextual alias query.
  if(matchSuggestion(target,ranked)==='single_plausible_not_verified')break;
 }
 return {id:target.id,name:target.name,category:target.category,subcategory:target.subcategory,
  source_context:target.context,status:matchSuggestion(target,ranked),suggested_candidates:ranked};
}

function sampleAcrossCategories(rows,count){
 const buckets=new Map();for(const row of rows){if(!buckets.has(row.category))buckets.set(row.category,[]);buckets.get(row.category).push(row);}
 const groups=[...buckets.values()],selected=[];
 for(let i=0;selected.length<count;i++){
  let fresh=false;
  for(const group of groups){if(i<group.length&&selected.length<count){selected.push(group[i]);fresh=true;}}
  if(!fresh)break;
 }
 return selected;
}
async function main(){
 const args=process.argv.slice(2);
 const getNum=(prefix,def)=>{const a=args.find(x=>x.startsWith('--'+prefix+'='));return a?Number(a.split('=')[1]):def;};
 const sample=getNum('sample',11),pace=getNum('pace-ms',1100);
 const offset=getNum('offset',0),count=getNum('count',sample-offset);
 if(!Number.isInteger(sample)||sample<1||sample>1650)throw Error('--sample must be between 1 and 1650');
 if(!Number.isInteger(pace)||pace<250)throw Error('--pace-ms must be at least 250ms');
 if(!Number.isInteger(offset)||offset<0||offset>=sample||!Number.isInteger(count)||count<1||offset+count>sample)throw Error('Invalid --offset/--count shard boundaries');
 const roster=await loadThematicRoster();const selected=sampleAcrossCategories(roster,sample).slice(offset,offset+count);
 const result=[];
 const dir=join(root,'data','pam20q','expansion');await mkdir(dir,{recursive:true});
 const output=join(dir,offset===0&&count===sample?'wikidata-suggestion-sample.json':`wikidata-suggestion-shard-${String(offset).padStart(4,'0')}.json`);
 const snapshot=()=>({generated_at:new Date().toISOString(),source:'https://www.wikidata.org/',status:'research_candidates_only',source_policy:'Wikidata CC0; never auto-approve entity matches, claims or negative facts',selected:sample,total:roster.length,offset,count,completed:result.length,results:result});
 for(let i=0;i<selected.length;i++){
  const target=selected[i];
  try{result.push(await reconcileOne(target));}
  catch(error){result.push({id:target.id,name:target.name,category:target.category,status:'source_error',error:String(error).slice(0,300),suggested_candidates:[]});}
  process.stderr.write(`${i+1}/${selected.length} (global=${offset+i+1}) ${target.id} ${result.at(-1).status}\n`);
  if(result.length%25===0||i===selected.length-1)await writeFile(output,JSON.stringify(snapshot(),null,2)+'\n');
  if(i<selected.length-1)await delay(pace);
 }
 const out=snapshot();
 await writeFile(output,JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify({queried:result.length,single_plausible_not_verified:result.filter(x=>x.status==='single_plausible_not_verified').length,ambiguous:result.filter(x=>x.status==='ambiguous_needs_review').length,not_found:result.filter(x=>x.status==='not_found').length,source_error:result.filter(x=>x.status==='source_error').length}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])await main();