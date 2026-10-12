function binaryEntropy(p){
  if(p<=1e-12||p>=1-1e-12)return 0;
  return-p*Math.log2(p)-(1-p)*Math.log2(1-p);
}
function answerYesProbability(truth,noise){
  return truth===1?1-noise:truth===0?noise:0.5;
}
function contains(sorted,value){
  // Runtime arrays are compiled sorted, but includes keeps this robust for fixtures.
  return sorted?.includes(value)??false;
}

export function createMomRuntimeReasoner(runtime){
  if(!runtime?.questions?.length||!runtime?.concepts?.length)throw new Error('Mom runtime knowledge is empty');
  const questionIndex=Object.fromEntries(runtime.questions.map((question,index)=>[question.id,index]));

  function truthAt(conceptIndex,questionIndexValue){
    const concept=runtime.concepts[conceptIndex];
    if(!concept)return NaN;
    if(contains(concept.yes,questionIndexValue))return 1;
    if(contains(concept.no,questionIndexValue))return 0;
    if(contains(concept.maybe,questionIndexValue))return 0.5;
    return NaN;
  }

  function appliesToConcept(questionIndexValue,conceptIndex){
    const question=runtime.questions[questionIndexValue];
    const concept=runtime.concepts[conceptIndex];
    if(!question||!concept)return false;
    if(question.excludes?.includes(concept.category))return false;
    const applies=question.appliesTo||[];
    if(!applies.length)return true;
    if(applies.includes(concept.category)||applies.includes(concept.subcategory))return true;
    for(const requirement of applies){
      const requiredIndex=questionIndex[requirement];
      if(requiredIndex!=null&&truthAt(conceptIndex,requiredIndex)===1)return true;
    }
    return false;
  }

  function semanticCoverage(belief,questionIndexValue){
    let total=0,covered=0;
    for(let i=0;i<runtime.concepts.length;i++){
      const p=Number(belief[i]||0);if(p<=1e-15)continue;
      total+=p;if(appliesToConcept(questionIndexValue,i))covered+=p;
    }
    return total>0?covered/total:0;
  }

  function knownCoverage(belief,questionIndexValue){
    let total=0,known=0;
    for(let i=0;i<runtime.concepts.length;i++){
      const p=Number(belief[i]||0);if(p<=1e-15)continue;
      total+=p;if(Number.isFinite(truthAt(i,questionIndexValue)))known+=p;
    }
    return total>0?known/total:0;
  }

  function questionGain(belief,questionIndexValue,noise=0.06){
    let yesProbability=0,conditionalEntropy=0;
    for(let i=0;i<runtime.concepts.length;i++){
      const p=Number(belief[i]||0);if(p<=1e-15)continue;
      const q=answerYesProbability(truthAt(i,questionIndexValue),noise);
      yesProbability+=p*q;
      conditionalEntropy+=p*binaryEntropy(q);
    }
    return Math.max(0,binaryEntropy(yesProbability)-conditionalEntropy);
  }

  return{runtime,questionIndex,truthAt,appliesToConcept,semanticCoverage,knownCoverage,questionGain};
}

export function initialRuntimeBelief(runtime){
  const belief=new Float64Array(runtime.concepts.length);
  let total=0;
  for(let i=0;i<runtime.concepts.length;i++){belief[i]=Number(runtime.concepts[i].prior)||0;total+=belief[i];}
  if(total<=0){belief.fill(1/runtime.concepts.length);return belief;}
  for(let i=0;i<belief.length;i++)belief[i]/=total;
  return belief;
}
