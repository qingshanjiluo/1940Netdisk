const { run, get } = require('../../db');

/**
 * 获取客户端真实 IP 地址。
 *
 * 安全注意：X-Forwarded-For 头可被客户端伪造。
 * 必须在可信反向代理（如 nginx）后使用，并在 nginx 配置中：
 *   proxy_set_header X-Forwarded-For $remote_addr;
 * 这样 nginx 会用真实 IP 覆盖客户端传入的值。
 * 同时不要设置 proxy_set_header X-Forwarded-For $http_x_forwarded_for;（这会透传客户端值）。
 */
function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '0.0.0.0';
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

class GuestService {
  constructor(db, config) {
    this.db = db;
    this.config = config;
  }

  getConfig() {
    if (!this.config.guestUploadEnabled) {
      return { enabled: false, maxFileSize: 0, dailyLimit: 0 };
    }
    return {
      enabled: true,
      maxFileSize: this.config.guestMaxFileSize,
      dailyLimit: this.config.guestDailyLimit,
    };
  }

  checkUploadAllowed(request, fileSize = 0) {
    if (!this.config.guestUploadEnabled) {
      return {
        allowed: false,
        status: 401,
        reason: 'Guest upload disabled. Please login first.',
      };
    }

    if (fileSize > this.config.guestMaxFileSize) {
      return {
        allowed: false,
        status: 413,
        reason: `Guest upload file size limit exceeded (${Math.ceil(this.config.guestMaxFileSize / 1024 / 1024)}MB).`,
      };
    }

    const ip = getClientIp(request);
    const day = todayKey();
    const row = get(this.db, 'SELECT count FROM guest_upload_counters WHERE id = ?', [`${ip}:${day}`]);
    const current = row ? Number(row.count) : 0;

    if (current >= this.config.guestDailyLimit) {
      return {
        allowed: false,
        status: 429,
        reason: `Guest daily upload limit reached (${this.config.guestDailyLimit}).`,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: this.config.guestDailyLimit - current,
    };
  }

  incrementUsage(request) {
    if (!this.config.guestUploadEnabled) return;

    const ip = getClientIp(request);
    const day = todayKey();
    const id = `${ip}:${day}`;
    const now = Date.now();

    const existing = get(this.db, 'SELECT count FROM guest_upload_counters WHERE id = ?', [id]);
    if (!existing) {
      run(
        this.db,
        `INSERT INTO guest_upload_counters(id, ip, day, count, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, ip, day, 1, now]
      );
      return;
    }

    run(
      this.db,
      `UPDATE guest_upload_counters
       SET count = ?, updated_at = ?
       WHERE id = ?`,
      [Number(existing.count) + 1, now, id]
    );
  }
}

module.exports = {
  GuestService,
  getClientIp,
};
