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

// Decide once at load: the app rewrites the URL (and drops ?debug=1) as soon as a game opens.
diagnosticsEnabled();

// ---------- Gary's decisions (developer mode) ----------
// On automatically on localhost/127.0.0.1 (npm run dev), or anywhere with ?debug=gary (remembered
// in localStorage; ?debug=off forgets it) or localStorage.ssbd_debug_gary === "1". Automated test
// browsers only get it when they ask for it explicitly. Players never see it.
let garyEnabled = null;
export function garyDiagnosticsEnabled() {
  if (garyEnabled !== null) return garyEnabled;
  let on = false;
  try {
    const debug = new URLSearchParams(location.search).get("debug");
    if (debug === "gary") localStorage.setItem("ssbd_debug_gary", "1");
    if (debug === "off") localStorage.removeItem("ssbd_debug_gary");
  } catch {}
  try { on ||= localStorage.getItem("ssbd_debug_gary") === "1"; } catch {}
  try { on ||= /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && navigator.webdriver !== true; } catch {}
  garyEnabled = on;
  return on;
}

/** Log one of Gary's decisions to the console and keep it in window.__garyDecisions. */
export function logGaryDecision(decision) {
  if (!garyDiagnosticsEnabled() || !decision) return;
  const log = (window.__garyDecisions ??= []);
  log.push(decision);
  if (log.length > MAX_ENTRIES) log.splice(0, log.length - MAX_ENTRIES);
  try {
    const pair = decision.pair ? decision.pair.join(" + ").toUpperCase() : "(opening)";
    console.groupCollapsed(`[gary] ${pair} → ${String(decision.selected).toUpperCase()}`);
    console.log("Latest pair:", pair, "| stage:", decision.stage, decision.lowQuality ? "(low quality)" : "", "| engine:", decision.engine, decision.dataset);
    if (decision.candidates?.length) console.table(decision.candidates.map(({sources, ...c}) => ({...c, sources: (sources || []).join(", ")})));
    if (decision.rejected?.length) console.table(decision.rejected);
    console.log("Selected:", decision.selected, "| strong pool:", (decision.pool || []).join(", "));
    console.groupEnd();
  } catch {}
}

garyDiagnosticsEnabled();
