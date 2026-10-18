/**
 * Produce human-readable 20Q transcripts for the experimental themed model.
 * Does not automatically turn workbook facts into gameplay data; absent facts
 * are logged as unknown. This is a qualitative evaluation artifact, not release.
 */
import {writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadThematicRoster,compileThematicModel} from './pam-thematic-lab.mjs';
import {pruneRedundantQuestions} from './pam-question-prune.mjs';
import {oracleThematicGame} from './pam-thematic-reasoner.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const roster=await loadThematicRoster();
const full=compileThematicModel(roster);
const pruned=pruneRedundantQuestions(full);
const model=pruned.model;
const samples=[];
for(const category of new Set(roster.map(x=>x.category))){
 const indexes=roster.flatMap((x,i)=>x.category===category?[i]:[]);
 for(const i of [...new Set([indexes[0],indexes[Math.floor(indexes.length/2)],indexes.at(-1)])]){
  for(const [scenario,opts] of [['exact',{}],['softened',{softAt:[4,9,14]}]]){
   const trial=oracleThematicGame(model,i,opts);
   const log=trial.log;
   let repeated=0;
   for(let q=2;q<log.length;q++){
    if(log[q].family===log[q-1].family&&log[q-1].family===log[q-2].family)repeated++;
   }
   samples.push({name:roster[i].name,category,scenario,turns:trial.turns,kind:trial.kind,
    correct:trial.correct,remainingConfidence:trial.p,unknowns:log.filter(x=>x.answer==='unknown').length,
    threeSameFamilyStreaks:repeated,
    transcript:log.map(x=>({turn:x.turn,pam:x.text,response:x.answer,family:x.family}))});
  }
 }
}
const report={stage:'RESEARCH_ONLY_DO_NOT_DEPLOY',source:'SSBD initial 1650 workbook metadata only',
 questionsBefore:full.questions.length,questionsAfter:pruned.report.after,
 samples:samples.length,correct:samples.filter(x=>x.correct).length,
 unknownReplies:samples.reduce((n,x)=>n+x.unknowns,0),
 repeatedFamilyStreaks:samples.reduce((n,x)=>n+x.threeSameFamilyStreaks,0),
 transcripts:samples,gate:'BLOCKED: editorial source facts and successful complete oracle games required'};
const out=join(root,'data','pam20q','expansion','fun-audit.json');
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({stage:report.stage,questionsBefore:report.questionsBefore,
 questionsAfter:report.questionsAfter,samples:report.samples,correct:report.correct,
 unknownReplies:report.unknownReplies,repeatedFamilyStreaks:report.repeatedFamilyStreaks,
 first:report.transcripts[0]?.transcript?.slice(0,7)},null,2));