(function(global){
'use strict';
const base=global.MOM_KNOWLEDGE;
if(!base) throw new Error('Mom knowledge not loaded');
const general=global.MOM_GENERAL_KNOWLEDGE||{FEATURES:[],OBJECTS:[],meta:{}};
const extra=global.MOM_GENERATED_KNOWLEDGE||{FEATURES:[],OBJECTS:[],meta:{}};
const controlled=global.MOM_CONTROLLED_KNOWLEDGE||{FEATURES:[],OBJECTS:[],meta:{}};
const featureMap=new Map();
for(const source of [base.FEATURES||[],general.FEATURES||[],extra.FEATURES||[],controlled.FEATURES||[]])for(const f of source){if(!f?.id||!f?.q)continue;if(!featureMap.has(f.id))featureMap.set(f.id,{id:f.id,q:f.q,label:f.label||f.id,group:f.group||null,requires:f.requires||null});}
const FEATURES=[...featureMap.values()];
const idx=Object.fromEntries(FEATURES.map((f,i)=>[f.id,i]));
const objectMap=new Map();
for(const source of [base.OBJECTS||[],general.OBJECTS||[],extra.OBJECTS||[],controlled.OBJECTS||[]])for(const raw of source){if(!raw?.name)continue;const key=String(raw.name).trim().toLocaleLowerCase('en');const clean={...raw,name:String(raw.name).trim(),yes:[...new Set((raw.yes||[]).filter(id=>idx[id]!=null))],no:[...new Set((raw.no||[]).filter(id=>idx[id]!=null))],maybe:[...new Set((raw.maybe||[]).filter(id=>idx[id]!=null))],weight:Number.isFinite(Number(raw.weight))&&Number(raw.weight)>0?Number(raw.weight):1};if(!objectMap.has(key)){objectMap.set(key,clean);continue;}const old=objectMap.get(key);const yes=[...new Set([...old.yes,...clean.yes])];const no=[...new Set([...(old.no||[]),...(clean.no||[])].filter(id=>!yes.includes(id)))];const maybe=[...new Set([...old.maybe,...clean.maybe].filter(id=>!yes.includes(id)&&!no.includes(id)))];objectMap.set(key,{...clean,...old,yes,no,maybe,weight:Math.max(old.weight||1,clean.weight||1)});}
const OBJECTS=[...objectMap.values()], N=OBJECTS.length, F=FEATURES.length;
const truth=new Float64Array(N*F);truth.fill(NaN);
OBJECTS.forEach((o,i)=>{
 for(const id of o.yes||[])if(idx[id]!=null)truth[i*F+idx[id]]=1;
 for(const id of o.maybe||[])if(idx[id]!=null&&Number.isNaN(truth[i*F+idx[id]]))truth[i*F+idx[id]]=0.5;
 for(const id of o.no||[])if(idx[id]!=null&&Number.isNaN(truth[i*F+idx[id]]))truth[i*F+idx[id]]=0;
 o.no=[...new Set(o.no||[])];
 const yes=new Set(o.yes||[]);
 const families=['gk_artwork','gk_book','gk_film','gk_tv','gk_music_work','gk_invention','gk_science','gk_event','gk_mythology','gk_brand','gk_product'];
 const kind=String(o.kind||'');const rootByKind={person:'person',place:'place',animal:'animal',plant:'plant',food:'food',drink:'drink',artwork:'object',book:'object',invention:'object',product:'object'};
 const familyByKind={artwork:'gk_artwork',book:'gk_book',film:'gk_film',television:'gk_tv',music:'gk_music_work',invention:'gk_invention',science:'gk_science',event:'gk_event',mythology:'gk_mythology',brand:'gk_brand',product:'gk_product'};
 const roots=['person','animal','plant','place','food','drink','object'];
 let root=rootByKind[kind]||roots.find(id=>yes.has(id))||null;
 if(!root&&(base.OBJECTS||[]).some(x=>String(x?.name||'').trim().toLocaleLowerCase('en')===String(o.name||'').trim().toLocaleLowerCase('en'))&&yes.has('manmade'))root='object';
 const family=familyByKind[kind]||families.find(id=>yes.has(id))||null;
 if(root){for(const id of roots)if(id===root||((root==='animal'||root==='plant')&&id==='object'))truth[i*F+idx[id]]=id===root?1:0;}
 if(root==='place'||root==='person'||root==='animal'||root==='plant'||root==='food'||root==='drink')if(idx.manmade!=null&&Number.isNaN(truth[i*F+idx.manmade]))truth[i*F+idx.manmade]=root==='place'?NaN:0;
 if(family){for(const id of families)if(idx[id]!=null&&Number.isNaN(truth[i*F+idx[id]]))truth[i*F+idx[id]]=id===family?1:0;}
 if(root==='place'||kind==='science'||kind==='event')for(const id of families)if(idx[id]!=null&&Number.isNaN(truth[i*F+idx[id]]))truth[i*F+idx[id]]=0;
 if(kind==='science'||kind==='event')for(const id of roots)if(idx[id]!=null&&Number.isNaN(truth[i*F+idx[id]]))truth[i*F+idx[id]]=0;
 if(yes.has('gk_statue_monument')&&idx.gk_sculpture!=null)truth[i*F+idx.gk_sculpture]=1;
 if((yes.has('gk_sculpture')||yes.has('gk_statue_monument'))&&idx.gk_painting!=null)truth[i*F+idx.gk_painting]=0;
 if(yes.has('gk_painting')&&idx.gk_sculpture!=null)truth[i*F+idx.gk_sculpture]=0;
 o.no=[...new Set([...o.no,...FEATURES.filter(f=>truth[i*F+idx[f.id]]===0).map(f=>f.id)])];
});
function entropy(b){let h=0;for(const p of b)if(p>1e-12)h-=p*Math.log2(p);return h;}
function py(t,noise){return t===1?1-noise:t===0?noise:0.5;}
function binaryEntropy(p){return p<=1e-12||p>=1-1e-12?0:-p*Math.log2(p)-(1-p)*Math.log2(1-p);}
function evalQ(b,f,noise){let y=0,conditional=0;for(let i=0;i<N;i++){const p=b[i];if(p<=1e-15)continue;const q=py(truth[i*F+f],noise);y+=p*q;conditional+=p*binaryEntropy(q);}return Math.max(0,binaryEntropy(y)-conditional);}
function createGame(opts={}){const belief=new Float64Array(N);let total=0;for(let i=0;i<N;i++){belief[i]=OBJECTS[i].weight||1;total+=belief[i];}for(let i=0;i<N;i++)belief[i]/=total||1;return{belief,asked:new Set(),answers:new Map(),turn:0,budget:opts.budget||20,noise:opts.noise??0.06,guessThreshold:opts.guessThreshold??0.92,minGuessQuestions:opts.minGuessQuestions??5,continuePrice:opts.continuePrice??2,pending:null,status:'playing',history:[],surprise:false,guessUsed:false,continueCost:0,deferGuessOnce:false};}
function top(game){let j=0;for(let i=1;i<N;i++)if(game.belief[i]>game.belief[j])j=i;return{index:j,p:game.belief[j],object:OBJECTS[j]};}
function topTwo(game){let a=-1,b=-1;for(let i=0;i<N;i++){if(a<0||game.belief[i]>game.belief[a]){b=a;a=i;}else if(b<0||game.belief[i]>game.belief[b])b=i;}return{first:a,second:b,firstP:a<0?0:game.belief[a],secondP:b<0?0:game.belief[b]};}
const strongYes=a=>a==='yes'||a==='probably';
const OBJECTISH=new Set(['manmade','household','kitchen','bedroom','bathroom','wearable','electronic','battery','screen','wheels','vehicle','handheld','soft','fragile','metal','wood','paper','plastic','round','handle','opens','tool','toy','cleaning','furniture','clothing','container','cutting','writing','reading','computer','phone','road','rail','air','sea','building','appliance']);
const PERSON_SKIP=new Set([...OBJECTISH,'animal','plant','food','drink','pet','farm','wild','edible','sweet','salty','hot','cold','liquid','fruit','vegetable','baked','dairy','meat','dessert','frozen','caffeinated','bird','insect','mammal']);
const ANIMAL_SKIP=new Set([...OBJECTISH,'person','plant','food','drink','profession','fruit','vegetable','baked','dairy','meat','dessert','appliance','building']);
const FOOD_SKIP=new Set([...OBJECTISH,'person','animal','plant','place','profession','vehicle','building','pet','farm','wild','bird','insect','mammal']);
const PLACE_SKIP=new Set([...OBJECTISH,'person','animal','plant','food','drink','profession','wearable','clothing','tool','toy','edible']);
function questionAllowed(game,f){const id=FEATURES[f].id,a=game.answers;const req=FEATURES[f].requires;if(req&&!strongYes(a.get(req)))return false;if(strongYes(a.get('person'))&&PERSON_SKIP.has(id))return false;if(strongYes(a.get('animal'))&&ANIMAL_SKIP.has(id))return false;if(strongYes(a.get('food'))&&FOOD_SKIP.has(id))return false;if(strongYes(a.get('drink'))&&FOOD_SKIP.has(id))return false;if(strongYes(a.get('place'))&&PLACE_SKIP.has(id))return false;if(strongYes(a.get('alive'))&&id==='manmade')return false;return true;}
function hardMatch(t,a){if(!Number.isFinite(t))return true;if(a==='yes')return t>0;if(a==='no')return t<1;return true;}
function viableCandidates(game){const out=[];for(let i=0;i<N;i++){let ok=true;for(const [id,a] of game.answers){if(a!=='yes'&&a!=='no')continue;const f=idx[id];if(f==null)continue;if(!hardMatch(truth[i*F+f],a)){ok=false;break;}}if(ok)out.push(i);}return out;}
function guessReason(game){if(game.guessUsed||game.turn<game.minGuessQuestions)return null;const viable=viableCandidates(game);if(viable.length===1)return{reason:'logical',index:viable[0]};const leaders=topTwo(game);const separated=leaders.secondP<=0.0001||leaders.firstP/leaders.secondP>=3;const calibratedThreshold=game.turn>=18?Math.min(game.guessThreshold,0.6):game.turn>=15?Math.min(game.guessThreshold,0.75):game.guessThreshold;const ratio=leaders.secondP<=0.0001?Infinity:leaders.firstP/leaders.secondP;const lateSeparated=game.turn>=16&&leaders.firstP>=0.2&&ratio>=1.5;if((leaders.firstP>=calibratedThreshold&&separated)||lateSeparated)return{reason:'confidence',index:leaders.first};return null;}
function makeGuess(game,decision){const i=decision?.index??top(game).index,o=OBJECTS[i];return{kind:'guess',index:i,label:o.name,text:guessText(o),confidence:game.belief[i],reason:decision?.reason||'forced'};}
function makeHunch(game,decision){return{kind:'hunch',index:decision.index,confidence:game.belief[decision.index],reason:decision.reason,questionsAsked:game.turn,maxQuestions:game.budget,continuePrice:game.continuePrice,continueCost:game.continueCost};}
function scoreFor(questionCount,correct,stumped=false,continueCost=0){const base=Math.min(Math.max(Number(questionCount)||0,0),20);const bonus=stumped||!correct?10:0;return Math.max(0,base+bonus-Math.max(0,Number(continueCost)||0));}
function stumpedState(game){game.status='stumped';return{kind:'stumped',turns:game.turn,continueCost:game.continueCost,score:scoreFor(game.turn,false,true,game.continueCost)};}
function bestQuestion(game){let best=null,bg=-1;for(let f=0;f<F;f++){if(game.asked.has(f)||!questionAllowed(game,f))continue;const g=evalQ(game.belief,f,game.noise);if(g>bg){bg=g;best=f;}}return best==null?null:{index:best,gain:bg};}
function choose(game){if(game.status!=='playing')throw new Error('game finished');if(game.turn>=game.budget)return stumpedState(game);const decision=guessReason(game);if(decision?.reason==='logical')return makeGuess(game,decision);const nextQuestion=bestQuestion(game);if(decision?.reason==='confidence'&&!game.deferGuessOnce){if(nextQuestion)return makeHunch(game,decision);return makeGuess(game,{...decision,reason:'no_questions'});}if(game.deferGuessOnce)game.deferGuessOnce=false;if(!nextQuestion){const leader=top(game);if(game.turn>=game.minGuessQuestions)return makeGuess(game,{reason:'no_questions',index:leader.index});return stumpedState(game);}const best=nextQuestion.index;return{kind:'question',index:best,id:FEATURES[best].id,text:FEATURES[best].q,gain:nextQuestion.gain,confidence:top(game).p};}
function commitGuess(game,hunch){if(!hunch||hunch.kind!=='hunch')throw new Error('guess requires a hunch');if(game.status!=='playing')throw new Error('game finished');return makeGuess(game,{reason:'confidence',index:hunch.index});}
function deferGuess(game,hunch){if(!hunch||hunch.kind!=='hunch')throw new Error('continue requires a hunch');if(game.status!=='playing')throw new Error('game finished');game.continueCost+=game.continuePrice;game.deferGuessOnce=true;game.history.push({kind:'decision',decision:'continue',cost:game.continuePrice,afterQuestions:game.turn});return choose(game);}
function guessText(o){const n=o.name.toLowerCase();if(o.article==='')return`Is it ${n}?`;if(o.article)return`Is it ${o.article} ${n}?`;if(o.specificPerson||o.kind==='person')return`Are you thinking of ${o.name}?`;if(o.proper)return`Is it ${o.name}?`;return`Is it ${'aeiou'.includes(n[0])?'an':'a'} ${n}?`;}
const MIX={yes:[1,0],probably:[0.75,0.25],unknown:null,probably_not:[0.25,0.75],no:[0,1]};
function answer(game,q,a){if(game.status!=='playing')throw new Error('game finished');if(q.kind!=='question')throw new Error('answer requires a question');const mix=MIX[a];game.asked.add(q.index);game.answers.set(q.id,a);game.turn++;game.surprise=false;if(mix){const before=top(game).p;let sum=0;for(let i=0;i<N;i++){const y=py(truth[i*F+q.index],game.noise);const l=mix[0]*y+mix[1]*(1-y);game.belief[i]*=l;sum+=game.belief[i];}if(sum>1e-15)for(let i=0;i<N;i++)game.belief[i]/=sum;const after=top(game).p;game.surprise=after<before*0.55;}game.history.push({kind:'question',id:q.id,question:q.text,answer:a});return choose(game);}
function confirm(game,q,correct){if(q.kind!=='guess')throw new Error('not a guess');if(game.status!=='playing')throw new Error('game finished');if(game.guessUsed)throw new Error('guess already used');game.guessUsed=true;game.history.push({kind:'guess',question:q.text,guess:q.label,answer:correct?'yes':'no'});game.status=correct?'won':'lost';return{correct:Boolean(correct),guess:q.label,turns:game.turn,done:true,continueCost:game.continueCost,score:scoreFor(game.turn,Boolean(correct),false,game.continueCost),reason:q.reason||null};}
function oracle(secret,q){if(q.kind==='guess')return q.index===secret?'yes':'no';const t=truth[secret*F+q.index];return t===1?'yes':t===0?'no':'unknown';}
function selfPlay(secret,opts={}){const g=createGame(opts);let q=choose(g);while(g.status==='playing'){if(q.kind==='hunch'){q=commitGuess(g,q);continue;}if(q.kind==='guess'){const ok=q.index===secret;const r=confirm(g,q,ok);return{won:ok,turns:g.turn,guess:q.label,score:r.score,stumped:false};}if(q.kind==='stumped')break;q=answer(g,q,oracle(secret,q));}return{won:false,turns:g.turn,guess:null,score:scoreFor(g.turn,false,true,g.continueCost),stumped:true};}
global.MomBayes={FEATURES,OBJECTS,N,F,truth,meta:{baseObjects:(base.OBJECTS||[]).length,generalObjects:(general.OBJECTS||[]).length,generatedObjects:(extra.OBJECTS||[]).length,controlledObjects:(controlled.OBJECTS||[]).length,...(extra.meta||{}),...(controlled.meta||{})},createGame,choose,answer,confirm,top,selfPlay,oracle,entropy,questionGain:evalQ,questionAllowed,viableCandidates,guessReason,scoreFor,commitGuess,deferGuess};
if(typeof module!=='undefined')module.exports=global.MomBayes;
})(typeof window!=='undefined'?window:globalThis);
