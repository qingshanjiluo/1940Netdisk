/**
 * 用户管理 API
 * GET    /api/admin/users         - 获取用户列表
 * POST   /api/admin/users         - 创建用户
 * PATCH  /api/admin/users/[id]    - 更新用户
 * DELETE /api/admin/users/[id]    - 删除用户
 */
import { loadAdminData, saveAdminData, hashPassword } from '../../utils/admin-data.js';

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.img_url) {
    return new Response(JSON.stringify({ success: false, error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  const data = await loadAdminData(env);
  const users = data.users.map(u => ({
    id: u.id, username: u.username, nickname: u.nickname,
    role: u.role, enabled: u.enabled, createdAt: u.createdAt
  }));

  return new Response(JSON.stringify({ success: true, users }), {
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
    const { username, nickname, password, role, enabled, groupIds } = body;

    if (!username || username.length < 3) {
      return new Response(JSON.stringify({ success: false, error: '用户名至少3个字符' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ success: false, error: '密码至少6个字符' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await loadAdminData(env);
    
    if (data.users.find(u => u.username === username)) {
      return new Response(JSON.stringify({ success: false, error: '用户名已存在' }), {
        status: 409, headers: { 'Content-Type': 'application/json' }
      });
    }

    const passwordHash = await hashPassword(password);
    const newUser = {
      id: 'user_' + Date.now(),
      username,
      nickname: nickname || username,
      passwordHash,
      role: role || 'guest',
      enabled: enabled !== false,
      createdAt: Date.now()
    };

    data.users.push(newUser);

    // 添加身份组关联
    if (Array.isArray(groupIds)) {
      for (const gid of groupIds) {
        data.userGroups.push({ userId: newUser.id, groupId: gid });
      }
    }

    await saveAdminData(env, data);

    return new Response(JSON.stringify({
      success: true,
      user: { id: newUser.id, username: newUser.username, nickname: newUser.nickname, role: newUser.role, enabled: newUser.enabled }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
