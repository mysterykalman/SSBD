(function(){
"use strict";
const ART={pam:"/character-art/pam.webp?v=voxel-v3",gary:"/character-art/gary.webp?v=voxel-v3",milo:"/character-art/milo.webp?v=voxel-v3"};
function ensureWorld(){
  document.body.classList.add("voxel-v3");
  if(document.querySelector(".voxel-world"))return;
  const world=document.createElement("div");
  world.className="voxel-world";
  world.setAttribute("aria-hidden","true");
  world.innerHTML='<i class="cube c1"></i><i class="cube c2"></i><i class="cube c3"></i><i class="cube c4"></i><i class="plant p1"></i><i class="plant p2"></i><i class="shelf s1"></i>';
  document.body.prepend(world);
}
function decorateCard(card,label){
  if(!card||card.dataset.voxelDecorated)return;
  card.dataset.voxelDecorated="true";
  const tab=document.createElement("span");
  tab.className="voxel-card-tab";
  tab.textContent=label;
  tab.setAttribute("aria-hidden","true");
  card.prepend(tab);
}
function decorateHome(){
  const hero=document.querySelector(".hero");
  if(!hero)return;
  document.body.classList.add("is-home");
  hero.classList.add("voxel-hero");
  const grid=document.querySelector(".start-grid");
  if(grid)grid.classList.add("voxel-mode-grid");
  const solo=document.querySelector(".solo-card");
  const family=document.querySelector(".family-card");
  const mom=document.querySelector(".mom-card");
  decorateCard(solo,"SOLO");decorateCard(family,"TOGETHER");decorateCard(mom,"MOM MODE");
  if(solo){
    const g=solo.querySelector('[data-character="gary"] img,.pair-gary img'); if(g)g.src=ART.gary;
    const m=solo.querySelector('[data-character="milo"] img,.pair-milo img'); if(m)m.src=ART.milo;
  }
  if(mom){
    const img=mom.querySelector(".mom-card-art");if(img)img.src=ART.pam;
    if(!mom.querySelector(".mom-hearts")){const hearts=document.createElement("span");hearts.className="mom-hearts";hearts.setAttribute("aria-hidden","true");hearts.textContent="♥  ♥";mom.append(hearts);}
  }
}
function decoratePicker(){
  const picker=document.querySelector(".character-picker");if(!picker)return;
  picker.classList.add("voxel-picker");
  const g=picker.querySelector('[data-character="gary"] img');if(g)g.src=ART.gary;
  const m=picker.querySelector('[data-character="milo"] img');if(m)m.src=ART.milo;
}
function update(){ensureWorld();decorateHome();decoratePicker();
  const card=document.querySelector('.mom-card');if(card){
    card.querySelector('.mom-preview')?.remove();
    const link=card.querySelector('a.btn');if(link&&link.getAttribute('href')!=='/mom/')link.setAttribute('href','/mom/');
    if(link&&link.textContent!=='Play Mom Mode →')link.textContent='Play Mom Mode →';
    const img=card.querySelector('.mom-card-art');if(img&&img.getAttribute('src')!==ART.pam)img.setAttribute('src',ART.pam);
  }
}
update();
const app=document.getElementById('app');if(app)new MutationObserver(update).observe(app,{childList:true,subtree:true});
})();