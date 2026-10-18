import test from 'node:test';
import assert from 'node:assert/strict';
import {loadThematicRoster,compileThematicModel} from '../scripts/pam-thematic-lab.mjs';
import {loadSourceEvidence550,compileSourceResearch} from '../scripts/pam-source-evidence-compiler.mjs';
import {knownOppositeAudit} from '../scripts/pam-known-opposite-audit.mjs';
import {pruneRedundantQuestions} from '../scripts/pam-question-prune.mjs';

const roster=await loadThematicRoster();
const baseline=compileThematicModel(roster);
const source=await loadSourceEvidence550();
const combined=compileSourceResearch(baseline,source);

test('recovered public-source fact dataset is valid, unapproved and has provenance',()=>{
 assert.equal(source.subjects.length,467);
 assert.ok(source.subjects.every(s=>s.verified===false));
 assert.ok(source.subjects.every(s=>s.claims.every(c=>c.source.startsWith('https://www.wikidata.org/wiki/'))));
 assert.equal(combined.report.sourceSubjects,467);
 assert.equal(combined.report.sourcePositiveClaims,6038);
 assert.match(combined.report.releaseGate,/BLOCKED/);
});

test('source-backed questions are readable and all explicitly unapproved',()=>{
 const additions=combined.model.questions.slice(baseline.questions.length);
 assert.ok(additions.length>=50);
 assert.ok(additions.every(q=>q.review_status==='SOURCE_RESEARCH_UNVERIFIED'));
 assert.ok(additions.every(q=>q.yes>=2&&q.no>=0));
 // Open-world Wikidata properties never prove a negative from absence.
 assert.ok(additions.filter(q=>q.evidence_scope==='POSITIVE_ONLY_OPEN_WORLD').every(q=>q.no===0));
 // Dated threshold comparisons can have both observed true and false answers.
 assert.ok(additions.some(q=>q.no>=2));
 assert.ok(additions.every(q=>q.text.endsWith('?')&&q.text.length<=150));
 assert.ok(additions.every(q=>!(/Q\d{2,}/.test(q.text))));
});

test('source country evidence separates cities across borders without fabricating absent cities\u2019 answers',()=>{
 const ny=roster.findIndex(x=>x.name==='New York City');
 const la=roster.findIndex(x=>x.name==='Los Angeles');
 const montreal=roster.findIndex(x=>x.name==='Montréal');
 const other=50; // 51st city: outside the recovered 50-city source window
 assert.equal(roster[other].category,'Cities');
 const q=combined.model.questions.find(x=>x.field==='place_country'&&x.text.includes('the United States'));
 assert.ok(q);
 assert.equal(q.states[ny],3);
 assert.equal(q.states[la],3);
 // Montréal has evidence for Canada, but no explicit source claim proving
 // the negative "not United States" in an approved exclusive-domain model.
 assert.equal(q.known[montreal],0);
 assert.equal(q.states[montreal],0);
 // The research source includes the first 50 cities but not every city.
 assert.equal(q.known[other],0);
});

test('source evidence improves strict separability without approving production data',()=>{
 const first=knownOppositeAudit(baseline),second=knownOppositeAudit(combined.model);
 assert.equal(first.unresolvedPairs,34901);
 // Positive source claims stay unknown for negatives; only direct
 // observed-year thresholds with known opposites may reduce ambiguity.
 assert.ok(second.unresolvedPairs<=first.unresolvedPairs);
 assert.ok(second.unresolvedPairs>0,'Research alone cannot resolve every identity');
 assert.ok(second.uniquelySeparable>=first.uniquelySeparable);
 assert.equal(baseline.questions.length,351,'baseline questions unchanged');
 const pruned=pruneRedundantQuestions(combined.model);
 assert.ok(pruned.report.after<combined.model.questions.length);
 assert.equal(knownOppositeAudit(pruned.model).unresolvedPairs,second.unresolvedPairs,
  'Pruning must not erase any verified known-opposite distinctions');
});

test('a falsely approved subject or changed frozen name is rejected before compilation',()=>{
 const first=source.subjects[0];
 assert.throws(()=>compileSourceResearch(baseline,{...source,subjects:[{...first,verified:true},...source.subjects.slice(1)]}),/Automated factual verification is forbidden/);
 assert.throws(()=>compileSourceResearch(baseline,{...source,subjects:[{...first,name:'Wrong name'},...source.subjects.slice(1)]}),/does not match roster/);
});