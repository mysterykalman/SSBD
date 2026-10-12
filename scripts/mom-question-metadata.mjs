const BROAD_IDS=new Set(['living','alive','person','animal','plant','place','food_drink','food','drink','object','media_work','event','organization','abstract','manmade']);
const GROUP_ROOT={
  person:'person',animal:'animal',plant:'plant',place:'place',object:'object',material:'object',shape:'object',
  food:'food_drink',media:'media_work',event:'event',organization:'organization',abstract:'abstract'
};
const FAMILY_BY_ID={
  manmade:'origin',living:'ontology',alive:'ontology',person:'ontology',animal:'ontology',plant:'ontology',place:'ontology',
  food_drink:'ontology',food:'ontology',drink:'ontology',object:'ontology',media_work:'ontology',event:'ontology',organization:'ontology',abstract:'ontology',
  electronic:'technology',device:'technology',computer:'technology',phone:'technology',battery:'technology',screen:'technology',
  vehicle:'transport',car:'transport',aircraft:'transport',watercraft:'transport',wheels:'transport',road:'transport',rail:'transport',air:'transport',sea:'transport'
};

function unique(values){return [...new Set(values.filter(Boolean))];}

export function compileQuestionMetadata(def={}){
  const id=String(def.id||'');
  const parents=Array.isArray(def.parents)?def.parents:[];
  const requires=def.requires||null;
  const explicitRoots=unique([...parents,...(requires?[requires]:[])]);
  const groupRoot=GROUP_ROOT[def.group]||null;
  const isGeneral=id.startsWith('gk_')||id.startsWith('wd_');

  let family=FAMILY_BY_ID[id]||def.group||'attribute';
  let breadth='attribute';
  if(BROAD_IDS.has(id))breadth='broad';
  else if(groupRoot&&parents.length===1&&parents[0]===groupRoot&&!requires)breadth='category';
  else if(requires||parents.length)breadth='specific';
  else if(groupRoot||isGeneral)breadth='category';

  let reliability=breadth==='broad'?0.99:breadth==='category'?0.97:breadth==='specific'?0.96:0.94;
  if(isGeneral)reliability=Math.min(reliability,0.95);

  let appliesTo=explicitRoots.length?explicitRoots:(groupRoot?[groupRoot]:[]);
  let excludes=[];
  let minCoverage=breadth==='broad'?0:breadth==='category'?0.35:breadth==='specific'?0.3:0.25;

  if(id==='manmade'){
    family='origin';breadth='broad';reliability=0.99;appliesTo=[];excludes=['person','animal','plant'];minCoverage=0.5;
  }
  if(id==='outdoors'){
    family='environment';appliesTo=[];minCoverage=0.25;
  }
  if(id==='profession'||id==='prescribe'){
    family='person';appliesTo=['person'];minCoverage=0.4;
  }
  if(id==='edible'){
    family='food';excludes=['person','place'];minCoverage=0.3;
  }
  if(isGeneral){
    family='general_knowledge';
    if(!requires&&!parents.length)appliesTo=[];
  }

  return{family,breadth,reliability,appliesTo:unique(appliesTo),excludes:unique(excludes),minCoverage};
}
