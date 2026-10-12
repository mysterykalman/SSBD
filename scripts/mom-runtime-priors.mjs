export const DEFAULT_CATEGORY_MASS=Object.freeze({
  object:0.26,
  person:0.18,
  animal:0.14,
  food_drink:0.10,
  place:0.09,
  media_work:0.08,
  organization:0.05,
  plant:0.04,
  event:0.025,
  abstract:0.025,
  unknown:0.01
});

function positive(value,fallback=1){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback;}

export function applyCategoryBalancedPriors(concepts,{categoryMass=DEFAULT_CATEGORY_MASS,weightFor=()=>1}={}){
  const groups=new Map();
  for(let i=0;i<concepts.length;i++){
    const category=Object.hasOwn(categoryMass,concepts[i].category)?concepts[i].category:'unknown';
    const list=groups.get(category)||[];list.push(i);groups.set(category,list);
  }
  const present=[...groups.keys()];
  const configuredTotal=present.reduce((sum,category)=>sum+positive(categoryMass[category],0),0)||1;
  const priors=new Float64Array(concepts.length);
  for(const category of present){
    const indexes=groups.get(category);
    const mass=positive(categoryMass[category],0)/configuredTotal;
    const weights=indexes.map(index=>positive(weightFor(concepts[index],index),1));
    const weightTotal=weights.reduce((a,b)=>a+b,0)||indexes.length;
    indexes.forEach((index,j)=>{priors[index]=mass*(weights[j]/weightTotal);});
  }
  const total=priors.reduce((a,b)=>a+b,0)||1;
  return concepts.map((concept,index)=>({...concept,prior:Number((priors[index]/total).toPrecision(12))}));
}

export function categoryPriorMass(concepts){
  const out={};for(const concept of concepts)out[concept.category]=(out[concept.category]||0)+Number(concept.prior||0);return out;
}
