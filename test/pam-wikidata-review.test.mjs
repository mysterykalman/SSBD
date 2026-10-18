import test from 'node:test';
import assert from 'node:assert/strict';
import {loadThematicRoster} from '../scripts/pam-thematic-lab.mjs';
import {loadRecovered550,buildIdentityReview} from '../scripts/pam-wikidata-review.mjs';
const [roster,source]=await Promise.all([loadThematicRoster(),loadRecovered550()]);

test('the rescued first 550 Wikidata queries have intact provenance and cover 50 per category',()=>{
 assert.equal(source.completed,550);
 assert.equal(source.results.length,550);
 assert.equal(source.status,'research_candidates_only');
 const ids=new Set();
 for(const row of source.results){
  assert.ok(!ids.has(row.id));ids.add(row.id);
  assert.equal(row.suggested_candidates?.every(x=>/^Q\d+$/.test(x.qid)),true);
 }
});

test('meaning-sensitive ranker improves identity suggestions without approving anything',()=>{
 const r=buildIdentityReview(roster,[source]);
 assert.equal(r.retrieved,550);
 assert.equal(r.missing,1100);
 assert.equal(r.counts.plausible,467);
 assert.equal(r.counts.ambiguous,75);
 assert.equal(r.counts.missing,8);
 assert.equal(r.counts.identityApprovals,0);
 assert.match(r.releaseGate,/BLOCKED/);
 const byName=name=>r.results.find(x=>x.name===name);
 assert.equal(byName('Mount Everest')?.qid_suggestion,'Q513');
 assert.equal(byName('The Wizard of Oz (1939)')?.qid_suggestion,'Q193695');
 assert.equal(byName('The Phantom of the Opera (stage musical)')?.qid_suggestion,'Q382353');
 assert.ok(r.results.every(x=>!x.reviewed));
});

test('source identity mismatches, duplicate rows and silently changed approval states fail closed',()=>{
 const broken={...source,results:[{...source.results[0],name:'Wrong city'},...source.results.slice(1)]};
 assert.throws(()=>buildIdentityReview(roster,[broken]),/mismatches frozen target/);
 const repeated={...source,results:[...source.results,source.results[0]]};
 assert.throws(()=>buildIdentityReview(roster,[repeated]),/Duplicate source rows/);
 const approved={...source,status:'approved'};
 assert.throws(()=>buildIdentityReview(roster,[approved]),/Research doc shape invalid/);
});