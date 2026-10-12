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
function stageFactor(turn,breadth){
  if(turn<=2)return breadth==='broad'?1.25:breadth==='category'?1.03:breadth==='specific'?0.58:0.82;
  if(turn<=7)return breadth==='broad'?1.02:breadth==='category'?1.18:breadth==='specific'?0.78:1;
  if(turn<=13)return breadth==='broad'?0.88:breadth==='category'?1.03:breadth==='specific'?1.02:1.1;
  return breadth==='broad'?0.78:breadth==='category'?0.94:breadth==='specific'?1.2:1.03;
}
function repetitionFactor(runtime,questionIndexValue,recentQuestionIndexes=[]){
  const family=runtime.questions[questionIndexValue]?.family;
  const recent=recentQuestionIndexes.slice(-2);
  if(!recent.length||!family)return 1;
  const lastFamily=runtime.questions[recent[recent.length-1]]?.family;
  if(lastFamily===family)return 0.72;
  if(recent.some(index=>runtime.questions[index]?.family===family))return 0.88;
  return 1;
}
function sequenceFactor(runtime,questionIndexValue,confirmedYes){
  const question=runtime.questions[questionIndexValue];
  const established=[...confirmedYes].some(index=>runtime.questions[index]?.family==='ontology');
  if(!established&&question.family==='ontology')return 1.12;
  if(established&&question.family==='ontology'&&question.breadth==='broad')return 0.9;
  return 1;
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

  function questionScore(belief,questionIndexValue,context={}){
    const question=runtime.questions[questionIndexValue];
    if(!question)return{eligible:false,score:0,gain:0,semantic:0,known:0,reason:'missing_question'};
    const asked=context.asked||new Set();
    const confirmedYes=context.confirmedYes||new Set();
    if(asked.has(questionIndexValue))return{eligible:false,score:0,gain:0,semantic:0,known:0,reason:'already_asked'};
    if(question.requires!=null&&!confirmedYes.has(question.requires))return{eligible:false,score:0,gain:0,semantic:0,known:0,reason:'requires_branch'};
    const gain=questionGain(belief,questionIndexValue,context.noise??0.06);
    if(gain<=1e-12)return{eligible:false,score:0,gain,semantic:0,known:0,reason:'no_information'};
    const semantic=semanticCoverage(belief,questionIndexValue);
    const known=knownCoverage(belief,questionIndexValue);
    if(semantic<(question.minCoverage||0))return{eligible:false,score:0,gain,semantic,known,reason:'low_semantic_coverage'};
    const semanticFactor=0.45+0.55*semantic;
    const knownFactor=0.3+0.7*known;
    const stage=stageFactor(context.turn||0,question.breadth);
    const repetition=repetitionFactor(runtime,questionIndexValue,context.recentQuestionIndexes||[]);
    const sequence=sequenceFactor(runtime,questionIndexValue,confirmedYes);
    const score=gain*semanticFactor*knownFactor*(question.reliability??0.94)*stage*repetition*sequence;
    return{eligible:true,score,gain,semantic,known,stage,repetition,sequence,reason:'eligible'};
  }

  function bestQuestion(belief,context={}){
    let best=null;
    for(let index=0;index<runtime.questions.length;index++){
      const ranked=questionScore(belief,index,context);
      if(!ranked.eligible)continue;
      if(!best||ranked.score>best.score+1e-12||(Math.abs(ranked.score-best.score)<=1e-12&&ranked.gain>best.gain))best={index,question:runtime.questions[index],...ranked};
    }
    return best;
  }

  return{runtime,questionIndex,truthAt,appliesToConcept,semanticCoverage,knownCoverage,questionGain,questionScore,bestQuestion};
}

export function initialRuntimeBelief(runtime){
  const belief=new Float64Array(runtime.concepts.length);
  let total=0;
  for(let i=0;i<runtime.concepts.length;i++){belief[i]=Number(runtime.concepts[i].prior)||0;total+=belief[i];}
  if(total<=0){belief.fill(1/runtime.concepts.length);return belief;}
  for(let i=0;i<belief.length;i++)belief[i]/=total;
  return belief;
}
