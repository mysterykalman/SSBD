// Lightweight username + 4-digit PIN accounts for cross-device identity.
// PINs are salted and hashed with scrypt. The database never stores the PIN itself.
import {randomBytes, scryptSync, timingSafeEqual} from "node:crypto";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}
});
const fail = (status, code, error, extra = {}) => json({error, code, ...extra}, status);
const now = () => new Date().toISOString();
const cleanName = value => String(value || "").replace(/\s+/g, " ").trim().slice(0, 24);
const cleanUsername = value => String(value || "").trim().toLowerCase();
const validUsername = value => /^[a-z0-9_]{2,20}$/.test(value);
const validPin = value => /^\d{4}$/.test(String(value || ""));

async function first(db, sql, args = []) {
  return (await db.query(sql, args)).rows[0] || null;
}

function hashPin(pin) {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function verifyPin(pin, stored) {
  try {
    const [kind, salt64, hash64] = String(stored || "").split("$");
    if (kind !== "scrypt" || !salt64 || !hash64) return false;
    const expected = Buffer.from(hash64, "base64");
    const actual = scryptSync(pin, Buffer.from(salt64, "base64"), expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function publicPlayer(row) {
  return {id: row.id, display_name: row.display_name, username: row.username};
}

function hiddenRecoveryCode() {
  return `ACCOUNT-${randomBytes(12).toString("hex").toUpperCase()}`;
}

export async function handleAccountApi(request, db) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith("/api/account/")) return null;
  if (!db) return fail(503, "NO_DATABASE", "Database is not configured");

  let body = {};
  if (request.method !== "GET" && request.method !== "HEAD") {
    try { body = await request.json(); } catch {}
  }

  if (path === "/api/account/register" && request.method === "POST") {
    const displayName = cleanName(body.display_name);
    const username = cleanUsername(body.username);
    const pin = String(body.pin || "");
    if (!displayName) return fail(400, "EMPTY_NAME", "Type your name first.");
    if (!validUsername(username)) return fail(400, "BAD_USERNAME", "Player names use 2–20 letters, numbers, or underscores.");
    if (!validPin(pin)) return fail(400, "BAD_PIN", "PIN must be exactly 4 digits.");
    const taken = await first(db, "SELECT 1 FROM players WHERE lower(username) = lower($1) LIMIT 1", [username]);
    if (taken) return fail(409, "USERNAME_TAKEN", "That player name is already taken.");

    const pinHash = hashPin(pin), at = now();
    const playerId = String(body.player_id || "");
    const recoveryCode = String(body.recovery_code || "");
    if (playerId && recoveryCode) {
      const upgraded = await first(db, `UPDATE players
        SET display_name=$1, username=$2, pin_hash=$3, failed_login_count=0, login_locked_until=NULL, last_seen_at=$4
        WHERE id=$5 AND recovery_code=$6 AND username IS NULL
        RETURNING id, display_name, username`, [displayName, username, pinHash, at, playerId, recoveryCode]);
      if (upgraded) return json({player: publicPlayer(upgraded), upgraded: true});
    }

    const id = crypto.randomUUID();
    try {
      const created = await first(db, `INSERT INTO players
        (id, display_name, recovery_code, created_at, last_seen_at, username, pin_hash, failed_login_count, login_locked_until)
        VALUES($1,$2,$3,$4,$4,$5,$6,0,NULL)
        RETURNING id, display_name, username`, [id, displayName, hiddenRecoveryCode(), at, username, pinHash]);
      return json({player: publicPlayer(created), upgraded: false});
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") return fail(409, "USERNAME_TAKEN", "That player name is already taken.");
      throw error;
    }
  }

  if (path === "/api/account/login" && request.method === "POST") {
    const username = cleanUsername(body.username), pin = String(body.pin || "");
    if (!validUsername(username) || !validPin(pin)) return fail(400, "BAD_LOGIN", "Check your player name and 4-digit PIN.");
    const player = await first(db, `SELECT id, display_name, username, pin_hash, failed_login_count, login_locked_until
      FROM players WHERE lower(username)=lower($1) LIMIT 1`, [username]);
    if (!player || !player.pin_hash) return fail(401, "BAD_LOGIN", "Check your player name and 4-digit PIN.");

    const lockedUntil = player.login_locked_until ? Date.parse(player.login_locked_until) : 0;
    if (lockedUntil && lockedUntil > Date.now()) {
      return fail(429, "LOGIN_LOCKED", "Too many tries. Wait a few minutes and try again.");
    }
    if (!verifyPin(pin, player.pin_hash)) {
      const failures = Number(player.failed_login_count || 0) + 1;
      const lock = failures >= 5 ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null;
      await db.query("UPDATE players SET failed_login_count=$1, login_locked_until=$2 WHERE id=$3", [lock ? 0 : failures, lock, player.id]);
      return fail(lock ? 429 : 401, lock ? "LOGIN_LOCKED" : "BAD_LOGIN", lock ? "Too many tries. Wait a few minutes and try again." : "Check your player name and 4-digit PIN.");
    }
    await db.query("UPDATE players SET failed_login_count=0, login_locked_until=NULL, last_seen_at=$1 WHERE id=$2", [now(), player.id]);
    return json({player: publicPlayer(player)});
  }

  if (path === "/api/account/pin" && request.method === "POST") {
    const playerId = String(body.player_id || ""), currentPin = String(body.current_pin || ""), newPin = String(body.new_pin || "");
    if (!validPin(currentPin) || !validPin(newPin)) return fail(400, "BAD_PIN", "PIN must be exactly 4 digits.");
    const player = await first(db, "SELECT id, pin_hash FROM players WHERE id=$1", [playerId]);
    if (!player?.pin_hash || !verifyPin(currentPin, player.pin_hash)) return fail(401, "BAD_LOGIN", "Current PIN is incorrect.");
    await db.query("UPDATE players SET pin_hash=$1, failed_login_count=0, login_locked_until=NULL, last_seen_at=$2 WHERE id=$3", [hashPin(newPin), now(), playerId]);
    return json({ok: true});
  }

  return fail(404, "NOT_FOUND", "Not found");
}
