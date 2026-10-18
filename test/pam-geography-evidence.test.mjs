import test from 'node:test';
import assert from 'node:assert/strict';
import {observedGeography,compileGeographyResearch} from '../scripts/pam-geography-evidence.mjs';
const fact=(f,v,{t=null,unit=f==='population'?'1':'http://www.wikidata.org/entity/Q712226',rank='normal'}={})=>({f,k:'quantity',v,t,unit,rank,source:'https://www.wikidata.org/wiki/Q30#P1082'});
const src={review_status:'research_only_unverified',subjects:[
 {id:'1',name:'America',category:'Countries',verified:false,claims:[fact('population',320e6,{t:'+2024-01-01',rank:'preferred'}),fact('area',9e6)]},
 {id:'2',name:'Iceland',category:'Countries',verified:false,claims:[fact('population',4e5,{t:'+2025-01-01'}),fact('area',102000)]},
 {id:'3',name:'Canada',category:'Countries',verified:false,claims:[fact('population',45e6,{t:'+2025-01-01'}),fact('area',10e6)]},
 {id:'4',name:'France',category:'Countries',verified:false,claims:[fact('population',68e6,{t:'+2025-01-01'}),fact('area',550000)]},
 {id:'5',name:'No data',category:'Countries',verified:false,claims:[]}
]};
const model={targets:src.subjects.map(x=>({id:x.id,name:x.name,category:x.category})),questions:[]};
test('recent dated populations and square-km units required; stale, other units remain unknown',()=>{
 assert.equal(observedGeography({claims:[fact('population',10e6,{t:'+2004-01-01'})]},'population'),null);
 assert.equal(observedGeography({claims:[fact('area',10000,{unit:'1'})]},'area'),null);
 assert.equal(observedGeography(src.subjects[0],'population').value,320e6);
});
test('large safety margin and missing numbers never imply invented opposite answers',()=>{
 const {model:compiled,report}=compileGeographyResearch(model,src,{minYes:1,minNo:1});
 assert.ok(report.extraQuestions>0);
 const q=compiled.questions.find(x=>x.id==='research_geo_Countries_population_50000000');
 assert.ok(q);assert.equal(q.states[0],3);assert.equal(q.states[1],2);
 assert.equal(q.known[4],0);assert.equal(q.states[4],0);
 assert.equal(q.known[3],1);assert.equal(q.states[3],3);
 assert.ok(compiled.questions.every(x=>x.review_status==='SOURCE_RESEARCH_UNVERIFIED'));
});
test('near threshold is deliberately unknown despite a known observation',()=>{
 const {model:compiled}=compileGeographyResearch(model,src,{minYes:1,minNo:1});
 const q=compiled.questions.find(x=>x.id==='research_geo_Countries_population_50000000');
 assert.equal(q.known[2],0);
});