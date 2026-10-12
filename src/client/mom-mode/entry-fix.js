(function(){
"use strict";
function injectStyles(){
 if(document.getElementById('lowPolyPrototypeTheme'))return;
 const style=document.createElement('style');style.id='lowPolyPrototypeTheme';
 style.textContent=`
 :root{--cream:#f5ead8;--paper:#fffaf1;--ink:#493a33;--muted:#76645b;--coral:#e9785b;--coral-dark:#b85743;--sun:#eeb655;--sun-soft:#f8e8bd;--teal:#3b9e98;--teal-dark:#26746f;--grape:#65798a;--pink:#e89578;--mint:#dce8d1;--peach:#f2d5b8;--you:#f5d7cc;--other:#d8e9e5;--line:#d6c2aa;--radius:18px;--radius-sm:12px;--shadow:0 5px 0 rgba(92,67,51,.22),0 14px 32px rgba(91,67,50,.11);--stripes:linear-gradient(90deg,#3b9e98 0 34%,#eeb655 34% 67%,#e9785b 67% 100%)}
 body{background-color:var(--cream);background-image:linear-gradient(145deg,rgba(255,255,255,.5),transparent 36%),linear-gradient(25deg,rgba(59,158,152,.07) 0 18%,transparent 18% 70%,rgba(233,120,91,.08) 70%),radial-gradient(circle at 82% 12%,rgba(238,182,85,.16),transparent 27%)}
 body::before{height:6px;border:0;background:var(--stripes)}
 .topbar{padding-top:max(16px,env(safe-area-inset-top));padding-bottom:12px}.brand{color:var(--coral-dark)}.brand-top{color:var(--coral-dark);text-shadow:2px 2px 0 #f5cc78}.brand-bottom{color:var(--teal-dark);letter-spacing:.11em}.avatar,.bell,.offline-pill,.lang-switch{border-color:#6c5648;box-shadow:0 3px 0 rgba(87,63,47,.35)}
 .hero{padding-top:30px}.hero h1{color:#3f342f;text-shadow:2px 3px 0 rgba(238,182,85,.48);letter-spacing:-.035em}.lede{color:#6d5d55}.kicker{color:var(--teal-dark)}
 .card{border:1.5px solid #a98d74;box-shadow:var(--shadow);background:rgba(255,250,241,.94);overflow:hidden}.card::before{content:"";position:absolute;inset:0 auto auto 0;width:72px;height:10px;background:linear-gradient(90deg,var(--teal),var(--sun));clip-path:polygon(0 0,100% 0,84% 100%,0 100%);opacity:.92}.solo-card::after,.family-card::after{display:none}.solo-card{background:linear-gradient(155deg,#edf5ef 0,#fffaf1 44%,#f8ecdd 100%)}.family-card{background:linear-gradient(155deg,#fff3d6 0,#fffaf1 48%,#f4dfca 100%)}
 .btn{border:2px solid #6f5749;border-radius:11px;box-shadow:0 4px 0 rgba(87,63,47,.32);background:var(--coral);color:#3f332e;transition:transform .1s ease,box-shadow .1s ease,filter .12s ease}.btn:hover{box-shadow:0 5px 0 rgba(87,63,47,.32)}.btn:active{box-shadow:0 1px 0 rgba(87,63,47,.28)}.btn.teal,.btn.success{background:var(--teal)}.btn.ghost{background:#fffaf1}.link{color:var(--teal-dark)}
 .start-icon{border:2px solid #806653;box-shadow:0 3px 0 rgba(87,63,47,.25);background:var(--sun-soft)}
 .start-icon.pair{width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:0;border:0;background:none;box-shadow:none;transform:none}.start-icon.pair .badge{width:100%;height:auto;aspect-ratio:4/5;border-radius:16px;border:2px solid #9d806a;background:#e6efe9;box-shadow:0 4px 0 rgba(87,63,47,.2);overflow:hidden}.start-icon.pair .badge .badge-art{width:100%;height:100%}.start-icon.pair .gary-art{border-radius:14px;object-fit:cover}.start-icon.pair .gary-art-wrap[data-character="milo"] .gary-art{object-position:center 25%}.start-icon.pair .gary-art-wrap[data-character="gary"] .gary-art{object-position:center 22%}
 .mom-card{grid-template-columns:145px minmax(0,1fr) auto!important;gap:20px!important;padding:18px!important;background:linear-gradient(145deg,#f8ddd3 0,#fffaf1 42%,#f5e3c8 100%)!important}.mom-card::before{background:linear-gradient(90deg,var(--coral),var(--sun))}.mom-card-art{width:145px!important;height:145px!important;border:2px solid #9c725e!important;border-radius:17px!important;box-shadow:0 4px 0 rgba(87,63,47,.2);object-fit:cover!important}.mom-card-copy h2{font-size:1.65rem}.mom-preview{color:var(--coral-dark)!important}
 .board{background:linear-gradient(180deg,rgba(255,250,241,.98),rgba(250,239,220,.97));border-color:#9f836e}.board::before{height:6px;border:0;background:var(--stripes)}.mode-chip{border:1.5px solid #9b8069;background:#f6dec7;box-shadow:0 2px 0 rgba(87,63,47,.2)}
 .stones{border:1.5px solid #a98d74;background:linear-gradient(135deg,#ecdfca 0 25%,#f7ecd9 25% 50%,#eadbc5 50% 75%,#f8ead6 75%);background-size:28px 28px}.stone{border:1.5px solid #7b6252;box-shadow:0 2px 0 rgba(87,63,47,.16)}.stone.now,.stone.final{box-shadow:0 3px 0 rgba(87,63,47,.28)}
 .tile{border:2px solid #775e4f;border-radius:11px;box-shadow:0 4px 0 rgba(87,63,47,.25);transform:none;background:var(--sun)}.prompt .join .tile{transform:none;background:#e89b7c}.prompt .op,.rv-words .op{border:2px solid #775e4f;background:#fffaf1;color:var(--teal-dark)}
 .word-input,.text-input{border:2px solid #8e7360;border-radius:12px;box-shadow:inset 0 2px 0 rgba(75,56,43,.06);background:#fffdf8}.word-input:focus,.text-input:focus{border-color:var(--teal-dark);box-shadow:0 0 0 4px rgba(59,158,152,.2)}
 .chip,.rv-word{border:1.5px solid #8c725f;border-radius:10px;box-shadow:0 3px 0 rgba(87,63,47,.14)}.trail-row,.trail-now{border-color:#c7ad94}.trail-now{background:#f6e8c9;box-shadow:0 3px 0 rgba(87,63,47,.18)}.now-label{background:var(--teal-dark);border:1.5px solid #624d42}.move-badge{border-color:#806552}
 .gary-art{object-fit:cover}.badge.gary .gary-art{border-radius:50%}.gary-reaction .gary-art,.rv-word.gary .gary-art{border-radius:50%;object-position:center 24%}.pick-card .pick-art,.gi-body .intro-art,.gary-end .end-art{width:100%;height:auto;aspect-ratio:4/5;border:2px solid #957865!important;border-radius:16px!important;overflow:hidden;background:#ece4d8;box-shadow:0 4px 0 rgba(87,63,47,.18)!important}.pick-card .gary-art,.gi-body .gary-art,.gary-end .gary-art{border-radius:14px;object-fit:cover}.pick-card .gary-art-wrap[data-character="milo"] .gary-art,.gi-body .gary-art-wrap[data-character="milo"] .gary-art{object-position:center 24%}.pick-card .gary-art-wrap[data-character="gary"] .gary-art,.gi-body .gary-art-wrap[data-character="gary"] .gary-art{object-position:center 22%}
 .character-picker,.gary-intro{border:1.5px solid #8f725f;background:#f5ead8;box-shadow:0 12px 36px rgba(61,43,33,.28)}.character-picker::backdrop,.gary-intro::backdrop,.dialog::backdrop{background:rgba(66,49,40,.58)}.pick-card{border:1.5px solid #a48972;background:#fffaf1;box-shadow:0 4px 0 rgba(87,63,47,.16);border-radius:17px}.pick-card:has(.pick-radio:checked){background:#f6e4b8;box-shadow:0 5px 0 rgba(87,63,47,.24)}.gary-bubble{border:1.5px solid #917663;background:#fffaf1}.gary-bubble::before{border-right-color:#917663}.gary-bubble::after{border-right-color:#fffaf1}
 .rv-kicker{border:1.5px solid #675145;background:var(--teal-dark);box-shadow:0 3px 0 rgba(87,63,47,.24)}.rv-count{color:var(--coral-dark);text-shadow:3px 3px 0 rgba(238,182,85,.5)}
 @media(max-width:700px){.mom-card{grid-template-columns:98px minmax(0,1fr)!important}.mom-card-art{width:98px!important;height:112px!important}.mom-card>a{grid-column:1/-1}.start-icon.pair .badge{aspect-ratio:3/4}}
 @media(max-width:480px){.start-grid{grid-template-columns:1fr}.start-icon.pair{max-width:330px}.pick-card .pick-art{aspect-ratio:3/4}}
 `;
 document.head.append(style);
}
function update(){
 injectStyles();
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