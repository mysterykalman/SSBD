function binaryEntropy(p){
  if(p<=1e-12||p>=1-1e-12)return 0;
  return-p*Math.log2(p)-(1-p)*Math.log2(1-p);
}
function contains(sorted,value){return sorted?.includes(value)??false;}
function sumBelief(belief,indexes){let sum=0;for(const index of indexes||[])sum+=Number(belief[index]||0);return sum;}
function totalBelief(belief){let total=0;for(const p of belief)total+=Number(p||0);return total;}
function stageFactor(turn,breadth){
  if(turn<=2)return breadth==='broad'?1.25:breadth==='category'?1.03:breadth==='specific'?0.58:0.82;
  if(turn<=7)return breadth==='broad'?1.02:breadth==='category'?1.18:breadth==='specific'?0.78:1;
  if(turn<=13)return breadth==='broad'?0.88:breadth==='category'?1.05:breadth==='specific'?0.98:1.1;
  // Late game should keep narrowing the established branch. Do not reward leaf-level
  // "is it X?" probes merely because the turn count is high.
  return breadth==='broad'?0.72:breadth==='category'?1.14:breadth==='specific'?0.9:1.08;
}
function repetitionFactor(runtime,questionIndexValue,recentQuestionIndexes=[]){
  const family=runtime.questions[questionIndexValue]?.family;
  const recent=recentQuestionIndexes.slice(-3);
  if(!recent.length||!family)return 1;
  const lastFamily=runtime.questions[recent[recent.length-1]]?.family;
  if(lastFamily===family)return 0.42;
  if(recent.some(index=>runtime.questions[index]?.family===family))return 0.64;
  return 1;
}
function facetRepetitionFactor(type,recentFacetTypes=[]){
  const recent=recentFacetTypes.slice(-3);
  if(!recent.length)return 1;
  if(recent[recent.length-1]===type)return 0.4;
  if(recent.includes(type))return 0.62;
  return 1;
}
function sequenceFactor(runtime,questionIndexValue,confirmedYes){
  const question=runtime.questions[questionIndexValue];
  const established=[...confirmedYes].some(index=>runtime.questions[index]?.family==='ontology');
  if(!established&&question.family==='ontology')return 1.12;
  if(established&&question.family==='ontology'&&question.breadth==='broad')return 0.9;
  return 1;
}
function confirmedIds(runtime,confirmedYes){
  return new Set([...confirmedYes].map(index=>runtime.questions[index]?.id).filter(Boolean));
}
function branchEligibility(runtime,questionIndexValue,confirmedYes){
  const question=runtime.questions[questionIndexValue];
  if(!question)return{eligible:false,reason:'missing_question'};
  const yes=confirmedIds(runtime,confirmedYes);
  const yesFamilies=new Set([...confirmedYes].map(index=>runtime.questions[index]?.family).filter(Boolean));
  const objectBranch=yes.has('object')||yes.has('device')||yes.has('electronic')||yesFamilies.has('technology');
  if(objectBranch&&question.family==='ontology'&&new Set(['person','animal','plant','place','food_drink','food','drink','media_work','event','organization','abstract','living','alive']).has(question.id)){
    return{eligible:false,reason:'contradicts_established_object_branch'};
  }
  const personBranch=yes.has('person')||yesFamilies.has('person');
  if(personBranch&&question.family==='ontology'&&new Set(['animal','plant','place','food_drink','food','drink','object','media_work','event','organization','abstract']).has(question.id)){
    return{eligible:false,reason:'contradicts_established_person_branch'};
  }
  const vehicleEstablished=yes.has('vehicle');
  if(new Set(['car','aircraft','watercraft']).has(question.id)&&!vehicleEstablished){
    return{eligible:false,reason:'requires_vehicle_branch'};
  }
  return{eligible:true,reason:'branch_ok'};
}
function renderFacetText(template,value){
  const article=/^[aeiou]/i.test(value)?'an':'a';
  return String(template||'Is it {value}?').replaceAll('{value}',String(value)).replaceAll('{article}',article);
}

