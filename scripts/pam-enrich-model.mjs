// Bulk inference over the entire 1,775 x 156 knowledge matrix.
// Populate unknown cells only; never rewrite existing values.
// Four state values: 0=weak no, 1=weak yes, 2=no, 3=yes.
const YES={
 152:[126,129,132,97,127], // mammal
 155:[152,126,129,132,97,127], // hooves
 124:[152,126,129,132,97,127], // rodent
 149:[126,129,132,97,127], // feathers
 147:[132,97,127], // insect
 145:[129,132,97,127], // fish
 128:[85,132,97,127], // herbivore
 115:[85,132,97,127], // carnivore
 126:[132,97], // warm-blooded
 129:[132,97], // vertebrate
 130:[127], // roots
 131:[154], // paws -> feet
 153:[97], // wings on living entity only checked separately below
};
// Mutual exclusions only where taxonomic categories are unambiguous.
const NO={
 152:[145,147,149,139], // mammal not fish, insect, feathers, cold-blooded
 145:[152,147,149,126], // fish not mammal, insect, feathers, warm-blooded
 147:[152,145,149,129], // insect not mammal, fish, feathers, vertebrate
 149:[152,145,147,139], // feathers not mammal, fish, insect, cold-blooded
 126:[139], // warm-blooded not cold-blooded
 139:[126], // cold-blooded not warm-blooded
};
export function enrichPamModel(model){
 const n=model.targets.length,f=model.questions.length;
 if(f!==156||model.weights.length!==n*f||model.knownMask.length!==n*f)throw Error('Invalid Pam model shape');
 const weights=Buffer.from(model.weights),knownMask=Buffer.from(model.knownMask);
 const additions=[],conflicts=[];
 const inferred=new Map();
 for(let t=0;t<n;t++){
  let changed=true;
  while(changed){
   changed=false;
   for(const [rawSource,implied] of Object.entries(YES)){
    const source=Number(rawSource),cell=source*n+t;
    if(knownMask[cell]!==1||weights[cell]!==3)continue;
    for(const q of implied){
     if(source===153&&model.weights[0*n+t]!==3)continue;
     const at=q*n+t;
     if(knownMask[at]){
      if(weights[at]===2)conflicts.push({target:model.targets[t],source,q,existing:2,proposed:3});
      continue;
     }
     knownMask[at]=1;weights[at]=3;changed=true;
     inferred.set(at,{target:model.targets[t],question:q,answer:3,source,provenance:'taxonomy'});
    }
   }
   for(const [rawSource,implied] of Object.entries(NO)){
    const source=Number(rawSource),cell=source*n+t;
    if(knownMask[cell]!==1||weights[cell]!==3)continue;
    for(const q of implied){
     const at=q*n+t;
     if(knownMask[at]){
      if(weights[at]===3)conflicts.push({target:model.targets[t],source,q,existing:3,proposed:2});
      continue;
     }
     knownMask[at]=1;weights[at]=2;changed=true;
     inferred.set(at,{target:model.targets[t],question:q,answer:2,source,provenance:'taxonomic-exclusion'});
    }
   }
  }
 }
 additions.push(...inferred.values());
 const distinctConflicts=[...new Map(conflicts.map(c=>[`${c.target}:${c.source}:${c.q}`,c])).values()];
 return {...model,weights,knownMask,enrichment:{scanned:n*f,additions,conflicts:distinctConflicts,remainingUnknown:knownMask.reduce((s,v)=>s+(v===0),0)}};
}
