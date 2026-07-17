const crypto = require('node:crypto');
const { all, get, run } = require('../../db');

const SECTION_ID_PREFIX = 'section_';
const SECTION_ID_LENGTH = 12;

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(length);
  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += chars[bytes[i] % chars.length];
  }
  return output;
}

function generateUniqueSectionId(db, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = SECTION_ID_PREFIX + randomString(SECTION_ID_LENGTH);
    const exists = get(db, 'SELECT id FROM sections WHERE id = ?', [candidate]);
    if (!exists) return candidate;
  }
  throw new Error('Failed to generate a unique section id.');
}

function rowToRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    icon: row.icon || 'fa-folder',
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
  };
}

class SectionRepository {
  constructor(db) {
    this.db = db;
  }

  list() {
    return all(this.db, 'SELECT * FROM sections ORDER BY created_at DESC').map(rowToRecord);
  }

  getById(sectionId) {
    return rowToRecord(get(this.db, 'SELECT * FROM sections WHERE id = ?', [sectionId]));
  }

  getBySlug(slug) {
    return rowToRecord(get(this.db, 'SELECT * FROM sections WHERE slug = ?', [slug]));
  }

  create({ name, slug, description = '', icon = 'fa-folder' }) {
    const normalizedName = String(name || '').trim();
    const normalizedSlug = String(slug || '').trim();
    if (!normalizedName) {
      throw new Error('Section name is required.');
    }
    if (!normalizedSlug) {
      throw new Error('Section slug is required.');
    }

    const existing = this.getBySlug(normalizedSlug);
    if (existing) {
      throw new Error('Section slug already exists.');
    }

    const now = Date.now();
    const id = generateUniqueSectionId(this.db);

    run(
      this.db,
      `INSERT INTO sections(id, name, slug, description, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, normalizedName, normalizedSlug, description, icon, now, now]
    );

    return rowToRecord(get(this.db, 'SELECT * FROM sections WHERE id = ?', [id]));
  }

  update(sectionId, patch = {}) {
    const current = this.getById(sectionId);
    if (!current) return null;

    const next = { ...current };
    if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
      const normalizedName = String(patch.name || '').trim();
      if (!normalizedName) throw new Error('Section name is required.');
      next.name = normalizedName;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'slug')) {
      const normalizedSlug = String(patch.slug || '').trim();
      if (!normalizedSlug) throw new Error('Section slug is required.');
      next.slug = normalizedSlug;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'description')) {
      next.description = String(patch.description || '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'icon')) {
      next.icon = String(patch.icon || 'fa-folder').trim();
    }
    next.updatedAt = Date.now();

    run(
      this.db,
      `UPDATE sections SET name = ?, slug = ?, description = ?, icon = ?, updated_at = ? WHERE id = ?`,
      [next.name, next.slug, next.description, next.icon, next.updatedAt, sectionId]
    );

    return rowToRecord(get(this.db, 'SELECT * FROM sections WHERE id = ?', [sectionId]));
  }

  delete(sectionId) {
    const result = run(this.db, 'DELETE FROM sections WHERE id = ?', [sectionId]);
    return Number(result.changes || 0) > 0;
  }
}

module.exports = {
  SectionRepository,
};
