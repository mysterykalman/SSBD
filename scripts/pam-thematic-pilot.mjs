import {readFile} from 'node:fs/promises';
export async function loadThematicPilot(){
 const doc=JSON.parse(await readFile(new URL('../data/pam20q/expansion/thematic-pilot-16.json',import.meta.url),'utf8'));
 if(doc.status!=='research_pilot_unreviewed_not_for_release'||doc.targets.length!==16||doc.questions.length!==24)throw Error('Invalid frozen Pam thematic pilot');
 const topics=new Set(['city','person','movie','brand']);
 const names=new Set();
 for(const target of doc.targets){
  if(!topics.has(target.category)||names.has(target.name)||!Array.isArray(target.positiveTags))throw Error('Invalid pilot target: '+target.name);
  names.add(target.name);
 }
 const questions=doc.questions.map(q=>{
  if(!q.text.endsWith('?')||!q.id||!(q.scope==='all'||topics.has(q.scope)))throw Error('Malformed pilot question '+q.id);
  const known=Uint8Array.from(doc.targets.map(t=>q.scope==='all'||q.scope===t.category?1:0));
  const states=Uint8Array.from(doc.targets.map(t=>t.category===q.id||t.positiveTags.includes(q.id)?3:2));
  return {...q,known,states};
 });
 if(new Set(questions.map(q=>q.id)).size!==24)throw Error('Duplicate pilot question');
 return {status:doc.status,targets:doc.targets.map(t=>({name:t.name,category:t.category})),questions};
}
