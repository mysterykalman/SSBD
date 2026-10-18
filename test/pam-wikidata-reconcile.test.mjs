import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreCandidate,searchTerms,rankCandidates,matchSuggestion,wikidataFetch} from '../scripts/pam-wikidata-reconcile.mjs';
const target=(name,category)=>({name,category});
test('Wikidata cannot silently substitute a different concept with an identical name',()=>{
 const apple=target('Apple','Brands');
 const corp={id:'Q312',label:'Apple',description:'American technology company'};
 const fruit={id:'Q89',label:'Apple',description:'edible fruit'};
 const ranked=rankCandidates(apple,[fruit,corp]);
 assert.equal(ranked[0].qid,'Q312');
 assert.equal(matchSuggestion(apple,ranked),'single_plausible_not_verified');
 assert.ok(scoreCandidate(apple,fruit)<scoreCandidate(apple,corp));
});
test('ambiguous paintings and sculptures stay review-only',()=>{
 const kiss=target('The Kiss (Rodin sculpture)','Monuments, Paintings & Sculptures');
 assert.deepEqual(searchTerms(kiss),['The Kiss (Rodin sculpture)','The Kiss']);
 const options=rankCandidates(kiss,[
  {id:'Q1',label:'The Kiss',description:'painting by Gustav Klimt'},
  {id:'Q2',label:'The Kiss',description:'sculpture by Auguste Rodin'}
 ]);
 assert.equal(matchSuggestion(kiss,options),'ambiguous_needs_review');
});
test('unrecognized exact names are not marked as verified',()=>{
 assert.equal(matchSuggestion(target('XYZ','Cities'),[]),'not_found');
 assert.equal(matchSuggestion(target('XYZ','Cities'),[{score:5}]),'ambiguous_needs_review');
});
test('Wikidata client respects JSON shape and does not need network in unit tests',async()=>{
 let called='';
 const result=await wikidataFetch({action:'wbsearchentities',search:'Montréal',format:'json'},
 {fetchImpl:async(url,opts)=>{called=url;assert.match(opts.headers['User-Agent'],/SSBD/);return {status:200,ok:true,json:async()=>({search:[{id:'Q340',label:'Montréal'}]})};}});
 assert.ok(called.includes('wbsearchentities'));
 assert.equal(result.search[0].id,'Q340');
});
test('geographic context distinguishes Mount Everest in Himalayas from identically named mountains',()=>{
 const target={name:'Mount Everest',category:'Landmarks',subcategory:'Natural Landmarks',context:'Himalayas, Nepal / China'};
 const candidates=[
  {id:'Q21939846',label:'Mount Everest',description:'mountain in New South Wales, Australia'},
  {id:'Q513',label:'Mount Everest',description:"Earth's highest mountain above sea level, located in the Mahalangur Himal sub-range of the Himalayas"},
  {id:'Q31505139',label:'Mount Everest',description:'mountain in the Free State Province, South Africa'}
 ];
 const ranked=rankCandidates(target,candidates);
 assert.equal(ranked[0].qid,'Q513');
 assert.equal(matchSuggestion(target,ranked),'single_plausible_not_verified');
});

test('a film date prioritizes its actual release over the book, soundtrack and game',()=>{
 const target={name:'The Wizard of Oz (1939)',category:'Movies',subcategory:'Classic Cinema (to 1979)',context:'1939'};
 const ranked=rankCandidates(target,[
  {id:'Q127901334',label:'The Wizard of Oz',description:'film series'},
  {id:'Q193695',label:'The Wizard of Oz',description:'1939 movie based on the book by L. Frank Baum'},
  {id:'Q131581585',label:'The Wizard of Oz',description:'soundtrack album of the 1939 film'}
 ]);
 assert.equal(ranked[0].qid,'Q193695');
});

test('stage musical provenance differentiates it from a similarly titled musical film',()=>{
 const target={name:'The Phantom of the Opera (stage musical)',category:'Musicals',subcategory:'Stage Musicals',context:'Andrew Lloyd Webber'};
 const ranked=rankCandidates(target,[
  {id:'Q276407',label:'The Phantom of the Opera',description:'2004 musical film directed by Joel Schumacher'},
  {id:'Q382353',label:'The Phantom of the Opera',description:'musical with music by Andrew Lloyd Webber'},
  {id:'Q3988705',label:'The Phantom of the Opera',description:'musical with music by Paul Schierhorn and Lawrence Rosen'}
 ]);
 assert.equal(ranked[0].qid,'Q382353');
 assert.equal(matchSuggestion(target,ranked),'single_plausible_not_verified');
});

test('US country context does not match the substring USA in the Philippine place name Agusan',()=>{
 const target={name:'San Francisco',category:'Cities',subcategory:'North America',context:'United States'};
 const ranked=rankCandidates(target,[
  {id:'Q627190',label:'San Francisco',description:'municipality of the Philippines in the province of Agusan del Sur'},
  {id:'Q62',label:'San Francisco',description:'city and county in California, United States'}
 ]);
 assert.equal(ranked[0].qid,'Q62');
 assert.ok(ranked[0].score-ranked[1].score>=3);
});

test('country aliases add searches but never silently approve matching Wikidata entities',()=>{
 const t={name:'Türkiye',category:'Countries',subcategory:'Asia & Middle East',context:null};
 assert.ok(searchTerms(t).includes('Turkey'));
 const ranked=rankCandidates(t,[{id:'Q43',label:'Turkey',description:'country in West Asia and Southeast Europe'}]);
 assert.notEqual(matchSuggestion(t,ranked),'approved');
});