const crypto = require('node:crypto');
const { all, get, run } = require('../../db');

const GROUP_ID_PREFIX = 'group_';
const GROUP_ID_LENGTH = 12;

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(length);
  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += chars[bytes[i] % chars.length];
  }
  return output;
}

function generateUniqueGroupId(db, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = GROUP_ID_PREFIX + randomString(GROUP_ID_LENGTH);
    const exists = get(db, 'SELECT id FROM groups WHERE id = ?', [candidate]);
    if (!exists) return candidate;
  }
  throw new Error('Failed to generate a unique group id.');
}

function rowToRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
  };
}

class GroupRepository {
  constructor(db) {
    this.db = db;
  }

  list() {
    return all(this.db, 'SELECT * FROM groups ORDER BY created_at DESC').map(rowToRecord);
  }

  getById(groupId) {
    return rowToRecord(get(this.db, 'SELECT * FROM groups WHERE id = ?', [groupId]));
  }

  create({ name, description = '' }) {
    const normalizedName = String(name || '').trim();
    if (!normalizedName) {
      throw new Error('Group name is required.');
    }

    const now = Date.now();
    const id = generateUniqueGroupId(this.db);

    run(
      this.db,
      `INSERT INTO groups(id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, normalizedName, description, now, now]
    );

    return rowToRecord(get(this.db, 'SELECT * FROM groups WHERE id = ?', [id]));
  }

  update(groupId, patch = {}) {
    const current = this.getById(groupId);
    if (!current) return null;

    const next = { ...current };
    if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
      const normalizedName = String(patch.name || '').trim();
      if (!normalizedName) throw new Error('Group name is required.');
      next.name = normalizedName;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'description')) {
      next.description = String(patch.description || '').trim();
    }
    next.updatedAt = Date.now();

    run(
      this.db,
      `UPDATE groups SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
      [next.name, next.description, next.updatedAt, groupId]
    );

    return rowToRecord(get(this.db, 'SELECT * FROM groups WHERE id = ?', [groupId]));
  }

  delete(groupId) {
    const result = run(this.db, 'DELETE FROM groups WHERE id = ?', [groupId]);
    return Number(result.changes || 0) > 0;
  }
}

module.exports = {
  GroupRepository,
};
