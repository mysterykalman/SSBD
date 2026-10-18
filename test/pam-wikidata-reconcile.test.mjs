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