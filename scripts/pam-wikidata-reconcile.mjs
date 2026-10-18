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
 return [...new Set(terms)];
}
export function scoreCandidate(target,result){
 const label=normalize(result.label||result.match?.text||''),term=normalize(searchTerms(target)[0]);
 const plain=normalize(searchTerms(target).at(-1));
 const description=result.description||'';
 const hint=DESCRIPTION_HINTS[target.category];
 let score=0;
 if(label===term)score+=8;
 else if(label===plain)score+=5;
 else if(keywords(label).join(' ')===keywords(plain).join(' '))score+=4;
 else if(label.includes(plain)&&plain.length>=6)score+=1;
 if(hint?.test(description))score+=3;
 if(/\b(disambiguation|Wikimedia disambiguation|family name|given name)\b/i.test(description))score-=6;
 // A descriptive mismatch is not evidence that the candidate is false, but it
 // MUST be reviewed rather than promoted on name matching alone.
 if(description&&!hint?.test(description))score-=2;
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
 for(const term of terms){
  const doc=await wikidataFetch({action:'wbsearchentities',search:term,language:'en',type:'item',limit:8,format:'json',formatversion:2},options);
  ranked=rankCandidates(target,doc.search);
  if(ranked.length&&ranked[0].score>=7)break;
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
 if(!Number.isInteger(sample)||sample<1||sample>1650)throw Error('--sample must be between 1 and 1650');
 if(!Number.isInteger(pace)||pace<250)throw Error('--pace-ms must be at least 250ms');
 const roster=await loadThematicRoster();const selected=sampleAcrossCategories(roster,sample);
 const result=[];
 const dir=join(root,'data','pam20q','expansion');await mkdir(dir,{recursive:true});
 const output=join(dir,'wikidata-suggestion-sample.json');
 const snapshot=()=>({generated_at:new Date().toISOString(),source:'https://www.wikidata.org/',status:'research_candidates_only',source_policy:'Wikidata CC0; never auto-approve entity matches, claims or negative facts',selected:sample,total:roster.length,completed:result.length,results:result});
 for(let i=0;i<selected.length;i++){
  const target=selected[i];
  try{result.push(await reconcileOne(target));}
  catch(error){result.push({id:target.id,name:target.name,category:target.category,status:'source_error',error:String(error).slice(0,300),suggested_candidates:[]});}
  process.stderr.write(`${i+1}/${selected.length} ${target.id} ${result.at(-1).status}\n`);
  if(result.length%25===0||i===selected.length-1)await writeFile(output,JSON.stringify(snapshot(),null,2)+'\n');
  if(i<selected.length-1)await delay(pace);
 }
 const out=snapshot();
 await writeFile(output,JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify({queried:result.length,single_plausible_not_verified:result.filter(x=>x.status==='single_plausible_not_verified').length,ambiguous:result.filter(x=>x.status==='ambiguous_needs_review').length,not_found:result.filter(x=>x.status==='not_found').length,source_error:result.filter(x=>x.status==='source_error').length}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])await main();