(function(){
"use strict";
function update(){
 const card=document.querySelector(".mom-card");if(!card)return;
 card.querySelector(".mom-preview")?.remove();
 const fr=(document.documentElement.lang||"").toLowerCase().startsWith("fr");
 const title=card.querySelector("#momModeTitle");
 const paragraphs=[...card.querySelectorAll(".mom-card-copy p")];
 const link=card.querySelector("a.btn");
 if(title)title.textContent=fr?"Déjoue maman":"Stump Mom";
 if(paragraphs[0])paragraphs[0].textContent=fr
  ?"Pam a 20 tours pour deviner à quoi tu penses. Choisis quelque chose de malin et essaie de la déjouer."
  :"Pam gets 20 turns to figure out what you’re thinking. Pick something clever and try to stump her.";
 if(paragraphs[1])paragraphs[1].textContent=fr
  ?"Chaque mauvaise réponse lui coûte un tour."
  :"Every wrong guess costs her a turn.";
 if(link){
  if(link.getAttribute("href")!=="/mom/")link.setAttribute("href","/mom/");
  link.textContent=fr?"Essayer de déjouer Pam →":"Try to stump Pam →";
 }
 const img=card.querySelector(".mom-card-art");
 if(img&&img.getAttribute("src")!=="/mom/pam.webp")img.setAttribute("src","/mom/pam.webp");
}
update();
const app=document.getElementById("app");
if(app)new MutationObserver(update).observe(app,{childList:true,subtree:true});
new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
})();
