// Lightweight account UI layered on top of the existing game shell.
// One player identity can be used on multiple devices. PINs are exactly four digits.
const PLAYER_KEY = "ssbd_player";
const parsePlayer = () => { try { return JSON.parse(localStorage.getItem(PLAYER_KEY) || "null"); } catch { return null; } };
const savePlayer = player => { localStorage.setItem(PLAYER_KEY, JSON.stringify(player)); window.dispatchEvent(new StorageEvent("storage", {key: PLAYER_KEY})); };

const style = document.createElement("style");
style.textContent = `
.account-card{position:relative;display:grid;gap:16px;padding:22px}.account-card>h2{padding-right:42px}.account-grid{display:grid;gap:12px}.account-grid label{display:grid;gap:6px;font-weight:900}.account-grid input{width:100%;font:inherit;padding:11px 12px;border:3px solid var(--ink,#2b1b3d);border-radius:12px;background:#fff}.account-actions{display:flex;gap:10px;flex-wrap:wrap}.account-note{margin:0;color:var(--muted,#6b4e63);font-size:.9rem;line-height:1.45}.account-error{margin:0;color:#a52222;font-weight:800}.account-user{margin:0;font-weight:900}.account-divider{height:1px;background:rgba(43,27,61,.16);margin:2px 0}.account-signin-link{background:none;border:0;padding:4px 0;color:var(--grape,#7b4fc9);text-decoration:underline;text-underline-offset:3px;font:inherit;font-weight:800;cursor:pointer}.account-pin{letter-spacing:.2em;font-variant-numeric:tabular-nums}.settings-card{position:relative;display:grid;gap:0;padding:22px}.settings-card>h2{padding-right:42px;margin-bottom:4px}.settings-section{display:grid;gap:10px;padding:16px 0;border-top:1px solid rgba(43,27,61,.15)}.settings-section:first-of-type{border-top:0;padding-top:10px}.settings-section h3{margin:0;font-size:1rem}.settings-section .btn{justify-self:start}.settings-player{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap}.settings-player-name{margin:0;font-size:1.05rem;font-weight:900}.settings-handle{color:var(--muted,#6b4e63);font-size:.88rem;font-weight:800}.settings-setup-actions{display:flex;gap:10px;flex-wrap:wrap}.settings-setup-actions .btn{min-height:46px;padding:9px 16px}.settings-signed-actions{display:flex;gap:8px;flex-wrap:wrap}.settings-signed-actions .btn{min-height:44px;padding:8px 14px;font-size:.92rem}.settings-name-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end}.settings-name-row label{display:grid;gap:6px;font-weight:900}.settings-name-row input{width:100%;min-height:48px;font:inherit;padding:9px 12px;border:3px solid var(--ink,#2b1b3d);border-radius:12px;background:#fff}.settings-name-row .btn{min-height:48px;padding:9px 16px}.settings-status{margin:0;color:var(--muted,#6b4e63);font-size:.88rem;line-height:1.4}.account-dialog{overflow:auto}.settings-card .audio-settings-panel{margin:0;padding:16px 0;border-top:1px solid rgba(43,27,61,.15);display:grid;gap:10px}.settings-card .audio-settings-heading{margin:0;font-size:1rem}.settings-card .audio-settings-hint,.settings-card .audio-channel small{display:none}.settings-card .audio-master{margin:0}.settings-card .audio-channel{margin:0;display:grid;gap:6px}.settings-card .audio-channel label{font-weight:900}.settings-card .audio-range-row{margin:0}.settings-card .audio-settings-panel.muted .audio-channel{opacity:.5}@media(max-width:480px){.account-card,.settings-card{padding:18px 16px}.settings-name-row{grid-template-columns:1fr}.settings-name-row .btn,.settings-setup-actions .btn{width:100%}.settings-signed-actions{display:grid}.settings-signed-actions .btn{width:100%}}`;
document.head.append(style);

