/** Conservative exploratory geographic filters using dated, numeric Wikidata claims.
 * ONLY for unreviewed research. Explicit values on both sides of a threshold
 * are required; missing observations ALWAYS remain unknown. Coarse thresholds
 * and a wide margin reduce ambiguity from stale figures and moving boundaries.
 */
const UNIT_KM2='http://www.wikidata.org/entity/Q712226';
const COUNTS={
 Countries:{population:[10e6,50e6,100e6,200e6],area:[1e5,5e5,1e6,5e6]},
 Cities:{population:[250e3,1e6,3e6,7e6],area:[250,750,1500]}
};
const EXCLUSION_MARGIN=.18;

export function observedGeography(subject,field){
 const claims=subject.claims.filter(x=>x.f===field&&x.k==='quantity'&&Number.isFinite(Number(x.v))&&Number(x.v)>0);
 const expected=field==='area'?UNIT_KM2:'1';
 const selected=claims.filter(x=>x.unit===expected&&(!x.end));
 if(!selected.length)return null;
 if(field==='population'){
  // Dynamic data must have an explicit 2018-2026 observation date.
  const dated=selected.filter(x=>/^[+]20(1[89]|2[0-6])/.test(x.t||''));
  if(!dated.length)return null;
  dated.sort((a,b)=>Number(b.t.slice(1,5))-Number(a.t.slice(1,5))||Number(b.rank==='preferred')-Number(a.rank==='preferred'));
  return{value:Number(dated[0].v),year:Number(dated[0].t.slice(1,5)),source:dated[0].source};
 }
 // Area values should be relatively stable and expressed in square kilometres.
 const value=Number(selected.find(x=>x.rank==='preferred')?.v??selected[0].v);
 if(selected.some(x=>Math.abs(Number(x.v)-value)/value>.2))return null;
 return{value,year:null,source:selected[0].source};
}

export function compileGeographyResearch(model,source,{minYes=2,minNo=2}={}){
 if(source?.review_status!=='research_only_unverified')throw Error('Only unreviewed sourced research is supported');
 const ids=new Map(model.targets.map((x,i)=>[x.id,i]));
 const observed=new Map();
 for(const s of source.subjects){
  if(s.verified)throw Error('Never auto-accept a research identity');
  const index=ids.get(s.id);
  if(index==null||model.targets[index].name!==s.name)throw Error('Research identity mismatch '+s.id);
  if(!COUNTS[s.category])continue;
  observed.set(index,{category:s.category,population:observedGeography(s,'population'),area:observedGeography(s,'area')});
 }
 const questions=[];
 for(const [category,types] of Object.entries(COUNTS)){
  for(const [field,thresholds] of Object.entries(types)){
   for(const cutoff of thresholds){
    const states=new Uint8Array(model.targets.length),known=new Uint8Array(model.targets.length);
    let yes=0,no=0;
    for(const [idx,s] of observed){
     if(s.category!==category||!s[field])continue;
     const n=s[field].value;
     if(n>cutoff*(1+EXCLUSION_MARGIN)){known[idx]=1;states[idx]=3;yes++;}
     else if(n<cutoff*(1-EXCLUSION_MARGIN)){known[idx]=1;states[idx]=2;no++;}
     // Near a threshold: even explicit data should remain unknown to the model.
    }
    if(yes<minYes||no<minNo)continue;
    let text;
    if(category==='Countries')text=field==='population'?`Does this country have more than ${fmt(cutoff)} residents?`:
      `Is this country larger than ${fmt(cutoff)} square kilometres?`;
    else text=field==='population'?`Does this city's municipal population exceed ${fmt(cutoff)} people?`:
      `Does the city itself cover more than ${fmt(cutoff)} square kilometres?`;
    questions.push({id:`research_geo_${category}_${field}_${cutoff}`,field:`geo_${category}_${field}`,value:cutoff,
      known,states,yes,no,text,review_status:'SOURCE_RESEARCH_UNVERIFIED',
      provenance:'Wikidata P1082 or P2046 with source year/units; intentionally uncertain within 18 percent of each threshold'});
   }
  }
 }
 return{model:{...model,questions:[...model.questions,...questions]},report:{sourceSubjects:source.subjects.length,
   observedCounts:Object.fromEntries(Object.entries(COUNTS).map(([category])=>[category,
    [...observed.values()].filter(x=>x.category===category&&x.population).length])),
   extraQuestions:questions.length,questionLabels:questions.map(x=>x.text),reviewStatus:'research_only_unverified'}};
}
function fmt(n){return n.toLocaleString('en-US');}