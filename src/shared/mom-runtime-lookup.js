export function normalizeMomRuntimeLookup(value){
  return String(value??'')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g,"'")
    .replace(/^the\s+/,'')
    .replace(/\([^)]*\)/g,' ')
    .replace(/[_–—-]+/g,' ')
    .replace(/[^a-z0-9']+/g,' ')
    .trim()
    .replace(/\s+/g,' ');
}

export function resolveMomRuntimeLookup(runtime,value){
  const key=normalizeMomRuntimeLookup(value);
  if(!key)return{status:'unknown',key,index:null,concept:null,candidates:[]};
  const target=runtime?.aliases?.[key];
  if(Number.isInteger(target))return{status:'known',key,index:target,concept:runtime.concepts?.[target]||null,candidates:[target]};
  if(Array.isArray(target)){
    const candidates=[...target].filter(index=>Number.isInteger(index)&&runtime.concepts?.[index]);
    const exact=candidates.find(index=>normalizeMomRuntimeLookup(runtime.concepts[index].name)===key);
    if(Number.isInteger(exact))return{status:'known',key,index:exact,concept:runtime.concepts[exact],candidates};
    return{status:'ambiguous',key,index:null,concept:null,candidates};
  }
  const exact=runtime?.concepts?.findIndex(concept=>normalizeMomRuntimeLookup(concept?.name)===key)??-1;
  if(exact>=0)return{status:'known',key,index:exact,concept:runtime.concepts[exact],candidates:[exact]};
  return{status:'unknown',key,index:null,concept:null,candidates:[]};
}
