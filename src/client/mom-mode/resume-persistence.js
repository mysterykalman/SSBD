(function(){
'use strict';
const KEY='ssbd.resume.mom.v1';
let replaying=false;

function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}}
function save(value){try{localStorage.setItem(KEY,JSON.stringify(value));}catch{}}
function clear(){try{localStorage.removeItem(KEY);}catch{}}
function now(){return new Date().toISOString();}
function active(){return load();}
function update(mutator){const value=active();if(!value)return;mutator(value);value.updatedAt=now();save(value);}

function begin(){
  const word=String(document.getElementById('secret-word')?.value||'').replace(/\s+/g,' ').trim();
  if(!word)return;
  save({v:1,mode:'mom',secretWord:word,startedAt:now(),updatedAt:now(),actions:[],finished:false});
}

function push(action){
  if(replaying)return;
  update(value=>{value.actions=Array.isArray(value.actions)?value.actions:[];value.actions.push({...action,at:now()});});
}

function stageSummary(){
  const value=active();if(!value)return;
  const stage=document.querySelector('.game-card')?.dataset.stage||'intro';
  value.stage=stage;
  value.questionCounter=document.getElementById('question-counter')?.textContent?.trim()||'';
  value.updatedAt=now();
  save(value);
}

document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target.closest('button,a'):null;
  if(!target)return;
  if(target.id==='start-btn'&&!replaying){begin();setTimeout(stageSummary,0);return;}
  if(target.matches('[data-answer]')){push({type:'answer',value:target.dataset.answer});setTimeout(stageSummary,0);return;}
  if(target.id==='keep-asking-btn'){push({type:'keep'});setTimeout(stageSummary,0);return;}
  if(target.id==='guess-now-btn'){push({type:'guess'});setTimeout(stageSummary,0);return;}
  if(target.id==='correct-btn'||target.id==='wrong-btn'){
    if(!replaying)setTimeout(clear,0);
    return;
  }
  if(target.id==='again-btn'&&!replaying){clear();return;}
},true);

function click(selector){const node=document.querySelector(selector);node?.click();return Boolean(node);}
async function pause(ms=22){return new Promise(resolve=>setTimeout(resolve,ms));}

async function restore(){
  const params=new URLSearchParams(location.search);
  if(params.get('resume')!=='1')return;
  const saved=active();
  if(!saved?.secretWord||saved.finished)return;
  replaying=true;
  try{
    await pause(40);
    const intro=document.getElementById('pam-intro-dialog');
    if(intro?.open)intro.close();else intro?.removeAttribute('open');
    const input=document.getElementById('secret-word');
    if(!input)return;
    input.value=saved.secretWord;
    click('#start-btn');
    await pause(25);
    for(const action of saved.actions||[]){
      if(action.type==='answer')click(`[data-answer="${CSS.escape(action.value)}"]`);
      else if(action.type==='keep')click('#keep-asking-btn');
      else if(action.type==='guess')click('#guess-now-btn');
      await pause(25);
    }
    stageSummary();
    history.replaceState({},'',location.pathname);
  }finally{replaying=false;}
}

const observer=new MutationObserver(()=>{if(!replaying&&active())stageSummary();});
const card=document.querySelector('.game-card');
if(card)observer.observe(card,{attributes:true,attributeFilter:['data-stage','data-outcome']});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});
else restore();
})();
