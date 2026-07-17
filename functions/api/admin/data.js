/**
 * 管理数据 API
 * GET  /api/admin/data - 获取所有管理数据
 * POST /api/admin/data - 批量更新管理数据（用于迁移）
 */
import { loadAdminData, saveAdminData } from '../../utils/admin-data.js';

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.img_url) {
    return new Response(JSON.stringify({ success: false, error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  const data = await loadAdminData(env);
  
  // 不返回密码哈希
  const safeData = {
    ...data,
    users: data.users.map(u => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      role: u.role,
      enabled: u.enabled,
      createdAt: u.createdAt
    }))
  };

  return new Response(JSON.stringify({ success: true, data: safeData }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.img_url) {
    return new Response(JSON.stringify({ success: false, error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ success: false, error: 'Invalid data' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // 合并数据（保留现有密码哈希）
    const existing = await loadAdminData(env);
    const merged = {
      users: Array.isArray(body.users) ? body.users.map(u => {
        // 如果传入的用户没有 passwordHash，保留已有的
        const existingUser = existing.users.find(eu => eu.id === u.id || eu.username === u.username);
        return {
          ...u,
          passwordHash: u.passwordHash || (existingUser ? existingUser.passwordHash : null)
        };
      }) : existing.users,
      groups: Array.isArray(body.groups) ? body.groups : existing.groups,
      userGroups: Array.isArray(body.userGroups) ? body.userGroups : existing.userGroups,
      sections: Array.isArray(body.sections) ? body.sections : existing.sections,
      sectionPermissions: Array.isArray(body.sectionPermissions) ? body.sectionPermissions : existing.sectionPermissions
    };

    await saveAdminData(env, merged);

    return new Response(JSON.stringify({ success: true, message: 'Data saved' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
