/**
 * A conservative separability audit for question-major yes/no matrices.
 * Unlike signature-counting, UNKNOWN is not a third known answer: if Pam does
 * not know a fact about one contender, the other's yes cannot eliminate it.
 * Two profiles differ usefully only when at least one question is KNOWN yes for
 * one and KNOWN no for the other.
 */
export function knownOppositeAudit(model,{limitExamples=12}={}){
 const {targets,questions}=model;
 const n=targets.length;
 const all=(1n<<BigInt(n))-1n;
 const yesSets=[],noSets=[];
 for(const q of questions){
  let ys=0n,ns=0n;
  if(q.known.length!==n||q.states.length!==n)throw Error('Wrong matrix shape');
  for(let i=0;i<n;i++){
   if(!q.known[i])continue;
   if(q.states[i]===3)ys|=1n<<BigInt(i);
   else if(q.states[i]===2)ns|=1n<<BigInt(i);
   else throw Error('An explicit known field must have an answer state');
  }
  yesSets.push(ys);noSets.push(ns);
 }
 const byCategory={},unresolved=[];
 let unique=0,highest=0,totalUnresolved=0;
 for(let i=0;i<n;i++){
  let separated=0n;
  const bit=1n<<BigInt(i);
  for(let q=0;q<questions.length;q++){
   if(yesSets[q]&bit)separated|=noSets[q];
   else if(noSets[q]&bit)separated|=yesSets[q];
  }
  const ambiguous=(all&~separated)&~bit;
  const cat=targets[i].category;
  const entry=byCategory[cat]??={total:0,uniquelySeparable:0,unresolved:0,largestAmbiguitySet:0};
  entry.total++;
  if(ambiguous===0n){unique++;entry.uniquelySeparable++;continue;}
  let count=0,examples=[];
  // Bit counting and example enumeration are linear in number of unresolved.
  for(let j=0;j<n;j++)if(ambiguous&(1n<<BigInt(j))){count++;if(examples.length<4)examples.push(targets[j].name);}
  totalUnresolved+=count;
  highest=Math.max(highest,count);
  entry.unresolved++;
  entry.largestAmbiguitySet=Math.max(entry.largestAmbiguitySet,count);
  if(unresolved.length<limitExamples)unresolved.push({name:targets[i].name,category:cat,ambiguousWith:count,examples});
 }
 const unresolvedPairs=totalUnresolved/2;
 return {total:n,questions:questions.length,uniquelySeparable:unique,
  unresolvedTargets:n-unique,unresolvedPairs,maxAmbiguousPeers:highest,
  byCategory,examples:unresolved,
  releaseGate:unique===n?'PASS: all target pairs have a known contradictory answer':'BLOCKED: candidates remain indistinguishable under known answer evidence'};
}