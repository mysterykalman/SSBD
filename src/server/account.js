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
 ¶»§q«^