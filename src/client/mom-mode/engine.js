(function(global){
'use strict';
const DATA=global.MOM_KNOWLEDGE; if(!DATA) throw new Error('Mom knowledge not loaded');
const {FEATURES,OBJECTS}=DATA, N=OBJECTS.length, F=FEATURES.length;
const idx=Object.fromEntries(FEATURES.map((f,i)=>[f.id,i]));
const truth=new Float64Array(N*F);
OBJECTS.forEach((o,i)=>{for(const id of o.yes||[]) if(idx[id]!=null) truth[i*F+idx[id]]=1; for(const id of o.maybe||[]) if(idx[id]!=null) truth[i*F+idx[id]]=0.5;});
function entropy(b){let h=0;for(const p of b)if(p>1e-12)h-=p*Math.log2(p);return h;}
function py(t,noise){return t*(1-noise)+(1-t)*noise;}
function evalQ(b,f,noise){let y=0;for(let i=0;i<N;i++)y+=b[i]*py(truth[i*F+f],noise);let n=1-y,hy=0,hn=0;if(y>1e-12)for(let i=0;i<N;i++){const p=b[i]*py(truth[i*F+f],noise)/y;if(p>1e-12)hy-=p*Math.log2(p);}if(n>1e-12)for(let i=0;i<N;i++){const p=b[i]*(1-py(truth[i*F+f],noise))/n;if(p>1e-12)hn-=p*Math.log2(p);}return entropy(b)-(y*hy+n*hn);}
function createGame(opts={}){return{belief:new Float64Array(N).fill(1/N),asked:new Set(),turn:0,budget:opts.budget||20,noise:opts.noise??0.06,guessThreshold:opts.guessThreshold??0.90,pending:null,status:'playing',history:[],surprise:false};}
function top(game){let j=0;for(let i=1;i<N;i++)if(game.belief[i]>game.belief[j])j=i;return{index:j,p:game.belief[j],object:OBJECTS[j]};}
function choose(game){const leader=top(game);if(leader.p>=game.guessThreshold||game.turn>=game.budget-1)return{kind:'guess',index:leader.index,label:leader.object.name,text:guessText(leader.object),confidence:leader.p};let best=null,bg=-1;for(let f=0;f<F;f++){if(game.asked.has(f))continue;const g=evalQ(game.belief,f,game.noise);if(g>bg){bg=g;best=f;}}if(best==null)return{kind:'guess',index:leader.index,label:leader.object.name,text:guessText(leader.object),confidence:leader.p};return{kind:'question',index:best,id:FEATURES[best].id,text:FEATURES[best].q,gain:bg,confidence:leader.p};}
function guessText(o){const n=o.name.toLowerCase();if(o.article==='')return`Is it ${n}?`;if(o.article)return`Is it ${o.article} ${n}?`;return`Is it ${'aeiou'.includes(n[0])?'an':'a'} ${n}?`;}
const MIX={yes:[1,0],probably:[0.75,0.25],unknown:null,probably_not:[0.25,0.75],no:[0,1]};
function answer(game,q,a){if(game.status!=='playing')throw new Error('game finished'); if(q.kind==='guess')throw new Error('confirm guesses separately');const mix=MIX[a];game.asked.add(q.index);game.turn++;game.surprise=false;if(mix){const before=top(game).p;let sum=0;for(let i=0;i<N;i++){const y=py(truth[i*F+q.index],game.noise);const l=mix[0]*y+mix[1]*(1-y);game.belief[i]*=l;sum+=game.belief[i];}if(sum>1e-15)for(let i=0;i<N;i++)game.belief[i]/=sum;const after=top(game).p;game.surprise=after<before*0.55;}game.history.push({question:q.text,answer:a});if(game.turn>=game.budget)game.status='ready';return choose(game);}
function confirm(game,q,correct){if(q.kind!=='guess')throw new Error('not a guess');game.turn++;game.status=correct?'won':'lost';game.history.push({question:q.text,answer:correct?'yes':'no'});return{correct,guess:q.label,turns:game.turn};}
function oracle(secret,q){if(q.kind==='guess')return q.index===secret?'yes':'no';const t=truth[secret*F+q.index];return t===1?'yes':t===0?'no':'unknown';}
function selfPlay(secret,opts={}){const g=createGame(opts);let q=choose(g);while(g.status==='playing'&&g.turn<g.budget){if(q.kind==='guess'){const ok=q.index===secret;confirm(g,q,ok);if(ok)return{won:true,turns:g.turn,guess:q.label};return{won:false,turns:g.turn,guess:q.label};}q=answer(g,q,oracle(secret,q));}return{won:false,turns:g.turn,guess:top(g).object.name};}
global.MomBayes={FEATURES,OBJECTS,N,F,truth,createGame,choose,answer,confirm,top,selfPlay,oracle,entropy};
if(typeof module!=='undefined')module.exports=global.MomBayes;
})(typeof window!=='undefined'?window:globalThis);
