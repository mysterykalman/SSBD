import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DEFAULT_RUNTIME = path.join('src','client','mom-mode','knowledge.runtime.json');
const DOMAIN_IDS=['person','animal','plant','place','food_drink','object','media_work','event','organization','abstract'];

export function normalizeQuestionText(value='') {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function hasSorted(values,index){
  return Array.isArray(values) && values.includes(index);
}

export function truthAt(runtime,conceptIndex,questionIndex){
  const concept=runtime?.concepts?.[conceptIndex];
  if(!concept)return null;
  if(hasSorted(concept.yes,questionIndex))return 'Y';
  if(hasSorted(concept.no,questionIndex))return 'N';
  if(hasSorted(concept.maybe,questionIndex))return 'S';
  return null;
}

export function buildQuestionIndex(runtime){
  return Object.fromEntries((runtime?.questions||[]).map((question,index)=>[question.id,index]));
}

export function questionAppliesToConcept(runtime,questionIndexValue,conceptIndex,questionIndex=buildQuestionIndex(runtime)){
  const question=runtime?.questions?.[questionIndexValue];
  const concept=runtime?.concepts?.[conceptIndex];
  if(!question||!concept)return false;
  if(question.excludes?.includes(concept.category))return false;
  const applies=question.appliesTo||[];
  if(!applies.length)return true;
  if(applies.includes(concept.category)||applies.includes(concept.subcategory))return true;
  for(const requirement of applies){
    const requiredIndex=questionIndex[requirement];
    if(requiredIndex!=null&&truthAt(runtime,conceptIndex,requiredIndex)==='Y')return true;
  }
  return false;
}

export function conceptRootConflicts(runtime){
  const questionIndex=buildQuestionIndex(runtime);
  return (runtime?.concepts||[]).flatMap((concept,index)=>{
    const roots=DOMAIN_IDS.filter(id=>questionIndex[id]!=null&&truthAt(runtime,index,questionIndex[id])==='Y');
    return roots.length>1?[{index,id:concept.id,name:concept.name,category:concept.category,roots}]:[];
  });
}

export function buildIdentityRepairTargets(runtime,{limit=1000,includeConflicts=true}={}){
  const conflictsByIndex=new Map(conceptRootConflicts(runtime).map(row=>[row.index,row]));
  return (runtime?.concepts||[])
    .map((concept,index)=>({concept,index,known:(concept.yes?.length||0)+(concept.no?.length||0)+(concept.maybe?.length||0),conflict:conflictsByIndex.get(index)}))
    .filter(row=>row.known===0||(includeConflicts&&row.conflict))
    .sort((a,b)=>(Number(b.concept.prior)||0)-(Number(a.concept.prior)||0)||a.concept.name.localeCompare(b.concept.name,'en'))
    .slice(0,limit)
    .map(({concept,known,conflict})=>({
      concept_id:concept.id,
      name:concept.name,
      current_category:concept.category,
      current_subcategory:concept.subcategory||'',
      known_cells:known,
      root_conflict:(conflict?.roots||[]).join('|'),
      repair_reason:known===0?'zero_knowledge':'conflicting_roots'
    }));
}

export function duplicateQuestionGroups(runtime){
  const groups=new Map();
  (runtime?.questions||[]).forEach((question,index)=>{
    const key=normalizeQuestionText(question.q);
    if(!key)return;
    const list=groups.get(key)||[];
    list.push({index,id:question.id,q:question.q,group:question.group,requires:question.requires,appliesTo:question.appliesTo||[]});
    groups.set(key,list);
  });
  return [...groups.entries()]
    .filter(([,questions])=>questions.length>1)
    .map(([normalized,questions])=>({normalized,questions}))
    .sort((a,b)=>b.questions.length-a.questions.length||a.normalized.localeCompare(b.normalized));
}

function increment(map,key,field,amount=1){
  const row=map.get(key)||{key,total:0,known:0,missing:0};
  row[field]+=amount;
  if(field!=='total')row.total+=amount;
  map.set(key,row);
}

export function auditMomKnowledge(runtime){
  if(!runtime?.questions?.length||!runtime?.concepts?.length)throw new Error('Mom runtime knowledge is empty');
  const questionIndex=buildQuestionIndex(runtime);
  const questionStats=runtime.questions.map((question,index)=>({
    index,id:question.id,q:question.q,group:question.group,family:question.family,breadth:question.breadth,
    requires:question.requires,appliesTo:question.appliesTo||[],excludes:question.excludes||[],
    applicable:0,known:0,missing:0,yes:0,no:0,sometimes:0
  }));
  const categoryStats=new Map();
  let rawKnown=0;
  let applicableCells=0;
  let applicableKnown=0;
  let zeroKnowledgeConcepts=0;
  let zeroApplicableKnowledgeConcepts=0;

  for(let conceptIndex=0;conceptIndex<runtime.concepts.length;conceptIndex++){
    const concept=runtime.concepts[conceptIndex];
    const conceptKnown=(concept.yes?.length||0)+(concept.no?.length||0)+(concept.maybe?.length||0);
    rawKnown+=conceptKnown;
    if(conceptKnown===0)zeroKnowledgeConcepts++;
    let conceptApplicableKnown=0;
    for(let q=0;q<runtime.questions.length;q++){
      if(!questionAppliesToConcept(runtime,q,conceptIndex,questionIndex))continue;
      applicableCells++;
      questionStats[q].applicable++;
      const truth=truthAt(runtime,conceptIndex,q);
      if(truth){
        applicableKnown++;
        conceptApplicableKnown++;
        questionStats[q].known++;
        if(truth==='Y')questionStats[q].yes++;
        else if(truth==='N')questionStats[q].no++;
        else questionStats[q].sometimes++;
        increment(categoryStats,concept.category||'unknown','known');
      }else{
        questionStats[q].missing++;
        increment(categoryStats,concept.category||'unknown','missing');
      }
    }
    if(conceptApplicableKnown===0)zeroApplicableKnowledgeConcepts++;
  }

  const theoreticalCells=runtime.concepts.length*runtime.questions.length;
  const duplicates=duplicateQuestionGroups(runtime);
  const rootConflicts=conceptRootConflicts(runtime);
  const gatedQuestions=runtime.questions.filter(q=>q.requires!=null||(q.appliesTo||[]).length>0).length;
  const branchRequiredQuestions=runtime.questions.filter(q=>q.requires!=null).length;
  const zeroKnowledgeByCategory=Object.entries(runtime.concepts.reduce((acc,concept)=>{
    const known=(concept.yes?.length||0)+(concept.no?.length||0)+(concept.maybe?.length||0);
    if(known===0)acc[concept.category||'unknown']=(acc[concept.category||'unknown']||0)+1;
    return acc;
  },{})).map(([category,count])=>({category,count})).sort((a,b)=>b.count-a.count||a.category.localeCompare(b.category));

  return {
    meta:{
      concepts:runtime.concepts.length,
      questions:runtime.questions.length,
      theoreticalCells,
      rawKnown,
      rawCoverage:rawKnown/theoreticalCells,
      applicableCells,
      applicableKnown,
      applicableMissing:applicableCells-applicableKnown,
      applicableCoverage:applicableCells?applicableKnown/applicableCells:0,
      gatedQuestions,
      branchRequiredQuestions,
      zeroKnowledgeConcepts,
      zeroApplicableKnowledgeConcepts,
      duplicateWordingGroups:duplicates.length,
      duplicateQuestionRecords:duplicates.reduce((sum,group)=>sum+group.questions.length,0),
      rootConflictConcepts:rootConflicts.length
    },
    zeroKnowledgeByCategory,
    categoryStats:[...categoryStats.values()].map(row=>({...row,coverage:row.total?row.known/row.total:0})).sort((a,b)=>b.missing-a.missing||a.key.localeCompare(b.key)),
    questionStats:questionStats.map(row=>({...row,coverage:row.applicable?row.known/row.applicable:0})).sort((a,b)=>b.missing-a.missing||a.id.localeCompare(b.id)),
    duplicates,
    rootConflicts
  };
}

export function buildRepairTargets(runtime,{limit=1000}={}){
  const questionIndex=buildQuestionIndex(runtime);
  const targets=[];
  const conceptOrder=runtime.concepts.map((concept,index)=>({concept,index})).sort((a,b)=>(Number(b.concept.prior)||0)-(Number(a.concept.prior)||0)||a.concept.name.localeCompare(b.concept.name,'en'));
  for(const {concept,index:conceptIndex} of conceptOrder){
    for(let q=0;q<runtime.questions.length;q++){
      if(targets.length>=limit)return targets;
      if(truthAt(runtime,conceptIndex,q))continue;
      if(!questionAppliesToConcept(runtime,q,conceptIndex,questionIndex))continue;
      const question=runtime.questions[q];
      targets.push({
        concept_id:concept.id,
        name:concept.name,
        category:concept.category,
        subcategory:concept.subcategory||'',
        question_id:question.id,
        question:question.q,
        question_group:question.group,
        question_family:question.family,
        question_breadth:question.breadth
      });
    }
  }
  return targets;
}

function percent(value){return `${(value*100).toFixed(2)}%`;}

export function formatAuditSummary(audit){
  const m=audit.meta;
  return [
    `Concepts: ${m.concepts.toLocaleString('en-US')}`,
    `Questions: ${m.questions.toLocaleString('en-US')}`,
    `Theoretical cells: ${m.theoreticalCells.toLocaleString('en-US')}`,
    `Raw known cells: ${m.rawKnown.toLocaleString('en-US')} (${percent(m.rawCoverage)})`,
    `Applicable cells under current runtime metadata: ${m.applicableCells.toLocaleString('en-US')}`,
    `Applicable known: ${m.applicableKnown.toLocaleString('en-US')} (${percent(m.applicableCoverage)})`,
    `Applicable missing: ${m.applicableMissing.toLocaleString('en-US')}`,
    `Gated questions: ${m.gatedQuestions.toLocaleString('en-US')}`,
    `Questions with explicit requires gate: ${m.branchRequiredQuestions.toLocaleString('en-US')}`,
    `Concepts with zero knowledge: ${m.zeroKnowledgeConcepts.toLocaleString('en-US')}`,
    `Concepts with zero applicable knowledge: ${m.zeroApplicableKnowledgeConcepts.toLocaleString('en-US')}`,
    `Duplicate wording groups: ${m.duplicateWordingGroups.toLocaleString('en-US')}`,
    `Concepts with conflicting positive domain roots: ${m.rootConflictConcepts.toLocaleString('en-US')}`
  ].join('\n');
}

function parseArgs(argv){
  const out={runtime:DEFAULT_RUNTIME,json:'',targets:'',identityTargets:'',limit:1000};
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==='--runtime')out.runtime=argv[++i];
    else if(arg==='--json')out.json=argv[++i];
    else if(arg==='--targets')out.targets=argv[++i];
    else if(arg==='--identity-targets')out.identityTargets=argv[++i];
    else if(arg==='--limit')out.limit=Math.max(1,Number(argv[++i])||1000);
  }
  return out;
}

