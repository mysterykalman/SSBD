(function(){
'use strict';
const params=new URLSearchParams(window.location.search);
if(!(params.get('debug')==='1'||params.has('debug')))return;
const adapter=window.MomModeAdapter;
if(!adapter?.runtime||typeof adapter.lookup!=='function'||typeof adapter.debugSnapshot!=='function')return;

const input=document.getElementById('secret-word');
const error=document.getElementById('secret-error');
const gameCard=document.querySelector('.game-card');
if(!input||!gameCard)return;

const status=document.createElement('p');
status.id='mom-debug-knowledge-status';
status.style.cssText='font:600 12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;margin:8px 0 0;opacity:.78;';
error?.insertAdjacentElement('afterend',status);

const panel=document.createElement('details');
panel.id='mom-debug-panel';
panel.open=true;
panel.style.cssText='margin-top:12px;padding:10px 12px;border:1px dashed currentColor;border-radius:10px;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.82;';
panel.innerHTML='<summary style="cursor:pointer;font-weight:700">Pam debug</summary><pre id="mom-debug-output" style="white-space:pre-wrap;overflow:auto;margin:8px 0 0"></pre>';
gameCard.insertAdjacentElement('afterend',panel);
const output=document.getElementById('mom-debug-output');

function renderLookup(){
 const value=String(input.value||'').trim();
 if(!value){status.textContent='';return;}
 const result=adapter.lookup(value);
 if(result.status==='known')status.textContent=`Knowledge: known → ${result.name}`;
 else if(result.status==='ambiguous')status.textContent=`Knowledge: ambiguous → ${result.candidates.join(' / ')}`;
 else status.textContent='Knowledge: not in compact runtime';
}
function percent(value){return `${(Number(value||0)*100).toFixed(1)}%`;}
function renderDebug(){
 const snapshot=adapter.debugSnapshot(8);
 const lines=[
  `runtime: ${snapshot.runtime.concepts.toLocaleString()} concepts · ${snapshot.runtime.questions.toLocaleString()} static questions`,
  `source: ${snapshot.runtime.sourceHash||'n/a'}`,
  `turn: ${snapshot.turn??0}`
 ];
 if(snapshot.pending&&typeof snapshot.pending==='object'){
  lines.push('',`pending: ${snapshot.pending.text}`,
   `source=${snapshot.pending.source} gain=${Number(snapshot.pending.gain||0).toFixed(4)} score=${Number(snapshot.pending.naturalScore||0).toFixed(4)}`,
   `semantic=${percent(snapshot.pending.semanticCoverage)} known=${percent(snapshot.pending.knownCoverage)}`);
 }
 if(snapshot.topCandidates?.length){
  lines.push('','top candidates:');
  snapshot.topCandidates.forEach((candidate,index)=>lines.push(`${index+1}. ${candidate.name} · ${percent(candidate.p)} · ${candidate.category}`));
 }
 output.textContent=lines.join('\n');
}
input.addEventListener('input',renderLookup);
input.addEventListener('change',renderLookup);
renderLookup();renderDebug();
const timer=window.setInterval(renderDebug,400);
window.addEventListener('pagehide',()=>window.clearInterval(timer),{once:true});
})();
