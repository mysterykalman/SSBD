const STYLE_ID = "oddOneInHomePolish";

const css = `
/* Final homepage treatment for Odd One In. Keep this after the generic homepage refinement. */
[data-mode="connections"] .mode-actions .btn{
  --skin-img:url("/felt/btn-positive.webp")!important;
  --skin-slice:51 98 57 92 fill!important;
  --skin-wt:.3984!important;
  --skin-wr:.7656!important;
  --skin-wb:.4453!important;
  --skin-wl:.7188!important;
  --skin-bt:.0156!important;
  --skin-bb:.0469!important;
  --skin-bl:.0156!important;
  --skin-br:.0234!important;
  --skin-center:#7a9e73!important;
  --skin-repeat:round stretch!important;
}

.home-grid.start-grid [data-mode="connections"] .conn-launch-stage{
  align-items:center!important;
  justify-content:space-evenly!important;
  padding-top:8px!important;
  padding-bottom:8px!important;
}
.home-grid.start-grid [data-mode="connections"] .conn-launch-standee.standee{
  width:94px!important;
  height:116px!important;
  margin:0!important;
}
.home-grid.start-grid [data-mode="connections"] .conn-launch-standee::after{
  width:94px!important;
  min-width:94px!important;
  max-width:94px!important;
  bottom:-14px!important;
  font-size:.50rem!important;
  letter-spacing:.035em!important;
  white-space:nowrap!important;
}
.home-grid.start-grid [data-mode="connections"] .conn-launch-standee:nth-child(1){transform:translateY(3px) rotate(-2deg)}
.home-grid.start-grid [data-mode="connections"] .conn-launch-standee:nth-child(2){transform:translateY(-3px) rotate(1.5deg)}
.home-grid.start-grid [data-mode="connections"] .conn-launch-standee:nth-child(3){transform:translateY(2px) rotate(-1deg)}
.home-grid.start-grid [data-mode="connections"] .conn-launch-standee:nth-child(4){transform:translateY(-2px) rotate(1.8deg)}
.home-grid.start-grid [data-mode="connections"] .conn-launch-standee:nth-child(4)::after{font-size:.43rem!important;letter-spacing:.015em!important}

@media(max-width:680px){
  .home-grid.start-grid [data-mode="connections"] .conn-launch-standee.standee{width:76px!important;height:94px!important}
  .home-grid.start-grid [data-mode="connections"] .conn-launch-standee::after{width:78px!important;min-width:78px!important;max-width:78px!important;font-size:.43rem!important}
  .home-grid.start-grid [data-mode="connections"] .conn-launch-standee:nth-child(4)::after{font-size:.36rem!important}
}
`;

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement("style");
  style.id=STYLE_ID;
  style.textContent=css;
  document.head.append(style);
}

function polish(){
  installStyles();
  const card=document.querySelector('.home-grid.start-grid [data-mode="connections"]');
  if(!card)return;
  const standees=[...card.querySelectorAll('.conn-launch-standee')];
  const labels=["OWEN","ZOE","MARTIN","PROFESSOR BRAINE"];
  standees.forEach((standee,index)=>{
    if(labels[index]&&standee.dataset.name!==labels[index])standee.dataset.name=labels[index];
  });
  card.querySelector('.mode-actions .btn')?.classList.add('sage');
}

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;polish();});
}

new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});
else schedule();
