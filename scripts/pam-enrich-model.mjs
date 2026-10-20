// Conservative Pam knowledge enrichment at build time.
// Adds only logically implied yes answers to cells explicitly marked unknown.
// Existing answers, including contradictory ones, are never overwritten.
const IMPLICATIONS=Object.freeze([
 [152,[126,129,132]], // mammal -> warm blood, backbone, living
 [155,[152,126,129]], // hooves -> mammal, warm blood, backbone
 [124,[152,126,129]], // rodent -> mammal, warm blood, backbone
 [149,[126,129,132,97]], // feathers -> warm blood, backbone, living, alive
 [147,[97,132,127]], // insect -> alive, living, organic
 [152,[97,127]], // mammal -> alive, organic
 [145,[129,97,132]], // fish -> backbone, alive, living
 [128,[85]], // herbivore -> eats
 [115,[85]], // carnivore -> eats
]);
export function enrichPamModel(model){
 const n=model.targets.length,f=model.questions.length;
 if(f!==156||model.weights.length!==n*f||model.knownMask.length!==n*f)throw Error('Invalid Pam model');
 const weights=Buffer.from(model.weights),knownMask=Buffer.from(model.knownMask);
 const additions=[],conflicts=[];
 for(let t=0;t<n;t++){
  let changed=true;
  while(changed){
   changed=false;
   for(const [source,implied] of IMPLICATIONS){
    if(knownMask[source*n+t]!==1||weights[source*n+t]!==3)continue;
    for(const q of implied){
     const index=q*n+t;
     if(knownMask[index]===1){
      if(!(weights[index]&1))conflicts.push({target:model.targets[t],source,q,existing:weights[index]});
      continue;
     }
     knownMask[index]=1;weights[index]=3;changed=true;
     additions.push({target:model.targets[t],source,q,answer:3,provenance:'logical implication'});
    }
   }
  }
 }
 return {...model,weights,knownMask,enrichment:{additions,conflicts}};
}
