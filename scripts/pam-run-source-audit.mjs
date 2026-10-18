/** Deterministic, nonshipping measurement of how many known-opposite pairs
 * are newly supported by 467 unverified Wikidata source-fact candidates. */
import {writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadThematicRoster,compileThematicModel} from './pam-thematic-lab.mjs';
import {loadSourceEvidence550,compileSourceResearch} from './pam-source-evidence-compiler.mjs';
import {knownOppositeAudit} from './pam-known-opposite-audit.mjs';
import {pruneRedundantQuestions} from './pam-question-prune.mjs';
import {oracleThematicGame} from './pam-thematic-reasoner.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const roster=await loadThematicRoster();
const base=compileThematicModel(roster);
const sourced=compileSourceResearch(base,await loadSourceEvidence550());
const before=knownOppositeAudit(base),after=knownOppositeAudit(sourced.model);
const pruned=pruneRedundantQuestions(sourced.model);
const validated=knownOppositeAudit(pruned.model);
if(validated.unresolvedPairs!==after.unresolvedPairs)throw Error('Pruning lost source facts!');
const sample=[];
for(let i=0;i<roster.length;i+=16){
 const r=oracleThematicGame(pruned.model,i);
 sample.push({id:roster[i].id,name:roster[i].name,topic:roster[i].category,correct:r.correct,turns:r.turns,
  responseUnknowns:r.log.filter(x=>x.answer==='unknown').length,kind:r.kind});
}
const report={status:'UNREVIEWED_SOURCE_RESEARCH_ONLY',
 sourceFacts:sourced.report,
 original:{questions:base.questions.length,individuallySeparable:before.uniquelySeparable,unresolvedPairs:before.unresolvedPairs},
 withResearch:{questions:sourced.model.questions.length,prunedQuestions:pruned.model.questions.length,
  individuallySeparable:after.uniquelySeparable,unresolvedPairs:after.unresolvedPairs,
  newKnownOppositePairs:before.unresolvedPairs-after.unresolvedPairs},
 sample:{trials:sample.length,correct:sample.filter(x=>x.correct).length,
  questionBudget:20,results:sample},
 verifiedIdentityCount:0,approvedQuestionCount:0,
 releaseGate:'BLOCKED: still missing many known contrary facts and no full exact or softened game clearance'};
const path=join(root,'data','pam20q','expansion','source-evidence-audit.json');
await mkdir(dirname(path),{recursive:true});
await writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report, sample:{trials:sample.length,correct:report.sample.correct}},null,2));