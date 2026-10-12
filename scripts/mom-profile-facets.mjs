const OBJECT_TYPES=['car','aircraft','watercraft','vehicle','musical_instrument','sports_equipment','electronic','device','tool','furniture','clothing','container','toy','weapon'];
const OCCUPATIONS=['actor','musician','athlete','politician','scientist','writer','artist','chef'];
const MEDIA_TYPES=['film','tv_series','novel','book','play','song','album','music_work','video_game','painting','sculpture','artwork'];

function clean(value){return String(value??'').trim();}
function typeKey(value){return clean(value).toLowerCase().replace(/[^a-z0-9]+/g,'');}
function humanize(value){return clean(value).replaceAll('_',' ');}
function values(raw){return Array.isArray(raw)?raw.map(clean).filter(Boolean):clean(raw)?[clean(raw)]:[];}
function add(map,type,value){
  const v=clean(value);if(!v)return;
  const list=map.get(type)||[];
  if(!list.some(item=>item.toLowerCase()===v.toLowerCase()))list.push(v);
  map.set(type,list);
}
function evidenceValue(evidence){
  const raw=clean(evidence?.trait);
  const colon=raw.indexOf(':');
  return colon>=0?clean(raw.slice(colon+1)):raw;
}

export function deriveProfileFacets({base={},evidence=[],traits=[]}={}){
  const out=new Map();
  if(base&&typeof base==='object')for(const [type,raw] of Object.entries(base))for(const value of values(raw))add(out,type,value);

  for(const ev of evidence||[]){
    if(String(ev?.source||'').toLowerCase()!=='wikidata')continue;
    const type=typeKey(ev.type);
    const value=evidenceValue(ev);
    if(!value)continue;
    if(type==='brand')add(out,'brand',value);
    else if(type==='manufacturer'&&!out.has('brand'))add(out,'brand',value);
    else if(['country','countryoforigin','origin'].includes(type))add(out,'country',value);
    else if(type==='occupation')add(out,'occupation',value);
    else if(['franchise','partoftheseries','series'].includes(type))add(out,'franchise',value);
    else if(type==='medium')add(out,'medium',value);
  }

  const traitSet=new Set(traits||[]);
  if(traitSet.has('object')&&!out.has('productType')){
    const type=OBJECT_TYPES.find(id=>traitSet.has(id));
    if(type)add(out,'productType',humanize(type));
  }
  if(traitSet.has('person')&&!out.has('occupation'))for(const id of OCCUPATIONS)if(traitSet.has(id))add(out,'occupation',humanize(id));
  if(traitSet.has('media_work')&&!out.has('medium')){
    const type=MEDIA_TYPES.find(id=>traitSet.has(id));
    if(type)add(out,'medium',humanize(type));
  }

  return Object.fromEntries([...out.entries()].sort(([a],[b])=>a.localeCompare(b,'en')).map(([type,list])=>[
    type,list.length===1?list[0]:list.sort((a,b)=>a.localeCompare(b,'en'))
  ]));
}
