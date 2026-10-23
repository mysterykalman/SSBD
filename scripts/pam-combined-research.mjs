/** Research-only 1775 + recovered 1650 target merged matrix. Not a playable release. */
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {enrichPamModel} from './pam-enrich-model.mjs';
import {applyVerifiedPamFacts} from './pam-verified-facts.mjs';
import {applyReviewedPamCorrections} from './pam-reviewed-corrections.mjs';
import {loadThematicRoster,compileThematicModel} from './pam-thematic-lab.mjs';

const norm=x=>String(x).normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g,' ');
export function assemblePamCombinedResearch(base,roster){
 const oldN=base.targets.length,oldF=base.questions.length;
 if(oldN!==1775||oldF!==156||roster.length!==1650)throw Error('Requires real 1775×156 model and 1650 thematic roster');
 if(base.weights.length!==oldN*oldF||base.knownMask.length!==oldN*oldF)throw Error('Original matrix invalid');
 const oldNames=new Set(base.targets.map(norm));
 const overlaps=roster.filter(t=>oldNames.has(norm(t.name)));
 const newEntries=roster.filter(t=>!oldNames.has(norm(t.name)));
 const thematic=compileThematicModel(newEntries);
 const N=oldN+newEntries.length,F=oldF+thematic.questions.length;
 const weights=new Uint8Array(N*F),knownMask=new Uint8Array(N*F);
 for(let q=0;q<oldF;q++){
  weights.set(base.weights.subarray(q*oldN,(q+1)*oldN),q*N);
  knownMask.set(base.knownMask.subarray(q*oldN,(q+1)*oldN),q*N);
 }
 for(let j=0;j<thematic.questions.length;j++){
  const q=thematic.questions[j],offset=(oldF+j)*N+oldN;
  weights.set(q.states,offset);knownMask.set(q.known,offset);
 }
 // Strictly unknown: old questions on new subjects, new questions on old
 // subjects. A missing fact is NEVER an inferred negative.
 let oldKnown=0,newKnown=0;
 for(let q=0;q<oldF;q++)for(let t=0;t<oldN;t++)oldKnown+=knownMask[q*N+t];
 for(let q=oldF;q<F;q++)for(let t=oldN;t<N;t++)newKnown+=knownMask[q*N+t];
 const originalKnown=base.knownMask.reduce((a,v)=>a+v,0);
 if(oldKnown!==originalKnown)throw Error('Original knowledge changed during research integration');
 const newQuestions=thematic.questions.map(q=>q.text);
 return{status:'RESEARCH_ONLY_NOT_PLAYABLE',targets:[...base.targets,...newEntries.map(t=>t.name)],questions:[...base.questions,...newQuestions],weights,knownMask,metadata:{originalTargets:oldN,sourceRoster:roster.length,netNewTargets:newEntries.length,overlaps:overlaps.map(x=>({id:x.id,name:x.name})),combinedTargets:N,originalQuestions:oldF,experimentalQuestions:thematic.questions.length,combinedQuestions:F,originalKnownCells:oldKnown,newCandidateKnownCells:newKnown,oldQuestionOnNewSubjectKnownCells:0,newQuestionOnOldSubjectKnownCells:0,missingCrossCohortCells:oldF*newEntries.length+thematic.questions.length*oldN,editorialApproval:'PENDING',gameplayApproval:'PENDING'}};
}
export async function loadPamCombinedResearch(){
 const [base,roster]=await Promise.all([loadPam1775Model(loadPamClassicModel).then(enrichPamModel).then(applyVerifiedPamFacts).then(applyReviewedPamCorrections),loadThematicRoster()]);
 return assemblePamCombinedResearch(base,roster);
}
