(function(){
"use strict";
function update(){
 const card=document.querySelector('.mom-card');if(!card)return;
 card.querySelector('.mom-preview')?.remove();
 const link=card.querySelector('a.btn');
 if(link&&link.getAttribute('href')!=='/mom/')link.setAttribute('href','/mom/');
 if(link&&link.textContent!=='Play Mom Mode →')link.textContent='Play Mom Mode →';
 const img=card.querySelector('.mom-card-art');
 if(img&&img.getAttribute('src')!=='/mom/pam-v2.webp')img.setAttribute('src','/mom/pam-v2.webp');
}
update();
const app=document.getElementById('app');if(app)new MutationObserver(update).observe(app,{childList:true,subtree:true});
})();
