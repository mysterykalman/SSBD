// Generate a focused extension to Pam's question library from explicitly
// attributed answer facts. A missing source attribute remains Unknown.
const location=/^Located in ([A-Za-zÀ-ÿ\s]+)$/i;
const creator=/^Creator or origin:\s*(.+)$/i;
const landmark=/\b(Tower|Castle|Palace|Bridge|Fort|Fortress|Temple|Mosque|Abbey|Cathedral|Statue|Museum|Château|Walls|Gate|Obelisk|Opera House|Observatory|Crossing)\b/i;

const tidy=x=>String(x||'').trim().replace(/\s+/g,' ');
function productKind(text){
 const x=text.toLowerCase();
 if(/gummy|goldbear/.test(x))return 'gummy candy';
 if(/chocolate|cocoa/.test(x))return 'chocolate';
 if(/cola|soft drink|soda/.test(x))return 'soft drinks';
 if(/candy|confection/.test(x))return 'candy';
 if(/coffee|espresso/.test(x))return 'coffee';
 if(/pizza/.test(x))return 'pizza';
 if(/burger/.test(x))return 'burgers';
 return null;
}
export function generatePamFactQuestions(answerRows,metadataRows){
 if(answerRows.length!==metadataRows.length)throw Error('Adaptive metadata record count differs from answers');
 const facts=answerRows.map((r,i)=>{
  const m=metadataRows[i];
  if(m[0]!==r[0])throw Error('Adaptive metadata ID mismatch '+r[0]);
  const category=r[2],subcategory=m[1],clues=m.slice(2).map(tidy);
  const result={category};
  if(category==='Cities'){
   const match=clues[0].match(location);
   if(match)result.cityCountry=tidy(match[1]);
   const first=tidy(clues[1].split(';')[0]);
   if(first.length>=7&&first.length<=55&&landmark.test(first)&&!(/\b(century|historic city|urban|shopping|festival)\b/i.test(first))){
    result.cityLandmark=first;
   }
  }
  if(category==='Art & Monuments'&&/Paintings|Sculptures/.test(subcategory)){
   const match=clues[1].match(creator);
   if(match&&match[1].length<60)result.artist=tidy(match[1]);
  }
  if(category==='Brands'&&/Food|Drink|Restaurant/i.test(subcategory))result.brandKind=productKind(clues.slice(1).join(' '));
  return result;
 });
 // Only add dimensions backed by named, scoped, positive facts.
 const dimensions=[
  {key:'cityCountry',group:'Cities',text:x=>'Is the city in '+x+'?'},
  {key:'cityLandmark',group:'Cities',text:x=>'Is '+x+' one of its landmarks?'},
  {key:'artist',group:'Art & Monuments',text:x=>'Was the artwork created by '+x+'?'},
  {key:'brandKind',group:'Brands',text:x=>'Is the brand primarily known for '+x+'?'}
 ];
 const questions=[];
 for(const dim of dimensions){
  let counts=new Map();
  for(const f of facts)if(f[dim.key])counts.set(f[dim.key],(counts.get(f[dim.key])||0)+1);
  for(const [value]of [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))){
   // Rare facts are valid discriminators once a category has been narrowed.
   const label=dim.text(value);
   if(questions.some(q=>q.text.toLowerCase()===label.toLowerCase()))continue;
   const states=facts.map(f=>{
    if(f.category!==dim.group)return 'U';
    if(f[dim.key]===value)return 'Y';
    // Distinct explicit countries/artists/product categories exclude each
    // other. A unique named physical site has a single primary city.
    if(dim.key==='cityLandmark')return 'N';
    return f[dim.key]?'N':'U';
   });
   const yes=states.filter(x=>x==='Y').length,no=states.filter(x=>x==='N').length;
   if(yes===0||no===0)continue;
   questions.push({id:'AUTO-'+String(questions.length+1).padStart(3,'0'),text:label,states,origin:dim.key});
  }
 }
 return {questions,sourceRows:facts.length};
}
