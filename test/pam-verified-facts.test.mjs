import test from 'node:test';
import assert from 'node:assert/strict';
import {applyVerifiedPamFacts} from '../scripts/pam-verified-facts.mjs';
import {pamTraitIndex} from '../scripts/pam-classic-model.mjs';

test('source-backed answers populate unknown cells without rewriting known answers',async()=>{
 const targets=['an aye-aye','a binturong','a snow leopard'],questions=Array(156).fill('?');
 const weights=Buffer.alloc(targets.length*156),knownMask=Buffer.alloc(weights.length);
 const index=pamTraitIndex.nocturnal*targets.length;
 weights[index]=2;knownMask[index]=1;
 const model={targets,questions,weights,knownMask};
 const enriched=await applyVerifiedPamFacts(model);
 assert.equal(enriched.weights[index],2);
 assert.equal(enriched.knownMask[index],1);
 assert.ok(enriched.verifiedEnrichment.conflicts.some(x=>x.target==='an aye-aye'&&x.trait==='nocturnal'));
 const q=pamTraitIndex.cold*targets.length+2;
 assert.equal(enriched.weights[q],3);
 assert.equal(enriched.knownMask[q],1);
 assert.equal(model.knownMask[q],0);
});
