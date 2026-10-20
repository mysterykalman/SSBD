import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';
import {enrichPamModel} from '../scripts/pam-enrich-model.mjs';
import {applyVerifiedPamFacts} from '../scripts/pam-verified-facts.mjs';
import {applyReviewedPamCorrections} from '../scripts/pam-reviewed-corrections.mjs';

// Test the real production question-selection engine with the actual compiled
// 1,775-target library, not a substitute scoring algorithm.
const raw=await applyVerifiedPamFacts(enrichPamModel(await loadPam1775Model(loadPamClassicModel)));
const revised=await applyReviewedPamCorrections(raw);
const doc=JSON.parse(await readFile(new URL('../data/pam20q/reviews/classic-batch-001.json',import.meta.url),'utf8'));
const source=await readFile(new URL('../src/client/mom-mode/engine.js',import.meta.url),'utf8');
const selected=[...new Set([...doc.rows.map(x=>x.name),...doc.scopedCorrections.map(x=>x.target)])];
const n=raw.targets.length;
const categories={animal:0,vegetable:1,mineral:2,other:3};
function engineWith(weights) {
  const ctx={window:{PAM_CLASSIC_MODEL:{questions:raw.questions,targets:raw.targets,weightsB64:Buffer.from(weights).toString('base64'),knownMaskB64:Buffer.from(raw.knownMask).toString('base64')}},atob:s=>Buffer.from(s,'base64').toString('binary')};
  vm.runInNewContext(source,ctx,{filename:'engine.js'});
  assert.equal(ctx.window.PamClassic20Q.N,1775);
  return ctx.window.PamClassic20Q;
}
const oldEngine=engineWith(raw.weights),newEngine=engineWith(revised.weights);
function play(engine,weights,targetIndex,soft) {
  const game=engine.createGame({budget:20,minGuessQuestions:7});
  let step=engine.choose(game);
  assert.equal(step.kind,'category');
  let best='other',score=-1;
  for(const [category,q] of Object.entries(categories)) {
    const value=weights[q*n+targetIndex];
    const candidate=(value&1)?((value&2)?3:2):((value&2)?0:1);
    if(candidate>score){score=candidate;best=category;}
  }
  step=engine.setCategory(game,best);
  for(let guard=0;guard<40;guard++) {
    if(step.kind==='question') {
      const cell=step.index*n+targetIndex;
      const state=weights[cell];
      const answer=!raw.knownMask[cell]?'maybe':soft?['doubtful','probably','no','yes'][state]:(state&1)?'yes':'no';
      step=engine.answer(game,step,answer);
      continue;
    }
    if(step.kind==='hunch') {
      step=step.index===targetIndex?engine.commitGuess(game,step):engine.deferGuess(game,step);
      continue;
    }
    if(step.kind==='guess')return{correct:step.index===targetIndex,guessed:step.label,questions:game.turn};
    throw Error('Unknown Pam engine action '+step.kind);
  }
  throw Error('Pam simulation exceeded iteration guard for '+raw.targets[targetIndex]);
}
for(const soft of [false,true]) {
  test('reviewed Pam targets remain exact under '+(soft?'softened':'exact')+' production gameplay',()=>{
    assert.equal(selected.length,47);
    for(const target of selected) {
      const i=raw.targets.indexOf(target);
      assert.ok(i>=0,target);
      const original=play(oldEngine,raw.weights,i,soft);
      const current=play(newEngine,revised.weights,i,soft);
      assert.equal(original.correct,true,'Baseline misidentified '+target+' as '+original.guessed);
      assert.equal(current.correct,true,'Reviewed model misidentified '+target+' as '+current.guessed);
    }
  });
}
