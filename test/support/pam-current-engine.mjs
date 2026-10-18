/**
 * Current, shipped Pam engine fixture. Legacy MomBayes is not a production API.
 * Compile the 1,775-answer model from source rather than a stale generated stub.
 */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {loadPamClassicModel} from '../../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../../scripts/pam-quality-model.mjs';

let loaded;
export async function loadCurrentPam(){
 if(!loaded)loaded=(async()=>{
  const model=await loadPam1775Model(loadPamClassicModel);
  const source=await readFile(new URL('../../src/client/mom-mode/engine.js',import.meta.url),'utf8');
  const context={console,atob:value=>Buffer.from(value,'base64').toString('binary')};
  context.window=context;
  context.PAM_CLASSIC_MODEL={
   questions:model.questions,targets:model.targets,
   weightsB64:model.weights.toString('base64'),
   knownMaskB64:model.knownMask.toString('base64'),
   layout:'question-major',states:4
  };
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'src/client/mom-mode/engine.js'});
  if(!context.PamClassic20Q||context.PamClassic20Q.N!==1775)
   throw Error('Current Pam engine failed to load the verified source model');
  return{engine:context.PamClassic20Q,model};
 })();
 return loaded;
}

export function oracleAnswer(model,targetIndex,questionIndex){
 const cell=questionIndex*model.targets.length+targetIndex;
 if(model.knownMask[cell]!==1)return 'unknown';
 return(model.weights[cell]&1)?'yes':'no';
}

/** Self-play is a synthetic diagnostic, never a human win-rate estimate. */
export function traceCurrentPam({engine,model},targetIndex,{softAnswerAt=null,unknownAt=null}={}){
 const g=engine.createGame({budget:20,minGuessQuestions:7});
 const yesAnimal=(model.weights[targetIndex]&1)===1;
 const yesPlant=(model.weights[model.targets.length+targetIndex]&1)===1;
 const opening=yesAnimal||yesPlant?'animal_plant':'other';
 const path=[{kind:'opening',turn:1,answer:opening}];
 let action=engine.setOpeningCategory(g,opening);
 const seen=new Set();
 for(let guard=0;guard<24;guard++){
  if(action.kind==='hunch')action=engine.commitGuess(g,action);
  if(action.kind==='guess'){
   const correct=action.index===targetIndex;
   const result=engine.confirm(g,action,correct);
   return {result,correct,turns:g.turn,guess:action.label,path,repeatCount:0};
  }
  if(action.kind!=='question')throw Error('Unexpected action '+action.kind);
  if(seen.has(action.index))throw Error('Repeated Pam question '+action.index);
  seen.add(action.index);
  let response=oracleAnswer(model,targetIndex,action.index);
  if(g.turn+1===unknownAt)response='unknown';
  else if(g.turn+1===softAnswerAt)response=response==='yes'?'probably':response==='no'?'doubtful':'unknown';
  path.push({kind:'question',turn:g.turn+1,id:action.id,text:action.text,response});
  action=engine.answer(g,action,response);
  if(g.turn>20)throw Error('Pam exceeded the 20-question limit');
 }
 throw Error('Pam did not finish inside 20 questions');
}
