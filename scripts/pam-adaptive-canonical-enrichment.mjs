// Populate existing canonical predicates from explicit, mutually exclusive
// source metadata. Never turn lack of a clue into a No.
export function enrichCanonicalPamQuestions(rows,metadataRows,questionDoc){
 const qid=new Map(questionDoc.questions.map((q,i)=>[q.id,i]));
 const patches=[],conflicts=[],vectors=[];
 const SET=(v,target,id,val,reason)=>{
  const i=qid.get(id);if(i===undefined)return;
  if(v[i]==='U'){v[i]=val;patches.push({target,id,val,reason})}
  else if(v[i]!==val)conflicts.push({target,id,stored:v[i],proposed:val,reason});
 };
 const regionMap={
  'North America':'PAM-NEW-017','South America':'PAM-NEW-021',
  'Europe':'PAM-NEW-016','Asia':'PAM-NEW-018',
  'Africa':'PAM-NEW-019','Oceania':'PAM-NEW-020'
 };
 const movieDecades=[
  ['MOV-Q001',y=>y<1980],['MOV-Q002',y=>y>=1980&&y<1990],
  ['MOV-Q003',y=>y>=1990&&y<2000],['MOV-Q004',y=>y>=2000&&y<2010],
  ['MOV-Q005',y=>y>=2010&&y<2020],['MOV-Q006',y=>y>=2020]
 ];
 for(let i=0;i<rows.length;i++){
  const [id,name,category,vector]=rows[i],meta=metadataRows[i],sub=meta[1]||'',clues=meta.slice(2).join('; ').toLowerCase(),v=[...vector];
  if(meta[0]!==id||v.length!==332)throw Error('Invalid adaptive canonical enrichment row '+id);
  const r=regionMap[sub];
  if(['Cities','Countries'].includes(category)&&r){
   for(const q of Object.values(regionMap))SET(v,id,q,q===r?'Y':'N','Explicit source geographic region: '+sub);
  }
  if(category==='Cities'){
   const match=String(meta[2]||'').match(/^Located in ([A-Za-zÀ-ÿ\s]+)$/i);
   if(match){
    const country=match[1].trim();
    SET(v,id,'PAM-NEW-023',country==='United States'?'Y':'N','Explicit city country '+country);
    SET(v,id,'PAM-NEW-024',country==='Canada'?'Y':'N','Explicit city country '+country);
    const cities={France:'228',Italy:'229',Japan:'230',China:'231',Australia:'232',Brazil:'233',India:'234',Germany:'235','United Kingdom':'236'};
    for(const [nation,num]of Object.entries(cities))SET(v,id,'PAM-NEW-'+num,country===nation?'Y':'N','Explicit source city country '+country);
   }
  }
  if(category==='Landmarks'){
   if(sub==='Natural Landmarks'){
    SET(v,id,'PAM-NEW-070','Y','Natural landmark subtype');
    SET(v,id,'PAM-NEW-004','Y','Natural landmark subtype');
    SET(v,id,'PAM-NEW-005','N','Natural landmark subtype');
   }else if(sub==='Built Landmarks & Attractions'){
    SET(v,id,'PAM-NEW-070','N','Built landmark subtype');
    SET(v,id,'PAM-NEW-004','N','Built landmark subtype');
    SET(v,id,'PAM-NEW-005','Y','Built landmark subtype');
   }
  }
  if(category==='Music Groups'){
   const k={'Classic Rock & Rock':'PAM-NEW-097','Pop, Dance & Vocal Groups':'PAM-NEW-099'};
   for(const q of Object.values(k))SET(v,id,q,q===k[sub]?'Y':'N','Source primary genre: '+sub);
  }
  if(category==='People'){
   const roles={
    'Scientists, Inventors & Mathematicians':'PAM-NEW-109',
    'Politics, Leaders & History':'PAM-NEW-110',
    'Film, TV & Comedy':'PAM-NEW-115',
    'Solo Musicians & Composers':'PAM-NEW-113',
    'Athletes':'PAM-NEW-114'
   };
   if(roles[sub])for(const q of Object.values(roles))SET(v,id,q,q===roles[sub]?'Y':'N','Explicit source primary occupation: '+sub);
  }
  if(category==='Movies'){
   const m=String(meta[2]||'').match(/^Released (\d{4})$/),year=m?Number(m[1]):null;
   if(year!==null){
    for(const [qid,pred]of movieDecades)SET(v,id,qid,pred(year)?'Y':'N','Explicit release year '+year);
    SET(v,id,'PAM-NEW-149',year>=1980&&year<2000?'Y':'N','Explicit release year '+year);
    SET(v,id,'PAM-NEW-151',year>=2010?'Y':'N','Explicit release year '+year);
   }
  }
  if(category==='Brands'){
   const types={'Technology, Media & Gaming':'PAM-NEW-129','Clothing, Fashion & Sportswear':'PAM-NEW-130','Food, Drinks & Restaurants':'PAM-NEW-131','Travel, Finance & Platforms':'PAM-NEW-133'};
   if(types[sub])for(const q of Object.values(types))SET(v,id,q,q===types[sub]?'Y':'N','Source brand type '+sub);
  }
  if(category==='Car Companies'){
   const m=String(meta[2]||'').match(/associated with ([^;]+)/i);
   if(m){
    const locations={Japan:'PAM-NEW-210',Germany:'PAM-NEW-211','United States':'PAM-NEW-212',Italy:'PAM-NEW-213','South Korea':'PAM-NEW-214'};
    for(const [country,q]of Object.entries(locations))SET(v,id,q,m[1].trim()===country?'Y':'N','Explicit car brand country '+m[1].trim());
   }
  }
  vectors.push(v.join(''));
 }
 return {vectors,patches,conflicts};
}
