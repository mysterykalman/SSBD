import {readFile} from 'node:fs/promises';

// Completed rows are intentionally identified by exact target name and pinned
// source index. No kind-, category-, keyword- or prefix-based inference is used.
export async function applyReviewedPamCorrections(model) {
  const doc=JSON.parse(await readFile(new URL('../data/pam20q/reviews/classic-batch-001.json',import.meta.url),'utf8'));
  const {targets,questions}=model;
  if (doc.schemaVersion!==1 || doc.questionCount!==questions.length) throw Error('Unsupported Pam reviewed-row format');
  const n=targets.length;
  const weights=Buffer.from(model.weights),knownMask=Buffer.from(model.knownMask);
  const applied=[],fullReviews=[];
  const done=new Set();
  const replace=(target,index,q,expected,revised)=>{
    if (!Number.isInteger(q)||q<0||q>=questions.length||!Number.isInteger(revised)||revised<0||revised>3) throw Error('Invalid reviewed answer '+target+' / '+q);
    const key=index+':'+q;
    if (done.has(key)) throw Error('Duplicate reviewed Pam cell '+key);
    done.add(key);
    const pos=q*n+index;
    if (knownMask[pos]!==1 || weights[pos]!==expected) throw Error('Reviewed Pam source drift at '+target+' / '+q+' expected '+expected+' got '+weights[pos]);
    weights[pos]=revised;
    knownMask[pos]=1;
    if (expected!==revised) applied.push({target,question:q,from:expected,to:revised});
  };
  for (const row of doc.rows) {
    const i=row.targetIndex;
    if (i<0||i>=n||targets[i]!==row.name) throw Error('Pam full review target mismatch: '+row.name);
    if (!/^[0-3]{156}$/.test(row.original) || !/^[0-3]{156}$/.test(row.states)) throw Error('Pam full review invalid states: '+row.name);
    for (let q=0;q<questions.length;q++) replace(row.name,i,q,Number(row.original[q]),Number(row.states[q]));
    fullReviews.push(row.name);
  }
  const byName=new Map();
  const duplicates=new Set();
  for(let i=0;i<targets.length;i++){
    if(byName.has(targets[i]))duplicates.add(targets[i]);
    else byName.set(targets[i],i);
  }
  for (const item of doc.scopedCorrections) {
    // Immutable identity is the target's exact name, not a legacy row number.
    // Extension ordering may evolve; never apply a review to the old index
    // if it now names a different target. The original cell state is still
    // checked by replace(), so true source drift cannot pass silently.
    const i=byName.get(item.target);
    if(i===undefined||duplicates.has(item.target)||questions[item.questionIndex]!==item.question) throw Error('Pam scoped review target/question mismatch: '+item.target);
    replace(item.target,i,item.questionIndex,item.oldState,item.newState);
  }
  return {...model,weights,knownMask,reviewedCorrections:{fullReviews,scopedTargetCount:new Set(doc.scopedCorrections.map(x=>x.target)).size,changedCells:applied}};
}
