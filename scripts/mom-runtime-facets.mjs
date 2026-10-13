const DEFINITIONS={
  brand:{question:'Is it made by {value}?',exclusiveKnown:true,requiresCategory:'object',reliability:0.98},
  productType:{question:'Is it {article} {value}?',exclusiveKnown:true,requiresCategory:'object',reliability:0.97},
  country:{question:'Is it strongly associated with {value}?',exclusiveKnown:false,reliability:0.94},
  occupation:{question:'Are they known as {article} {value}?',exclusiveKnown:false,requiresCategory:'person',reliability:0.95},
  franchise:{question:'Is it part of the {value} franchise?',exclusiveKnown:false,reliability:0.95},
  medium:{question:'Is it mainly {value}?',exclusiveKnown:false,reliability:0.93}
};

function values(raw){
  const list=Array.isArray(raw)?raw:[raw];
  return [...new Set(list.map(v=>String(v??'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'en'));
}

export function facetDefinitions(){return structuredClone(DEFINITIONS);}

export function buildRuntimeFacetIndex(concepts=[]){
  const valueSets=new Map();
  const knownByType=new Map();
  for(let conceptIndex=0;conceptIndex<concepts.length;conceptIndex++){
    const facets=concepts[conceptIndex]?.facets;
    if(!facets||typeof facets!=='object')continue;
    for(const [type,raw] of Object.entries(facets)){
      if(!DEFINITIONS[type])continue;
      const vals=values(raw);if(!vals.length)continue;
      const known=knownByType.get(type)||new Set();known.add(conceptIndex);knownByType.set(type,known);
      for(const value of vals){
        const key=`${type}\u0000${value}`;
        const set=valueSets.get(key)||new Set();set.add(conceptIndex);valueSets.set(key,set);
      }
    }
  }
  const types={};
  for(const type of Object.keys(DEFINITIONS).sort()){
    const known=[...(knownByType.get(type)||[])].sort((a,b)=>a-b);
    const vals={};
    for(const [key,set] of [...valueSets.entries()].sort(([a],[b])=>a.localeCompare(b,'en'))){
      const [keyType,value]=key.split('\u0000');if(keyType!==type)continue;
      vals[value]=[...set].sort((a,b)=>a-b);
    }
    if(!known.length)continue;
    types[type]={...DEFINITIONS[type],known,values:vals};
  }
  return{version:1,types};
}

export function facetTruth(facetIndex,type,value,conceptIndex){
  const def=facetIndex?.types?.[type];if(!def)return NaN;
  const yes=def.values?.[value]||[];
  if(yes.includes(conceptIndex))return 1;
  if(def.exclusiveKnown&&def.known.includes(conceptIndex))return 0;
  return NaN;
}

export function renderFacetQuestion(type,value){
  const def=DEFINITIONS[type];if(!def)return null;
  const article=/^[aeiou]/i.test(value)?'an':'a';
  return def.question.replaceAll('{value}',String(value)).replaceAll('{article}',article);
}
