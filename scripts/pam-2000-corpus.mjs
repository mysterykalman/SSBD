// Returns REVIEW-ONLY lexical leads extracted from the large SSBD concept
// reservoir. Corpus category metadata is noisy, so no corpus Y/N answer value
// is ever copied into the Pam knowledge matrix.
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {classifyPamLexicalLead} from './pam-2000-lexical-classifier.mjs';
const source='docs/pam-knowledge-fill/all-concepts.csv';
const broad=new Set(['common_concepts','actual_20q_answers','concrete_concepts','everyday_things']);
const truthCategory={
 bird:'animal',fish:'animal',mammal:'animal',hoof:'animal',reptile:'animal',amphibian:'animal',insect:'animal',invert:'animal',
 tree:'plant',plant:'plant',fruit:'food_drink',berry:'food_drink',herb:'food_drink',root:'food_drink',vegetable:'food_drink',
 dessert:'food_drink',meal:'food_drink',beverage:'food_drink',
 gem:'object',rock:'object',instrument:'object',vehicle:'object',tool:'object',wear:'object',kitchen:'object',office:'object',sport:'object'
};
const bad=new Set([
 'donald duck','mickey mouse','family tree','b-tree','full metal jacket','conveyor belt','gift wrap','baking soda',
 'ice cap','sea horse','poop-knife','text file','computer file','binary file','data file','artificial organ',
 'molecular cloud','eurofighter typhoon','irish coffee','coca-cola','yorkshire pudding','black pudding',
 'meat pie','ice tea','fancy dress','mole rat','mince pie','hobbit','hunger games'
]);
const normalize=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/^[at]he?\s+/,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const parse=line=>{
 const cells=[];let v='',inside=false;
 for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(inside&&line[i+1]==='"'){v+='"';i++;}else inside=!inside;}else if(c===','&&!inside){cells.push(v);v='';}else v+=c;}
 cells.push(v);return cells;
};
export async function loadPamLexicalLeads(){
 const results=[],seen=new Set();let header=null;
 const stream=createInterface({input:createReadStream(source,{encoding:'utf8'}),crlfDelay:Infinity});
 for await(const line of stream){
  if(!line.trim())continue;
  if(!header){header=parse(line);continue;}
  const row=parse(line);
  const name=row[header.indexOf('name')]?.trim(),sourceCategory=row[header.indexOf('category')];
  if(!name||!sourceCategory)continue;
  const key=normalize(name);
  if(!key||seen.has(key)||bad.has(key))continue;
  const lexical=classifyPamLexicalLead(name);
  if(!lexical||!truthCategory[lexical.kind])continue;
  if(sourceCategory!==truthCategory[lexical.kind]&&!broad.has(sourceCategory))continue;
  // Strongly avoid ambiguous collections and 'thing of...' language.
  if(/^(?:the|some|several|many|types? of|pair of|pile of|group of)\s/i.test(name))continue;
  if(/\b(?:family tree|artificial organ|doll|toy story|track|game|time|model|record|film|series|company|cartoon|character|subspecies|extinct|fossil)\b/i.test(name))continue;
  // A named animal can be a fictional character, especially in seed data.
  if(/^(?:Mickey|Donald|Daffy|Bugs|Tweety|Porky|Woody|Sonic|Garfield|Sylvester|Felix|Winnie|Simba|Dumbo|Baloo|Pooh|Pikachu|Gromit)\b/i.test(name))continue;
  if(/\b(?:electric ray|sea lion|sea horse)\b/i.test(name)&&lexical.kind==='hoof')continue;
  const rank=Number(row[header.indexOf('rank')])||999999;
  seen.add(key);
  results.push({name,kind:lexical.kind,sourceCategory,source:'lexical_pattern_only',rank});
 }
 return results;
}
export function normalizePamName(s){return normalize(s).replace(/^(?:a|an|the)\s+/,'');}
