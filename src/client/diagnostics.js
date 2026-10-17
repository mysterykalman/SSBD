// Submission traces remain opt-in for local debugging. Player-facing gameplay never renders them.
// Solo bot-decision capture is always enabled so /review receives full decision diagnostics in every environment.

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

export function trace(event, data = {}) {
  if (!diagnosticsEnabled()) return;
  const entry = {event, at: Date.now(), ...data};
  const log = (window.__submitTrace ??= []);
  log.push(entry);
  if (log.length > MAX_ENTRIES) log.splice(0, log.length - MAX_ENTRIES);
  try { console.debug("[submit]", event, entry); } catch {}
}

diagnosticsEnabled();

// Bot-decision diagnostics are review data, not gameplay UI. Keep capture on so persisted
// game logs and /review always have the full engine decision, including outside localhost.
export function garyDiagnosticsEnabled() {
  return true;
}

export function logGaryDecision(decision) {
  if (!decision) return;
  const log = (window.__garyDecisions ??= []);
  log.push(decision);
  if (log.length > MAX_ENTRIES) log.splice(0, log.length - MAX_ENTRIES);
}
