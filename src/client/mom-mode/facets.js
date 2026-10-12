(function(global){
'use strict';
const sources=[global.MOM_KNOWLEDGE,global.MOM_GENERAL_KNOWLEDGE,global.MOM_GENERATED_KNOWLEDGE,global.MOM_CONTROLLED_KNOWLEDGE].filter(Boolean);
if(!sources.length)throw new Error('Mom knowledge must load before facets');

const slug=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,64);
const values=value=>Array.isArray(value)?value:[value];
const allObjects=sources.flatMap(source=>source.OBJECTS||[]);
const featureIds=new Set(sources.flatMap(source=>source.FEATURES||[]).map(feature=>feature.id));
const target=sources.find(source=>source===global.MOM_GENERAL_KNOWLEDGE)||sources[0];
target.FEATURES=target.FEATURES||[];

// Initial high-confidence product facets. Future knowledge builders can write the
// same `facets` object directly and this compiler will pick them up automatically.
const curated={
 'Nintendo Switch':{brand:'Nintendo',productType:'video game console'},
 'PlayStation 5':{brand:'Sony',productType:'video game console'},
 'Xbox':{brand:'Microsoft',productType:'video game console'},
 'iPhone':{brand:'Apple',productType:'smartphone'},
 'Tesla Model 3':{brand:'Tesla',productType:'car'},
 'Barbie':{brand:'Mattel',productType:'doll'},
 'LEGO':{brand:'LEGO',productType:'construction toy'}
};
for(const object of allObjects){
 const seed=curated[object.name];
 if(seed)object.facets={...(object.facets||{}),...seed};
}

function questionFor(type,value,object){
 const safe=String(value||'').trim();
 if(!safe)return null;
 if(type==='brand')return{id:`facet_brand_${slug(safe)}`,q:`Is it made by ${safe}?`,label:`brand:${safe}`,group:'brand',requires:'gk_product'};
 if(type==='productType')return{id:`facet_product_type_${slug(safe)}`,q:`Is it ${/^[aeiou]/i.test(safe)?'an':'a'} ${safe}?`,label:`product type:${safe}`,group:'product',requires:'gk_product'};
 if(type==='country'){
  const kind=String(object?.kind||'');
  const q=kind==='place'?`Is it in ${safe}?`:kind==='person'?`Are they strongly associated with ${safe}?`:`Is it strongly associated with ${safe}?`;
  return{id:`facet_country_${slug(safe)}`,q,label:`country:${safe}`,group:'location'};
 }
 if(type==='franchise')return{id:`facet_franchise_${slug(safe)}`,q:`Is it part of the ${safe} franchise?`,label:`franchise:${safe}`,group:'culture'};
 return null;
}

for(const object of allObjects){
 if(!object?.facets||typeof object.facets!=='object')continue;
 object.yes=[...new Set(object.yes||[])];
 for(const [type,raw] of Object.entries(object.facets)){
  for(const value of values(raw)){
   const feature=questionFor(type,value,object);
   if(!feature)continue;
   if(!featureIds.has(feature.id)){target.FEATURES.push(feature);featureIds.add(feature.id);}
   if(!object.yes.includes(feature.id))object.yes.push(feature.id);
  }
 }
}

global.MOM_FACETS={version:1,compiledFeatures:[...featureIds].filter(id=>id.startsWith('facet_')).length,curatedConcepts:Object.keys(curated).length};
})(typeof window!=='undefined'?window:globalThis);
