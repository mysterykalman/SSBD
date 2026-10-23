/** Only explicit, named identity collisions may be disambiguated.
 * No generic string rewriting or silent removal of legitimate targets. */
const normalized=x=>String(x).normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g,' ');
export function reconcilePamIdentities(originalNames,roster){
 const existing=new Set(originalNames.map(normalized));
 const used=new Set(existing),aliases=[],overlaps=[];
 const newEntries=roster.map(subject=>{
  const key=normalized(subject.name);
  let name=subject.name;
  if(existing.has(key)){
   overlaps.push({id:subject.id,name:subject.name,category:subject.category});
   if(subject.id==='PAM-1326'&&subject.name==='Dove'&&subject.category==='Brands'){
    name='Dove (personal care brand)';
    aliases.push({id:subject.id,oldName:subject.name,disambiguatedName:name,reason:'Original dove is the animal; the new Dove is a distinct personal-care brand'});
   }else throw Error('Unresolved cross-library identity collision '+subject.id+': '+subject.name);
  }
  const resolved=normalized(name);
  if(used.has(resolved))throw Error('Nonunique Pam identity '+name);
  used.add(resolved);
  return {...subject,name};
 });
 return{newEntries,overlaps,aliases};
}
