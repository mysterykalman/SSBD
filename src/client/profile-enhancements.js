// Small progressive enhancement around the existing profile dialog.
// A player name/recovery identity now belongs to the whole game, not only Together Mode.

const PLAYER_KEY = "ssbd_player";
const dialog = document.getElementById("dialog");
const clean = value => String(value || "").replace(/\s+/g, " ").trim();
const player = () => { try { return JSON.parse(localStorage.getItem(PLAYER_KEY) || "null"); } catch { return null; } };

async function createPlayer(name) {
  const response = await fetch("/api/player", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({display_name: name})});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "We couldn’t save your name right now.");
  localStorage.setItem(PLAYER_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("ssbd:player-created", {detail: data}));
  return data;
}

function replaceCopy(root) {
  for (const el of root.querySelectorAll("p,button")) {
    const value = clean(el.textContent);
    if (value === "Solo games are saved on this device only.") {
      el.textContent = "Your Solo games and Stump Mom progress stay on this device and sync when you’re online. Your recovery code brings them to another device.";
    }
    if (value === "I have a recovery code") el.textContent = "Continue on another device";
  }
}

function addNameSetup(root) {
  if (player()?.id || root.querySelector("#nameInput") || root.querySelector("#globalNameSetup")) return;
  const heading = root.querySelector("h1,h2");
  if (heading && clean(heading.textContent) === "Solo") heading.textContent = "Your profile";

  const section = document.createElement("div");
  section.id = "globalNameSetup";
  section.className = "profile-body";
  section.innerHTML = `
    <div class="field">
      <label for="globalNameInput">Your name</label>
      <input id="globalNameInput" type="text" class="text-input" maxlength="24" autocomplete="nickname" placeholder="e.g. Sam">
    </div>
    <p class="muted">Use one name across Solo, Together and Stump Mom. No account required.</p>
    <p class="dialog-error" id="globalNameError" role="alert"></p>
    <button class="btn" id="globalNameSave" type="button">Save name</button>`;
  const firstDivider = root.querySelector("hr");
  (firstDivider?.parentNode || root).insertBefore(section, firstDivider || root.firstChild?.nextSibling || null);

  section.querySelector("#globalNameSave").addEventListener("click", async () => {
    const button = section.querySelector("#globalNameSave"), input = section.querySelector("#globalNameInput"), error = section.querySelector("#globalNameError");
    const name = clean(input.value);
    error.textContent = "";
    if (!name) { error.textContent = "Type your name first."; input.focus(); return; }
    button.disabled = true;
    button.textContent = "Saving…";
    try {
      await createPlayer(name);
      // The main app keeps the player in memory. Reload once after first creation so the
      // Together avatar and profile controls immediately use the new identity.
      location.reload();
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
      button.textContent = "Save name";
    }
  });
}

function enhance() {
  if (!dialog?.open) return;
  replaceCopy(dialog);
  addNameSetup(dialog);
}

if (dialog) {
  new MutationObserver(enhance).observe(dialog, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["open"]});
  dialog.addEventListener("click", () => setTimeout(enhance));
}
