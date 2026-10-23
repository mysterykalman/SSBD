import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPamCombinedResearch} from '../scripts/pam-combined-research.mjs';

const merged=await loadPamCombinedResearch();
test('real recovered thematic roster is physically combined with untouched original answers',()=>{
 const m=merged.metadata;
 assert.equal(m.originalTargets,1775);assert.equal(m.sourceRoster,1650);
 assert.equal(m.netNewTargets,1650);
 assert.equal(m.overlaps.length,1);
 assert.equal(m.resolvedAliases.length,1);
 assert.ok(merged.targets.includes('Dove (personal care brand)'));
 assert.ok(merged.targets.includes('dove'));
 assert.equal(m.combinedTargets,3425);
 assert.equal(m.combinedTargets,1775+m.netNewTargets);
 assert.equal(merged.targets.length,m.combinedTargets);
 assert.equal(merged.questions.length,m.combinedQuestions);
 assert.equal(merged.weights.length,m.combinedTargets*m.combinedQuestions);
 assert.equal(merged.knownMask.length,m.combinedTargets*m.combinedQuestions);
 assert.ok(m.experimentalQuestions>0);
 assert.equal(merged.status,'RESEARCH_ONLY_NOT_PLAYABLE');
});
test('unknown cross-cohort facts never become false answers',()=>{
 const {originalTargets:oldN,originalQuestions:oldF,combinedTargets:N,combinedQuestions:F}=merged.metadata;
 for(let q=0;q<oldF;q++)for(let i=oldN;i<N;i++)assert.equal(merged.knownMask[q*N+i],0);
 for(let q=oldF;q<F;q++)for(let i=0;i<oldN;i++)assert.equal(merged.knownMask[q*N+i],0);
 assert.equal(merged.metadata.oldQuestionOnNewSubjectKnownCells,0);
 assert.equal(merged.metadata.newQuestionOnOldSubjectKnownCells,0);
 assert.equal(merged.metadata.missingCrossCohortCells,oldF*(N-oldN)+(F-oldF)*oldN);
});
test('all original known and unknown mask values survive byte-for-byte',async()=>{
 const {loadPamClassicModel}=await import('../scripts/pam-classic-model.mjs');
 const {loadPam1775Model}=await import('../scripts/pam-quality-model.mjs');
 const {enrichPamModel}=await import('../scripts/pam-enrich-model.mjs');
 const {applyVerifiedPamFacts}=await import('../scripts/pam-verified-facts.mjs');
 const {applyReviewedPamCorrections}=await import('../scripts/pam-reviewed-corrections.mjs');
 const original=await loadPam1775Model(loadPamClassicModel).then(enrichPamModel).then(applyVerifiedPamFacts).then(applyReviewedPamCorrections);
 const N=merged.targets.length,n=1775;
 for(let q=0;q<156;q++)for(let i=0;i<n;i++){
  assert.equal(merged.weights[q*N+i],original.weights[q*n+i]);
  assert.equal(merged.knownMask[q*N+i],original.knownMask[q*n+i]);
 }
});
