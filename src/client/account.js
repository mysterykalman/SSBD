// Lightweight account UI layered on top of the existing game shell.
// One player identity can be used on multiple devices. PINs are exactly four digits.
const PLAYER_KEY = "ssbd_player";
const parsePlayer = () => { try { return JSON.parse(localStorage.getItem(PLAYER_KEY) || "null"); } catch { return null; } };
const savePlayer = player => { localStorage.setItem(PLAYER_KEY, JSON.stringify(player)); window.dispatchEvent(new StorageEvent("storage", {key: PLAYER_KEY})); };

const style = document.createElement("style");
style.textContent = `
.account-card{display:grid;gap:14px}.account-grid{display:grid;gap:12px}.account-grid label{font-weight:900}.account-grid input{width:100%;font:inherit;padding:11px 12px;border:3px solid var(--ink,#2b1b3d);border-radius:12px;background:#fff}.account-actions{display:flex;gap:10px;flex-wrap:wrap}.account-note{margin:0;color:var(--muted,#6b4e63);font-size:.9rem}.account-error{margin:0;color:#a52222;font-weight:800}.account-user{font-weight:900}.account-divider{height:1px;background:rgba(43,27,61,.18);margin:2px 0}.account-signin-link{background:none;border:0;padding:0;text-decoration:underline;font:inherit;font-weight:800;cursor:pointer}.account-pin{letter-spacing:.2em;font-variant-numeric:tabular-nums}`;
document.head.append(style);

function dialogEl() { return document.getElementById("dialog"); }
function closeDialog() { const d = dialogEl(); if (d?.open) d.close(); }
function showDialog(title, body) {
  const d = dialogEl();
  if (!d) return;
  d.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "account-card";
  const h = document.createElement("h2"); h.textContent = title;
  const close = document.createElement("button"); close.type = "button"; close.className = "dialog-x"; close.setAttribute("aria-label", "Close"); close.textContent = "×"; close.addEventListener("click", closeDialog);
  wrap.append(close, h, body);
  d.append(wrap);
  if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
}
function field(labelText, {type="text", maxlength, value="", placeholder="", inputmode, autocomplete} = {}) {
  const label = document.createElement("label"); label.textContent = labelText;
  const input = document.createElement("input"); input.type = type; input.value = value; input.placeholder = placeholder;
  if (maxlength) input.maxLength = maxlength;
  if (inputmode) input.inputMode = inputmode;
  if (autocomplete) input.autocomplete = autocomplete;
  label.append(input); return {label, input};
}
function button(text, className="btn big") { const b=document.createElement("button"); b.type="button"; b.className=className; b.textContent=text; return b; }
function errorLine() { const p=document.createElement("p"); p.className="account-error"; p.hidden=true; return p; }
async function post(path, body) {
  const response = await fetch(path, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body)});
  let data={}; try { data=await response.json(); } catch {}
  if (!response.ok) { const e=new Error(data.error || "Something went wrong."); e.code=data.code; throw e; }
  return data;
}
function cleanUsername(value){return String(value||"").trim().toLowerCase();}
function validPin(value){return /^\d{4}$/.test(String(value||""));}

function createAccountDialog({after}={}) {
  const current = parsePlayer();
  const grid=document.createElement("div"); grid.className="account-grid";
  const name=field("Your name", {value: current?.display_name || "", maxlength:24, autocomplete:"nickname", placeholder:"Ethan"});
  const user=field("Player name", {value: current?.username || "", maxlength:20, autocomplete:"username", placeholder:"ethank"});
  const pin=field("4-digit PIN", {type:"password", maxlength:4, inputmode:"numeric", autocomplete:"new-password", placeholder:"••••"}); pin.input.classList.add("account-pin");
  pin.input.addEventListener("input",()=>{pin.input.value=pin.input.value.replace(/\D/g,"").slice(0,4);});
  const note=document.createElement("p"); note.className="account-note"; note.textContent="Use the same player name and PIN on your phone, tablet, or computer to keep the same progress.";
  const err=errorLine(), save=button(current?.id ? "Finish setup" : "Create player");
  save.addEventListener("click", async()=>{
    err.hidden=true; save.disabled=true;
    try {
      const data=await post("/api/account/register", {display_name:name.input.value, username:cleanUsername(user.input.value), pin:pin.input.value, player_id:current?.id || null, recovery_code:current?.recovery_code || null});
      savePlayer(data.player); closeDialog();
      if (after) after(); else location.reload();
    } catch(e) { err.textContent=e.message; err.hidden=false; save.disabled=false; }
  });
  const signin=document.createElement("button"); signin.type="button"; signin.className="account-signin-link"; signin.textContent="Already have a player? Sign in"; signin.addEventListener("click",()=>signInDialog({after}));
  grid.append(name.label,user.label,pin.label,note,err,save,signin);
  showDialog("Set up your player",grid);
}

