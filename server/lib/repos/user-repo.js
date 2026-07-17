const crypto = require('node:crypto');
const { all, get, run } = require('../../db');

const USER_ID_PREFIX = 'user_';
const USER_ID_LENGTH = 12;

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(length);
  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += chars[bytes[i] % chars.length];
  }
  return output;
}

function generateUniqueUserId(db, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = USER_ID_PREFIX + randomString(USER_ID_LENGTH);
    const exists = get(db, 'SELECT id FROM users WHERE id = ?', [candidate]);
    if (!exists) return candidate;
  }
  throw new Error('Failed to generate a unique user id.');
}

function rowToRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname || '',
    password: row.password,
    role: row.role || 'user',
    enabled: row.enabled !== 0,
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
  };
}

class UserRepository {
  constructor(db) {
    this.db = db;
  }

  list() {
    return all(this.db, 'SELECT * FROM users ORDER BY created_at DESC').map(rowToRecord);
  }

  getById(userId) {
    return rowToRecord(get(this.db, 'SELECT * FROM users WHERE id = ?', [userId]));
  }

  getByUsername(username) {
    return rowToRecord(get(this.db, 'SELECT * FROM users WHERE username = ?', [username]));
  }

  create({ username, nickname = '', password, role = 'user', enabled = true }) {
    const normalizedUsername = String(username || '').trim();
    if (!normalizedUsername) {
      throw new Error('Username is required.');
    }
    if (!password || String(password).length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const existing = this.getByUsername(normalizedUsername);
    if (existing) {
      throw new Error('Username already exists.');
    }

    const now = Date.now();
    const id = generateUniqueUserId(this.db);

    run(
      this.db,
      `INSERT INTO users(id, username, nickname, password, role, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, normalizedUsername, nickname, password, role, enabled ? 1 : 0, now, now]
    );

    return rowToRecord(get(this.db, 'SELECT * FROM users WHERE id = ?', [id]));
  }

  update(userId, patch = {}) {
    const current = this.getById(userId);
    if (!current) return null;

    const next = { ...current };
    if (Object.prototype.hasOwnProperty.call(patch, 'username')) {
      const normalizedUsername = String(patch.username || '').trim();
      if (!normalizedUsername) throw new Error('Username is required.');
      next.username = normalizedUsername;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'nickname')) {
      next.nickname = String(patch.nickname || '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'password')) {
      const newPassword = String(patch.password || '').trim();
      if (newPassword && newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
      if (newPassword) next.password = newPassword;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'role')) {
      next.role = String(patch.role || 'user').trim();
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'enabled')) {
      next.enabled = patch.enabled !== false;
    }
    next.updatedAt = Date.now();

    run(
      this.db,
      `UPDATE users SET username = ?, nickname = ?, password = ?, role = ?, enabled = ?, updated_at = ? WHERE id = ?`,
      [next.username, next.nickname, next.password, next.role, next.enabled ? 1 : 0, next.updatedAt, userId]
    );

    return rowToRecord(get(this.db, 'SELECT * FROM users WHERE id = ?', [userId]));
  }

  delete(userId) {
    const result = run(this.db, 'DELETE FROM users WHERE id = ?', [userId]);
    return Number(result.changes || 0) > 0;
  }

  setPassword(userId, newPassword) {
    const current = this.getById(userId);
    if (!current) return false;
    run(this.db, 'UPDATE users SET password = ?, updated_at = ? WHERE id = ?', [newPassword, Date.now(), userId]);
    return true;
  }
}

module.exports = {
  UserRepository,
};