function dialogEl() { return document.getElementById("dialog"); }
function closeDialog() { const d = dialogEl(); if (d?.open) d.close(); }
function prepareDialog(kind) {
  const d = dialogEl();
  if (!d) return null;
  d.innerHTML = "";
  d.classList.add("account-dialog");
  d.dataset.dialogKind = kind;
  d.addEventListener("close", () => { delete d.dataset.dialogKind; }, {once:true});
  return d;
}
function showDialog(title, body, {kind="account"}={}) {
  const d = prepareDialog(kind);
  if (!d) return;
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
  const note=document.createElement("p"); note.className="account-note"; note.textContent="Use this player on your other devices to keep your games and progress together.";
  const err=errorLine(), save=button(current?.id ? "Finish setup" : "Create player");
  save.addEventListener("click", async()=>{
    err.hidden=true; save.disabled=true;
    try {
      if(!validPin(pin.input.value)) throw new Error("PIN must be exactly 4 digits.");
      const data=await post("/api/account/register", {display_name:name.input.value, username:cleanUsername(user.input.value), pin:pin.input.value, player_id:current?.id || null, recovery_code:current?.recovery_code || null});
      savePlayer(data.player); closeDialog();
      if (after) after(); else location.reload();
    } catch(e) { err.textContent=e.message; err.hidden=false; save.disabled=false; }
  });
  const signin=document.createElement("button"); signin.type="button"; signin.className="account-signin-link"; signin.textContent="Already have a player? Sign in"; signin.addEventListener("click",()=>signInDialog({after}));
  grid.append(name.label,user.label,pin.label,note,err,save,signin);
  showDialog("Create your player",grid,{kind:"auth"});
}

function signInDialog({after}={}) {
  const grid=document.createElement("div"); grid.className="account-grid";
  const user=field("Player name", {maxlength:20, autocomplete:"username", placeholder:"ethank"});
  const pin=field("4-digit PIN", {type:"password", maxlength:4, inputmode:"numeric", autocomplete:"current-password", placeholder:"••••"}); pin.input.classList.add("account-pin");
  pin.input.addEventListener("input",()=>{pin.input.value=pin.input.value.replace(/\D/g,"").slice(0,4);});
  const err=errorLine(), sign=button("Sign in");
  sign.addEventListener("click",async()=>{
    err.hidden=true; sign.disabled=true;
    try {
      if(!validPin(pin.input.value)) throw new Error("PIN must be exactly 4 digits.");
      const data=await post("/api/account/login", {username:cleanUsername(user.input.value), pin:pin.input.value});
      savePlayer(data.player); closeDialog();
      if(after) after(); else location.reload();
    } catch(e){err.textContent=e.message;err.hidden=false;sign.disabled=false;}
  });
  const create=document.createElement("button"); create.type="button"; create.className="account-signin-link"; create.textContent="New here? Create a player"; create.addEventListener("click",()=>createAccountDialog({after}));
  grid.append(user.label,pin.label,err,sign,create);
  showDialog("Sign in",grid,{kind:"auth"});
}

function settingsSection(title) {
  const section=document.createElement("section"); section.className="settings-section";
  const heading=document.createElement("h3"); heading.textContent=title; section.append(heading);
  return section;
}

