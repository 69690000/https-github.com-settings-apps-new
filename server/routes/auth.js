import { Router } from 'express';
import { db } from '../db.js';
import { hashPassword, verifyPassword } from '../passwords.js';
import { createSession, clearCookie, currentUser, publicUser, sessionCookie } from '../auth.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newPuid() {
  for (;;) {
    const puid = 100000 + Math.floor(Math.random() * 900000);
    if (!db.prepare('SELECT 1 FROM subaccounts WHERE puid = ?').get(puid)) return puid;
  }
}

router.post('/auth/register', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim();
  const password = String(req.body?.password || '');

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Enter a valid email address' });
    return;
  }
  if (name.length < 2 || name.length > 40) {
    res.status(400).json({ error: 'Name must be 2–40 characters' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    res.status(409).json({ error: 'That email is already registered' });
    return;
  }

  const now = new Date().toISOString();
  const result = db
    .prepare('INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(email, name, hashPassword(password), now);
  const userId = Number(result.lastInsertRowid);
  db.prepare(
    'INSERT INTO subaccounts (user_id, puid, name, is_default, created_at) VALUES (?, ?, ?, 1, ?)',
  ).run(userId, newPuid(), 'main', now);

  const token = createSession(userId);
  res.setHeader('Set-Cookie', sessionCookie(token));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.status(201).json({
    user: publicUser({
      id: user.id,
      email: user.email,
      name: user.name,
      alertEnabled: Boolean(user.alert_enabled),
      alertHashrateHs: user.alert_hashrate_hs,
      createdAt: user.created_at,
    }),
  });
});

router.post('/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Incorrect email or password' });
    return;
  }
  const token = createSession(user.id);
  res.setHeader('Set-Cookie', sessionCookie(token));
  res.json({
    user: publicUser({
      id: user.id,
      email: user.email,
      name: user.name,
      alertEnabled: Boolean(user.alert_enabled),
      alertHashrateHs: user.alert_hashrate_hs,
      createdAt: user.created_at,
    }),
  });
});

router.post('/auth/logout', (req, res) => {
  const user = currentUser(req);
  if (user) db.prepare('DELETE FROM sessions WHERE token = ?').run(user.token);
  res.setHeader('Set-Cookie', clearCookie());
  res.json({ ok: true });
});

router.get('/auth/me', (req, res) => {
  const user = currentUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

export default router;
