/**
 * Remove semantically redundant candidate questions without discarding a single
 * known-opposite target pair. A 20Q game needs good splitters, not a thousand
 * low-value fact trivia prompts.
 *
 * The test counts all pairs with both known contradictory facts before/after.
 * UNKNOWN is never counted as false; removal is exact, not sampled.
 */
import {knownOppositeAudit} from './pam-known-opposite-audit.mjs';

const COST_PRIORITY=Object.freeze({
 movie_year:12,movie_decade:8,movie_period:4,
 city_country:2,car_origin:2,painting_artist:2,musical_creators:2,
 person_occupation:1,subtopic:-5,region:-7,topic:-9
});

export function pruneRedundantQuestions(model,{protectedFields=['macro_topic','topic','subtopic'],maxQuestions=450}={}){
 const n=model.targets.length;
 const matrix=new Uint16Array(n*n); // upper triangle only
 const choices=[];
 let originalPairs=0;
 for(const q of model.questions){
  if(q.known.length!==n||q.states.length!==n)throw Error('Invalid question matrix');
  const yes=[],no=[];
  for(let i=0;i<n;i++)if(q.known[i]){
   if(q.states[i]===3)yes.push(i);else if(q.states[i]===2)no.push(i);
   else throw Error('Invalid known response');
  }
  choices.push({q,yes,no});
  for(const a of yes)for(const b of no){
   const x=a<b?a:b,y=a<b?b:a,idx=x*n+y;
   if(matrix[idx]++===0)originalPairs++;
  }
 }
 const countsBefore=originalPairs;
 const active=new Set(model.questions.map(q=>q.id));
 let removed=0;
 // Keep explicitly needed high-level routing questions unless a structural
 // revision is proven by gameplay tests; prune narrow duplicate facts first.
 const eligible=choices.filter(x=>!protectedFields.includes(x.q.field)).sort((a,b)=>
  (COST_PRIORITY[b.q.field]||0)-(COST_PRIORITY[a.q.field]||0)||
  (a.yes.length*a.no.length)-(b.yes.length*b.no.length)||a.q.id.localeCompare(b.q.id));
 for(const {q,yes,no} of eligible){
  let indispensable=false;
  for(const a of yes){
   if(indispensable)break;
   for(const b of no){
    const x=a<b?a:b,y=a<b?b:a;
    if(matrix[x*n+y]===1){indispensable=true;break;}
   }
  }
  if(indispensable)continue;
  for(const a of yes)for(const b of no){const x=a<b?a:b,y=a<b?b:a;matrix[x*n+y]--;}
  active.delete(q.id);
  removed++;
 }
 const survivors=model.questions.filter(q=>active.has(q.id));
 let totalPairs=0;
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(matrix[i*n+j])totalPairs++;
 if(totalPairs!==countsBefore)throw Error('Pruning lost known-opposite separability!');
 const details={before:model.questions.length,after:survivors.length,removed,pairsPreserved:totalPairs,
  questionCountUnderPlanningBudget:survivors.length<=maxQuestions,removedByField:{}};
 for(const q of model.questions)if(!active.has(q.id))details.removedByField[q.field]=(details.removedByField[q.field]||0)+1;
 return{model:{...model,questions:survivors},report:details};
}