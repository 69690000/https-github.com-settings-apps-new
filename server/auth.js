import crypto from 'node:crypto';
import { db } from './db.js';

export const SESSION_COOKIE = 'cp_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    if (key) cookies[key] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    new Date(now).toISOString(),
    new Date(now + SESSION_TTL_MS).toISOString(),
  );
  return token;
}

export function sessionCookie(token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function currentUser(req) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.alert_enabled, u.alert_hashrate_hs, u.created_at, s.token
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, new Date().toISOString());
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    alertEnabled: Boolean(row.alert_enabled),
    alertHashrateHs: row.alert_hashrate_hs,
    createdAt: row.created_at,
    token: row.token,
  };
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    alertEnabled: user.alertEnabled,
    alertHashrateHs: user.alertHashrateHs,
    createdAt: user.createdAt,
  };
}

export function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sign in to continue' });
    return;
  }
  req.user = user;
  next();
}
