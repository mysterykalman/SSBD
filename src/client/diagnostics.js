// Opt-in diagnostics for the word-submit path.
// Enabled only with ?debug=1, localStorage.ssbd_debug === "1", or in automated
// browsers (navigator.webdriver). Otherwise trace() does nothing: no console
// output, no globals, and never anything in the player's UI.

const MAX_ENTRIES = 200;
let enabled = null;

export function diagnosticsEnabled() {
  if (enabled !== null) return enabled;
  let on = false;
  try { on ||= new URLSearchParams(location.search).get("debug") === "1"; } catch {}
  try { on ||= localStorage.getItem("ssbd_debug") === "1"; } catch {}
  try { on ||= navigator.webdriver === true; } catch {}
  enabled = on;
  return on;
}

/** Record one step of a submission: kept in window.__submitTrace and logged with console.debug. */
export function trace(event, data = {}) {
  if (!diagnosticsEnabled()) return;
  const entry = {event, at: Date.now(), ...data};
  const log = (window.__submitTrace ??= []);
  log.push(entry);
  if (log.length > MAX_ENTRIES) log.splice(0, log.length - MAX_ENTRIES);
  try { console.debug("[submit]", event, entry); } catch {}
}
