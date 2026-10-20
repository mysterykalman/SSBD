// Build an immutable, opt-in Pam model overlay with conservative auto-populated answers.
// Does not mutate original model or overwrite verified facts.
// Usage: node scripts/build-pam-enriched-overlay.mjs --output /tmp/pam-overlay.json
import {writeFile,readFile} from 'node:fs/promises';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
const args=process.argv;
const output=args[args.indexOf('--output')+1];
if(!args.includes('--output')||!output||output.startsWith('--'))throw Error('Usage: --output <path>');
const auditFlag=args.indexOf('--audit');
const auditPath=auditFlag>=0?args[auditFlag+1]:null;
if(auditFlag>=0&&(!auditPath||auditPath.startsWith('--')))throw Error('Missing --audit path');
const audit=auditPath?JSON.parse(await readFile(auditPath,'utf8')):null;
const source=await loadPam1775Model(loadPamClassicModel);
const {targets,questions}=source,N=targets.length,Q=questions.length;
if(N!==1775||Q!==156)throw Error('Unexpected model size');
const states=Buffer.from(source.weights);
const known=Buffer.from(source.knownMask);
const index=(q,t)=>q*N+t;
const implications=new Map([
 [152,[126,129,132]], // mammal -> warm-blooded, backbone, living
 [155,[152,126,129]], // hooves -> mammal, warm-blooded, backbone
 [124,[152,126,129]], // rodent -> mammal, warm-blooded, backbone
]);
const added=[],conflicts=[];
const seen=new Set();
for(let t=0;t<N;t++){
 let changed=true;
 while(changed){
  changed=false;
  for(const [cause,consequents] of implications){
   const from=index(cause,t);
   if(known[from]!==1||states[from]!==3)continue;
   for(const q of consequents){
    const at=index(q,t);
    if(known[at]===1){
     if(!(states[at]&1))conflicts.push({target:targets[t],cause,q,current:states[at]});
     continue;
    }
    known[at]=1;states[at]=3;changed=true;
    added.push({target:targets[t],question:q,answer:'yes',cause,source:'taxonomy-implication'});
   }
  }
 }
}
// Apply the audited proposals only when they remain unknown in the source.
if(audit){
 if(audit.model?.targets!==N||audit.model?.questions!==Q)throw Error('Audit model shape mismatch');
 const ids=new Map(targets.map((target,i)=>[target,i]));
 for(const proposal of audit.proposals||[]){
  const t=ids.get(proposal.target),q=proposal.question;
  if(t===undefined||!Number.isInteger(q)||q<0||q>=Q)throw Error('Invalid audit proposal');
  if(proposal.provenance!=='logical-implication'||proposal.value!==3)throw Error('Unverified audit proposal');
  const at=index(q,t);
  if(known[at]){
   if(states[at]!==3)conflicts.push({target:proposal.target,q,current:states[at],source:'audit'});
   continue;
  }
  known[at]=1;states[at]=3;
  const key=t+'|'+q;
  if(!seen.has(key)){added.push({target:proposal.target,question:q,answer:'yes',cause:proposal.reasonQuestion,source:'audited-logical-implication'});seen.add(key);}
 }
}
const uniqueConflicts=[...new Map(conflicts.map(c=>[`${c.target}|${c.cause}|${c.q}`,c])).values()];
if(uniqueConflicts.length){
 console.error(JSON.stringify({status:'blocked-contradictions',count:uniqueConflicts.length,examples:uniqueConflicts.slice(0,20)}));
 process.exitCode=1;
}else{
 const payload={schemaVersion:1,model:{targets:N,questions:Q},weightsB64:states.toString('base64'),knownMaskB64:known.toString('base64'),changes:added};
 await writeFile(output,JSON.stringify(payload));
 console.log(JSON.stringify({status:'generated',targets:N,questions:Q,filled:added.length,output}));
}
