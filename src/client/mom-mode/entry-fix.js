(function(){
"use strict";
function update(){const card=document.querySelector('.mom-card');if(!card)return false;card.querySelector('.mom-preview')?.remove();const link=card.querySelector('a.btn');if(link){link.href='/mom/';link.textContent='Play Mom Mode →';}const img=card.querySelector('.mom-card-art');if(img)img.src='/mom/pam.webp';return true;}
if(!update()){const observer=new MutationObserver(()=>{if(update())observer.disconnect();});observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),10000);}
})();