function csvCell(value){
  const text=String(value??'');
  return /[",\n\r]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}

function writeCsv(file,targets,columns){
  const rows=[columns.join(','),...targets.map(target=>columns.map(column=>csvCell(target[column])).join(','))];
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,rows.join('\n')+'\n');
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  const runtimePath=path.resolve(process.cwd(),args.runtime);
  const runtime=JSON.parse(fs.readFileSync(runtimePath,'utf8'));
  const audit=auditMomKnowledge(runtime);
  console.log(formatAuditSummary(audit));
  if(args.json){
    const out=path.resolve(process.cwd(),args.json);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(audit,null,2)+'\n');
    console.log(`Audit JSON: ${path.relative(process.cwd(),out)}`);
  }
  if(args.targets){
    const targets=buildRepairTargets(runtime,{limit:args.limit});
    const out=path.resolve(process.cwd(),args.targets);writeCsv(out,targets,['concept_id','name','category','subcategory','question_id','question','question_group','question_family','question_breadth']);
    console.log(`Repair targets: ${path.relative(process.cwd(),out)} (${targets.length.toLocaleString('en-US')} rows)`);
  }
  if(args.identityTargets){
    const targets=buildIdentityRepairTargets(runtime,{limit:args.limit});
    const out=path.resolve(process.cwd(),args.identityTargets);writeCsv(out,targets,['concept_id','name','current_category','current_subcategory','known_cells','root_conflict','repair_reason']);
    console.log(`Identity repair targets: ${path.relative(process.cwd(),out)} (${targets.length.toLocaleString('en-US')} rows)`);
  }
}

const isCli=process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]);
if(isCli)main();