export function createMomRuntimeReasoner(runtime){
  if(!runtime?.questions?.length||!runtime?.concepts?.length)throw new Error('Mom runtime knowledge is empty');
  const questionIndex=Object.fromEntries(runtime.questions.map((question,index)=>[question.id,index]));
  const evidence=Array.from({length:runtime.questions.length},()=>({yes:/** @type {number[]} */([]),no:/** @type {number[]} */([]),maybe:/** @type {number[]} */([])}));
  /** @type {Map<string, number[]>} */
  const categoryIndexes=new Map();
  runtime.concepts.forEach((concept,index)=>{
    const category=String(concept.category||'unknown');
    const categoryList=categoryIndexes.get(category)||[];categoryList.push(index);categoryIndexes.set(category,categoryList);
    for(const q of concept.yes||[])if(evidence[q])evidence[q].yes.push(index);
    for(const q of concept.no||[])if(evidence[q])evidence[q].no.push(index);
    for(const q of concept.maybe||[])if(evidence[q])evidence[q].maybe.push(index);
  });

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
    const question=runtime.questions[questionIndexValue];
    if(!question)return 0;
    const total=totalBelief(belief);if(total<=0)return 0;
    const excluded=new Set(question.excludes||[]);
    const applies=question.appliesTo||[];
    if(!applies.length){
      let blocked=0;for(const category of excluded)blocked+=sumBelief(belief,categoryIndexes.get(category));
      return Math.max(0,total-blocked)/total;
    }
    const seen=new Set();
    for(const requirement of applies){
      const categoryList=categoryIndexes.get(requirement);
      if(categoryList){for(const index of categoryList)if(!excluded.has(runtime.concepts[index].category))seen.add(index);continue;}
      const requiredIndex=questionIndex[requirement];
      if(requiredIndex!=null)for(const index of evidence[requiredIndex].yes)if(!excluded.has(runtime.concepts[index].category))seen.add(index);
    }
    let covered=0;for(const index of seen)covered+=Number(belief[index]||0);
    return covered/total;
  }

  function evidenceMasses(belief,questionIndexValue){
    const bucket=evidence[questionIndexValue]||{yes:[],no:[],maybe:[]};
    const yes=sumBelief(belief,bucket.yes),no=sumBelief(belief,bucket.no),maybe=sumBelief(belief,bucket.maybe);
    const total=totalBelief(belief),known=yes+no+maybe,unknown=Math.max(0,total-known);
    return{yes,no,maybe,known,unknown,total};
  }

  function knownCoverage(belief,questionIndexValue){
    const masses=evidenceMasses(belief,questionIndexValue);
    return masses.total>0?masses.known/masses.total:0;
  }

  function questionGain(belief,questionIndexValue,noise=0.06){
    const masses=evidenceMasses(belief,questionIndexValue);
    if(masses.total<=0)return 0;
    const uncertain=masses.maybe+masses.unknown;
    const predictedYes=(masses.yes*(1-noise)+masses.no*noise+uncertain*0.5)/masses.total;
    const conditional=(masses.yes*binaryEntropy(1-noise)+masses.no*binaryEntropy(noise)+uncertain)/masses.total;
    return Math.max(0,binaryEntropy(predictedYes)-conditional);
  }

  function questionScore(belief,questionIndexValue,context={}){
    const question=runtime.questions[questionIndexValue];
    if(!question)return{eligible:false,score:0,gain:0,semantic:0,known:0,reason:'missing_question'};
    const asked=context.asked||new Set();
    const confirmedYes=context.confirmedYes||new Set();
    if(asked.has(questionIndexValue))return{eligible:false,score:0,gain:0,semantic:0,known:0,reason:'already_asked'};
    if(question.requires!=null&&!confirmedYes.has(question.requires))return{eligible:false,score:0,gain:0,semantic:0,known:0,reason:'requires_branch'};
    const branch=branchEligibility(runtime,questionIndexValue,confirmedYes);
    if(!branch.eligible)return{eligible:false,score:0,gain:0,semantic:0,known:0,reason:branch.reason};
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

  function facetQuestionScore(belief,type,value,context={}){
    const definition=runtime.facetIndex?.types?.[type];
    const yesIndexes=definition?.values?.[value];
    if(!definition||!yesIndexes?.length)return{eligible:false,score:0,gain:0,semantic:0,known:0,reason:'missing_facet'};
    const key=`facet:${type}:${value}`;
    if((context.askedFacetKeys||new Set()).has(key))return{eligible:false,score:0,gain:0,semantic:0,known:0,reason:'already_asked'};
    const total=totalBelief(belief);if(total<=0)return{eligible:false,score:0,gain:0,semantic:0,known:0,reason:'no_information'};
    const yesMass=sumBelief(belief,yesIndexes);
    if(yesMass<=1e-12)return{eligible:false,score:0,gain:0,semantic:0,known:0,reason:'no_information'};
    const knownMass=definition.exclusiveKnown?sumBelief(belief,definition.known||[]):yesMass;
    const semanticMass=definition.requiresCategory?sumBelief(belief,categoryIndexes.get(definition.requiresCategory)):total;
    const semantic=semanticMass/total,known=knownMass/total;
    if(definition.requiresCategory&&semantic<0.35)return{eligible:false,score:0,gain:0,semantic,known,reason:'low_semantic_coverage'};
    const noMass=definition.exclusiveKnown?Math.max(0,knownMass-yesMass):0;
    const unknownMass=Math.max(0,total-yesMass-noMass);
    const normalizedYes=yesMass/total,normalizedNo=noMass/total,normalizedUnknown=unknownMass/total;
    const noise=context.noise??0.06;
    const predictedYes=normalizedYes*(1-noise)+normalizedNo*noise+normalizedUnknown*0.5;
    const conditional=normalizedYes*binaryEntropy(1-noise)+normalizedNo*binaryEntropy(noise)+normalizedUnknown;
    const gain=Math.max(0,binaryEntropy(predictedYes)-conditional);
    if(gain<=1e-12)return{eligible:false,score:0,gain,semantic,known,reason:'no_information'};
    const semanticFactor=0.45+0.55*semantic;
    const knownFactor=0.3+0.7*known;
    const stage=stageFactor(context.turn||0,'specific');
    const repetition=facetRepetitionFactor(type,context.recentFacetTypes||[]);
    const score=gain*semanticFactor*knownFactor*(definition.reliability??0.94)*stage*repetition;
    return{eligible:true,score,gain,semantic,known,stage,repetition,sequence:1,reason:'eligible',key,type,value,text:renderFacetText(definition.question,value),family:`facet:${type}`};
  }

  function bestStaticQuestion(belief,context={}){
    /** @type {any} */
    let best=null;
    for(let index=0;index<runtime.questions.length;index++){
      const ranked=questionScore(belief,index,context);
      if(!ranked.eligible)continue;
      if(!best||ranked.score>best.score+1e-12||(Math.abs(ranked.score-best.score)<=1e-12&&ranked.gain>best.gain))best={kind:'static',index,question:runtime.questions[index],...ranked};
    }
    return best;
  }

  function bestFacetQuestion(belief,context={}){
    /** @type {any} */
    let best=null;
    for(const [type,definition] of Object.entries(runtime.facetIndex?.types||{})){
      for(const value of Object.keys(definition.values||{})){
        const ranked=facetQuestionScore(belief,type,value,context);
        if(!ranked.eligible)continue;
        if(!best||ranked.score>best.score+1e-12||(Math.abs(ranked.score-best.score)<=1e-12&&ranked.gain>best.gain))best={kind:'facet',...ranked};
      }
    }
    return best;
  }

  function bestQuestion(belief,context={}){
    const staticBest=bestStaticQuestion(belief,context);
    const facetBest=bestFacetQuestion(belief,context);
    if(!staticBest)return facetBest;
    if(!facetBest)return staticBest;
    if(facetBest.score>staticBest.score+1e-12)return facetBest;
    return staticBest;
  }

  return{runtime,questionIndex,truthAt,appliesToConcept,semanticCoverage,knownCoverage,questionGain,questionScore,facetQuestionScore,bestStaticQuestion,bestFacetQuestion,bestQuestion};
}

export function initialRuntimeBelief(runtime){
  const belief=new Float64Array(runtime.concepts.length);
  let total=0;
  for(let i=0;i<runtime.concepts.length;i++){belief[i]=Number(runtime.concepts[i].prior)||0;total+=belief[i];}
  if(total<=0){belief.fill(1/runtime.concepts.length);return belief;}
  for(let i=0;i<belief.length;i++)belief[i]/=total;
  return belief;
}
