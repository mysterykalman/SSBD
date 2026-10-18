/**
 * SSBD Pam experimental reasoning engine for thematic knowledge.
 * RELEASE STATUS: LAB ONLY. Not connected to gameplay.
 *
 * The model must declare known masks explicitly. Missing facts are NOT false.
 * Strong and soft answers are probabilistic; a wrong guess never becomes an
 * excuse to guess randomly. The chooser optimizes information gained per turn,
 * not the raw number of possible questions or word-spelling heuristics.
 */

const ANSWERS=Object.freeze({yes:[.985,.015],no:[.015,.985],probably:[.72,.28],probably_not:[.28,.72]});
const EPS=1e-12;

function entropy(probabilities){let h=0;for(const p of probabilities)if(p>EPS)h-=p*Math.log2(p);return h;}
function sum(values){let total=0;for(const x of values)total+=x;return total;}

function familiesFor(field){
 if(field.startsWith('movie_')||field==='release_date'||field==='release_decade')return 'release-period';
 if(field==='topic'||field==='subtopic')return field;
 if(field==='city_country'||field==='car_origin'||field==='region'||field==='continent'||field==='country')return 'geography';
 if(field==='person_occupation'||field==='occupation')return 'occupation';
 if(field==='painting_artist'||field==='musical_creators'||field==='creator')return 'creator';
 return field;
}

export function createThematicGame(model,{maxTurns=20,minGuessTurns=7,earlyGuessProbability=.88}={}){
 if(!model||!model.targets?.length||!Array.isArray(model.questions))throw Error('Invalid thematic model');
 if(!Number.isInteger(maxTurns)||maxTurns<1||maxTurns>20)throw Error('Pam must stay within 20 turns');
 const mass=new Float64Array(model.targets.length).fill(1/model.targets.length);
 return {model,mass,asked:new Set(),history:[],maxTurns,minGuessTurns,earlyGuessProbability,turn:0,status:'playing'};
}

export function candidateDistribution(game,limit=10){
 const indexes=Array.from(game.mass.keys()).sort((a,b)=>game.mass[b]-game.mass[a]||a-b).slice(0,limit);
 return indexes.map(i=>({index:i,name:game.model.targets[i].name,p:game.mass[i]}));
}

function questionUtility(game,q){
 let yes=0,no=0,unknown=0;
 const a=game.mass;
 for(let i=0;i<a.length;i++){
  if(a[i]<=EPS)continue;
  if(!q.known[i])unknown+=a[i];
  else if(q.states[i]===3)yes+=a[i];
  else if(q.states[i]===2)no+=a[i];
  else throw Error('Unsupported answer state for '+q.id);
 }
 const coverage=yes+no;
 if(coverage<EPS||yes<EPS||no<EPS)return null;
 // Uncertain facts yield inconclusive answers and therefore little information.
 // A balanced yes/no question with high coverage is strongly preferred.
 const impliedYes=yes+unknown*.5;
 const binary=-(impliedYes*Math.log2(Math.max(EPS,impliedYes))+(1-impliedYes)*Math.log2(Math.max(EPS,1-impliedYes)));
 let utility=binary*coverage;
 const family=familiesFor(q.field);
 const previous=game.history.filter(x=>x.type==='question');
 const last=previous.slice(-3).map(x=>x.family);
 // A good interviewer doesn't ask redundant fine-grained time/location facts.
 if(last.at(-1)===family)utility*=.72;
 if(last.at(-2)===family)utility*=.88;
 if(last.slice(-2).every(x=>x===family))utility*=.28;
 if(q.field==='movie_year'&&game.turn<12)utility*=.06;
 if(q.field==='movie_year'&&game.mass.length>40)utility*=.4;
 return {q,utility,yes,no,unknown,family,coverage};
}

export function selectThematicQuestion(game){
 if(game.status!=='playing')return null;
 const ranked=[];
 for(const q of game.model.questions){
  if(game.asked.has(q.id))continue;
  const utility=questionUtility(game,q);
  if(utility)ranked.push(utility);
 }
 ranked.sort((a,b)=>b.utility-a.utility||a.q.id.localeCompare(b.q.id));
 return ranked[0]||null;
}

/**
 * Bayesian update: Yes/No are strong, Probably is informative but weaker,
 * and the unknown field itself contributes likelihood .5 (not rejection).
 */
export function acceptThematicAnswer(game,question,answer){
 if(game.status!=='playing'||game.turn>=game.maxTurns)throw Error('Pam game is not accepting answers');
 const selected=question?.q||question;
 if(!selected?.id||game.asked.has(selected.id))throw Error('Question missing or already asked');
 const mode=String(answer).toLowerCase();
 if(!Object.prototype.hasOwnProperty.call(ANSWERS,mode)&&mode!=='unknown')throw Error('Unsupported answer '+mode);
 const prior=game.mass;
 if(mode!=='unknown'){
  const [likeYes,likeNo]=ANSWERS[mode];
  for(let i=0;i<prior.length;i++){
   const probability=!selected.known[i]?.5:selected.states[i]===3?likeYes:likeNo;
   prior[i]*=probability;
  }
  const evidence=sum(prior);
  if(evidence<EPS)throw Error('Pam exhausted all probability mass unexpectedly');
  for(let i=0;i<prior.length;i++)prior[i]/=evidence;
 }
 game.asked.add(selected.id);
 game.history.push({turn:game.turn+1,type:'question',id:selected.id,field:selected.field,
  family:familiesFor(selected.field),text:selected.text,answer:mode});
 game.turn++;
 return candidateDistribution(game,5);
}

export function nextThematicDecision(game){
 if(game.status!=='playing')return {kind:'complete'};
 const top=candidateDistribution(game,2);
 const leader=top[0]||null;
 const margin=leader?leader.p-(top[1]?.p||0):0;
 if(leader&&game.turn>=game.minGuessTurns&&leader.p>=game.earlyGuessProbability&&margin>=.18){
  return{kind:'guess',turns:game.turn,name:leader.name,confidence:leader.p};
 }
 if(game.turn>=game.maxTurns){
  return{kind:'time_up',turns:game.turn,bestGuess:leader?.name||null,confidence:leader?.p||0};
 }
 const pick=selectThematicQuestion(game);
 if(!pick||pick.utility<EPS){
  return{kind:'insufficient_evidence',turns:game.turn,bestGuess:leader?.name||null,confidence:leader?.p||0};
 }
 return{kind:'question',question:pick.q,informationGain:pick.utility,coverage:pick.coverage};
}

export function oracleThematicGame(model,targetIndex,{softAt=[],unknownAt=[],maxTurns=20}={}){
 if(!Number.isInteger(targetIndex)||targetIndex<0||targetIndex>=model.targets.length)throw Error('Out of range target');
 const game=createThematicGame(model,{maxTurns});
 while(true){
  const next=nextThematicDecision(game);
  if(next.kind!=='question'){
   return{correct:next.kind==='guess'&&next.name===model.targets[targetIndex].name,
    kind:next.kind,turns:game.turn,guess:next.name||next.bestGuess,
    p:next.confidence,log:game.history};
  }
  const q=next.question;
  let answer=unknownAt.includes(game.turn+1)||!q.known[targetIndex]?'unknown':q.states[targetIndex]===3?'yes':'no';
  if(softAt.includes(game.turn+1))answer=answer==='yes'?'probably':answer==='no'?'probably_not':'unknown';
  acceptThematicAnswer(game,q,answer);
 }
}

export const THEMATIC_REASONER_VERSION='lab-v1';