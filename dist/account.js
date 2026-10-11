// Lightweight account UI layered on top of the existing game shell.
// One player identity can be used on multiple devices. PINs are exactly four digits.
const PLAYER_KEY = "ssbd_player";
const parsePlayer = () => { try { return JSON.parse(localStorage.getItem(PLAYER_KEY) || "null"); } catch { return null; } };
const savePlayer = player => { localStorage.setItem(PLAYER_KEY, JSON.stringify(player)); window.dispatchEvent(new StorageEvent("storage", {key: PLAYER_KEY})); };

const style = document.createElement("style");
style.textContent = `
.account-card{position:relative;display:grid;gap:16px;padding:22px}.account-card>h2{padding-right:42px}.account-grid{display:grid;gap:12px}.account-grid label{display:grid;gap:6px;font-weight:900}.account-grid input{width:100%;font:inherit;padding:11px 12px;border:3px solid var(--ink,#2b1b3d);border-radius:12px;background:#fff}.account-actions{display:flex;gap:10px;flex-wrap:wrap}.account-note{margin:0;color:var(--muted,#6b4e63);font-size:.9rem;line-height:1.45}.account-error{margin:0;color:#a52222;font-weight:800}.account-user{margin:0;font-weight:900}.account-divider{height:1px;background:rgba(43,27,61,.16);margin:2px 0}.account-signin-link{background:none;border:0;padding:4px 0;color:var(--grape,#7b4fc9);text-decoration:underline;text-underline-offset:3px;font:inherit;font-weight:800;cursor:pointer}.account-pin{letter-spacing:.2em;font-variant-numeric:tabular-nums}.settings-card{position:relative;display:grid;gap:0;padding:22px}.settings¶»§q«^