import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';
import {enrichPamModel} from '../scripts/pam-enrich-model.mjs';
import {applyVerifiedPamFacts} from '../scripts/pam-verified-facts.mjs';
const model=await applyVerifiedPamFacts(enrichPamModel(await loadPam1775Model(loadPamClassicModel)));
const doc=JSON.parse(await readFile(new URL('../data/pam20q/reviews/classic-batch-001.json',import.meta.url),'utf8'));
test('identify reviewed-correction source drift without overwriting anything',()=>{
 const mismatches=[];
 for(const x of doc.scopedCorrections){
  const actualName=model.targets[x.targetIndex],actualQuestion=model.questions[x.questionIndex];
  const cell=x.questionIndex*model.targets.length+x.targetIndex;
  if(actualName!==x.target||actualQuestion!==x.question||model.weights[cell]!==x.oldState||model.knownMask[cell]!==1)
   mismatches.push({name:x.target,index:x.targetIndex,actualName,question:x.question,actualQuestion,expectedState:x.oldState,actualState:model.weights[cell],actualKnown:model.knownMask[cell]});
 }
 console.log('PAM_CORRECTION_DRIFT='+JSON.stringify(mismatches));
});