function signInDialog({after}={}) {
  const grid=document.createElement("div"); grid.className="account-grid";
  const user=field("Player name", {maxlength:20, autocomplete:"username", placeholder:"ethank"});
  const pin=field("4-digit PIN", {type:"password", maxlength:4, inputmode:"numeric", autocomplete:"current-password", placeholder:"••••"}); pin.input.classList.add("account-pin");
  pin.input.addEventListener("input",()=>{pin.input.value=pin.input.value.replace(/\D/g,"").slice(0,4);});
  const note=document.createElement("p"); note.className="account-note"; note.textContent="Sign in to bring back your Together games, Solo history, and Mom Mode progress.";
  const err=errorLine(), sign=button("Sign in");
  sign.addEventListener("click",async()=>{
    err.hidden=true; sign.disabled=true;
    try {
      if(!validPin(pin.input.value)) throw new Error("PIN must be exactly 4 digits.");
      const data=await post("/api/account/login", {username:cleanUsername(user.input.value), pin:pin.input.value});
      savePlayer(data.player); closeDialog();
      if(after) after(); else location.reload();
    } catch(e){err.textContent=e.message; err.hidden=false; sign.disabled=false;}
  });
  const create=document.createElement("button"); create.type="button"; create.className="account-signin-link"; create.textContent="New here? Create a player"; create.addEventListener("click",()=>createAccountDialog({after}));
  grid.append(user.label,pin.label,note,err,sign,create);
  showDialog("Sign in",grid);
}

function signedInDialog(player) {
  const grid=document.createElement("div"); grid.className="account-grid";
  const who=document.createElement("p"); who.className="account-user"; who.textContent=`${player.display_name} · @${player.username}`;
  const note=document.createElement("p"); note.className="account-note"; note.textContent="Your progress syncs across devices when you’re online. Solo and Mom Mode still work offline.";
  const name=field("Your name", {value:player.display_name || "", maxlength:24, autocomplete:"nickname"});
  const save=button("Save name"); const err=errorLine();
  save.addEventListener("click",async()=>{
    err.hidden=true; save.disabled=true;
    try {
      const data=await post("/api/player/name", {player_id:player.id, display_name:name.input.value});
      savePlayer({...player,...data}); location.reload();
    } catch(e){err.textContent=e.message; err.hidden=false; save.disabled=false;}
  });
  const divider=document.createElement("div"); divider.className="account-divider";
  const pinBtn=button("Change PIN","btn ghost"); pinBtn.addEventListener("click",()=>changePinDialog(player));
  const out=button("Sign out","btn ghost"); out.addEventListener("click",()=>{localStorage.removeItem(PLAYER_KEY); location.reload();});
  const actions=document.createElement("div"); actions.className="account-actions"; actions.append(pinBtn,out);
  grid.append(who,note,name.label,err,save,divider,actions);
  showDialog("Your player",grid);
}

function changePinDialog(player) {
  const grid=document.createElement("div"); grid.className="account-grid";
  const current=field("Current PIN", {type:"password",maxlength:4,inputmode:"numeric",autocomplete:"current-password"});
  const next=field("New 4-digit PIN", {type:"password",maxlength:4,inputmode:"numeric",autocomplete:"new-password"});
  for(const input of [current.input,next.input]) input.addEventListener("input",()=>{input.value=input.value.replace(/\D/g,"").slice(0,4);});
  const err=errorLine(), save=button("Change PIN");
  save.addEventListener("click",async()=>{err.hidden=true;save.disabled=true;try{await post("/api/account/pin",{player_id:player.id,current_pin:current.input.value,new_pin:next.input.value});closeDialog();}catch(e){err.textContent=e.message;err.hidden=false;save.disabled=false;}});
  grid.append(current.label,next.label,err,save);
  showDialog("Change PIN",grid);
}

function openAccount() {
  const player=parsePlayer();
  if(player?.username) signedInDialog(player); else createAccountDialog();
}

// Settings now owns the global player identity. Capture prevents the old recovery-code profile from opening.
document.addEventListener("click", event=>{
  const target=event.target instanceof Element ? event.target.closest("#profileBtn") : null;
  if(!target) return;
  event.preventDefault(); event.stopImmediatePropagation(); openAccount();
}, true);

// Starting or joining Together requires a real player account. Once set up, the existing game flow runs unchanged.
document.addEventListener("click", event=>{
  const target=event.target instanceof Element ? event.target.closest("#createFamily,#joinFamily") : null;
  if(!target || parsePlayer()?.username) return;
  event.preventDefault(); event.stopImmediatePropagation();
  createAccountDialog({after:()=>location.reload()});
}, true);

// Recovery codes are replaced by player-name + PIN sign-in. Hide legacy recovery links that older dialogs may render.
const observer=new MutationObserver(()=>{
  for(const el of document.querySelectorAll("button.link")) if(/recovery code/i.test(el.textContent||"")) el.hidden=true;
});
observer.observe(document.documentElement,{subtree:true,childList:true});