function showSettingsDialog() {
  const d=prepareDialog("settings");
  if(!d) return;
  const wrap=document.createElement("div"); wrap.className="settings-card";
  const close=document.createElement("button"); close.type="button"; close.className="dialog-x"; close.setAttribute("aria-label","Close"); close.textContent="×"; close.addEventListener("click",closeDialog);
  const title=document.createElement("h2"); title.textContent="Your profile";
  wrap.append(close,title);

  const player=parsePlayer();
  const playerSection=settingsSection("Player");
  if(player?.username) {
    const summary=document.createElement("div"); summary.className="settings-player";
    const name=document.createElement("p"); name.className="settings-player-name"; name.textContent=player.display_name || "Player";
    const handle=document.createElement("span"); handle.className="settings-handle"; handle.textContent=`@${player.username}`;
    summary.append(name,handle);

    const nameRow=document.createElement("div"); nameRow.className="settings-name-row";
    const nameField=field("Your name",{value:player.display_name||"",maxlength:24,autocomplete:"nickname"});
    const save=button("Save","btn");
    const status=document.createElement("p"); status.className="settings-status"; status.hidden=true;
    save.addEventListener("click",async()=>{
      status.hidden=true; save.disabled=true;
      try {
        const data=await post("/api/player/name",{player_id:player.id,display_name:nameField.input.value});
        savePlayer({...player,...data});
        status.textContent="Name saved."; status.hidden=false; save.disabled=false;
        name.textContent=data.display_name || nameField.input.value;
      } catch(e){status.textContent=e.message;status.hidden=false;save.disabled=false;}
    });
    nameRow.append(nameField.label,save);

    const actions=document.createElement("div"); actions.className="settings-signed-actions";
    const pinBtn=button("Change PIN","btn ghost"); pinBtn.addEventListener("click",()=>changePinDialog(player));
    const out=button("Sign out","btn ghost"); out.addEventListener("click",()=>{localStorage.removeItem(PLAYER_KEY);location.reload();});
    actions.append(pinBtn,out);
    playerSection.append(summary,nameRow,status,actions);
  } else {
    const note=document.createElement("p"); note.className="account-note"; note.textContent="Create a player once, then use it on your other devices.";
    const actions=document.createElement("div"); actions.className="settings-setup-actions";
    const create=button("Create player","btn"); create.addEventListener("click",()=>createAccountDialog());
    const sign=button("Sign in","btn ghost"); sign.addEventListener("click",()=>signInDialog());
    actions.append(create,sign);
    playerSection.append(note,actions);
  }

  wrap.append(playerSection);
  d.append(wrap);
  if(typeof d.showModal==="function") d.showModal(); else d.setAttribute("open","");
}

function changePinDialog(player) {
  const grid=document.createElement("div"); grid.className="account-grid";
  const current=field("Current PIN", {type:"password",maxlength:4,inputmode:"numeric",autocomplete:"current-password"});
  const next=field("New 4-digit PIN", {type:"password",maxlength:4,inputmode:"numeric",autocomplete:"new-password"});
  for(const input of [current.input,next.input]) input.addEventListener("input",()=>{input.value=input.value.replace(/\D/g,"").slice(0,4);});
  const err=errorLine(), save=button("Change PIN");
  save.addEventListener("click",async()=>{err.hidden=true;save.disabled=true;try{if(!validPin(current.input.value)||!validPin(next.input.value))throw new Error("PIN must be exactly 4 digits.");await post("/api/account/pin",{player_id:player.id,current_pin:current.input.value,new_pin:next.input.value});closeDialog();}catch(e){err.textContent=e.message;err.hidden=false;save.disabled=false;}});
  grid.append(current.label,next.label,err,save);
  showDialog("Change PIN",grid,{kind:"auth"});
}

function tidySettingsDialog(){
  const d=dialogEl();
  if(!d?.open||d.dataset.dialogKind!=="settings")return;
  const wrap=d.querySelector(".settings-card"), panel=d.querySelector(".audio-settings-panel");
  if(!wrap||!panel)return;
  const hint=panel.querySelector(".audio-settings-hint"); if(hint)hint.remove();
  for(const small of panel.querySelectorAll(".audio-channel small"))small.remove();
  if(panel.parentElement!==wrap)wrap.append(panel);
}

// Settings owns the global player identity. Capture prevents the old recovery-code profile from opening.
document.addEventListener("click", event=>{
  const target=event.target instanceof Element ? event.target.closest("#profileBtn") : null;
  if(!target) return;
  event.preventDefault(); event.stopImmediatePropagation(); showSettingsDialog();
}, true);

// Starting or joining Together requires a real player account. Once set up, the existing game flow runs unchanged.
document.addEventListener("click", event=>{
  const target=event.target instanceof Element ? event.target.closest("#createFamily,#joinFamily") : null;
  if(!target || parsePlayer()?.username) return;
  event.preventDefault(); event.stopImmediatePropagation();
  createAccountDialog({after:()=>location.reload()});
}, true);

// Recovery codes are replaced by player-name + PIN sign-in. Also keep the profile modal compact if
// the sound module adds its controls after this module has opened the settings view.
const observer=new MutationObserver(()=>{
  for(const el of document.querySelectorAll("button.link")) if(/recovery code/i.test(el.textContent||"")) el.hidden=true;
  tidySettingsDialog();
});
observer.observe(document.documentElement,{subtree:true,childList:true});