// Bulk evidence-aware classification for the complete Pam matrix.
// Conservative implications can mark unknown cells; existing values are immutable.
// Do not infer absence of a trait merely because its presence is unmentioned.
const RULES=[
 [152,[126,129,132,97,127]], // mammal
 [155,[152,126,129,132,97,127]], // hoofed animal
 [124,[152,126,129,132,97,127]], // rodent
 [149,[126,129,132,97,127]], // feathered animal
 [147,[132,97,127]], // insect
 [145,[129,132,97,127]], // fish
 [128,[85,132,97]], // herbivore
 [115,[85,132,97]], // carnivore
 [125,[152,126]], // furry is NOT necessarily mammalian (e.g. moth): disabled below
 [99,[97]], // eggs do not imply the animal is alive: disabled below
].filter(([q])=>q!==125&&q!==99);
const CATEGORY_YES=[
 [0,[97,132,127]], // animal -> alive, living, organic (ordinary category sense)
 [1,[127]], // vegetable -> organic, but not necessarily living once harvested
];
export function enrichPamModel(model){
 const n=model.targets.length,f=model.questions.length;
 if(f!==156||model.weights.length!==n*f||model.knownMask.length!==n*f)throw Error('Invalid Pam model');
 const weights=Buffer.from(model.weights),knownMask=Buffer.from(model.knownMask);
 const additions=[],conflicts=[],scanned=n*f;
 const sources=new Map([...RULES,...CATEGORY_YES].map(([k,v])=>[k,v]));
 for(let t=0;t<n;t++){
  let changed=true;
  while(changed){
   changed=false;
   for(const [source,implied] of sources){
    const src=source*n+t;
    if(knownMask[src]!==1||weights[src]!==3)continue;
    // Category rules only apply to the *actual* four-way first question.
    if(source===0&&weights[1*n+t]===3)continue;
    for(const q of implied){
     const cell=q*n+t;
     if(knownMask[cell]===1){
      if(weights[cell]===2)conflicts.push({target:model.targets[t],source,q,existing:weights[cell]});
      continue;
     }
     knownMask[cell]=1;weights[cell]=3;changed=true;
     additions.push({target:model.targets[t],source,q,answer:3,provenance:'taxonomic implication'});
    }
   }
  }
 }
 return {...model,weights,knownMask,enrichment:{scanned,additions,conflicts,remainingUnknown:knownMask.reduce((s,v)=>s+(v===0),0)}};
}
