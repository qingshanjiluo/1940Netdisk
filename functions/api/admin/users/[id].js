/**
 * 单个用户管理 API
 * PATCH  /api/admin/users/[id] - 更新用户
 * DELETE /api/admin/users/[id] - 删除用户
 */
import { loadAdminData, saveAdminData, hashPassword } from '../../../utils/admin-data.js';

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const userId = params.id;
  
  if (!env.img_url) {
    return new Response(JSON.stringify({ success: false, error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const data = await loadAdminData(env);
    const user = data.users.find(u => u.id === userId);
    
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: '用户不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    // 更新字段
    if (body.nickname !== undefined) user.nickname = body.nickname;
    if (body.role !== undefined) user.role = body.role;
    if (body.enabled !== undefined) user.enabled = body.enabled;
    if (body.password && body.password.length >= 6) {
      user.passwordHash = await hashPassword(body.password);
    }

    // 更新身份组关联
    if (Array.isArray(body.groupIds)) {
      data.userGroups = data.userGroups.filter(ug => ug.userId !== userId);
      for (const gid of body.groupIds) {
        data.userGroups.push({ userId, groupId: gid });
      }
    }

    await saveAdminData(env, data);

    return new Response(JSON.stringify({
      success: true,
      user: { id: user.id, username: user.username, nickname: user.nickname, role: user.role, enabled: user.enabled }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const userId = params.id;
  
  if (!env.img_url) {
    return new Response(JSON.stringify({ success: false, error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await loadAdminData(env);
    const user = data.users.find(u => u.id === userId);
    
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: '用户不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    // 不允许删除 env 管理员
    if (user.username === env.BASIC_USER) {
      return new Response(JSON.stringify({ success: false, error: '不能删除主管理员账号' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    data.users = data.users.filter(u => u.id !== userId);
    data.userGroups = data.userGroups.filter(ug => ug.userId !== userId);
    await saveAdminData(env, data);

    return new Response(JSON.stringify({ success: true, message: '用户已删除' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
