/**
 * 个人资料 API
 * GET  /api/profile     - 获取当前用户资料（含 avatar）
 * PATCH /api/profile    - 更新当前用户资料（nickname, avatar, password）
 */
import { checkAuthentication } from '../utils/auth.js';
import { loadAdminData, saveAdminData, findUserByUsername, hashPassword, verifyPassword } from '../utils/admin-data.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const auth = await checkAuthentication(context);
    if (!auth.authenticated) {
      return jsonResponse({ error: '未登录' }, 401);
    }

    // 获取当前用户名
    let username = null;
    if (auth.token && env.img_url) {
      const sessionData = await env.img_url.get(`session:${auth.token}`, { type: 'json' });
      if (sessionData && sessionData.user) username = sessionData.user;
    } else if (auth.user) {
      username = auth.user;
    }

    if (!username) {
      return jsonResponse({ error: '无法识别当前用户' }, 400);
    }

    const user = await findUserByUsername(env, username);
    if (!user) {
      return jsonResponse({ error: '用户不存在' }, 404);
    }

    return jsonResponse({
      id: user.id,
      username: user.username,
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      role: user.role || 'user',
    });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  try {
    const auth = await checkAuthentication(context);
    if (!auth.authenticated) {
      return jsonResponse({ error: '未登录' }, 401);
    }

    const body = await request.json();

    // 获取当前用户名
    let username = null;
    if (auth.token && env.img_url) {
      const sessionData = await env.img_url.get(`session:${auth.token}`, { type: 'json' });
      if (sessionData && sessionData.user) username = sessionData.user;
    } else if (auth.user) {
      username = auth.user;
    }

    if (!username) {
      return jsonResponse({ error: '无法识别当前用户' }, 400);
    }

    const data = await loadAdminData(env);
    const user = data.users.find(u => u.username === username);
    if (!user) {
      return jsonResponse({ error: '用户不存在' }, 404);
    }

    // 更新昵称
    if (body.nickname !== undefined) {
      user.nickname = String(body.nickname).trim();
    }

    // 更新头像
    if (body.avatar !== undefined) {
      user.avatar = String(body.avatar).trim();
    }

    // 修改密码（需要验证当前密码）
    if (body.newPassword) {
      if (body.newPassword.length < 6) {
        return jsonResponse({ error: '新密码至少6个字符' }, 400);
      }
      if (!body.currentPassword) {
        return jsonResponse({ error: '需要提供当前密码以验证身份' }, 400);
      }
      const valid = await verifyPassword(body.currentPassword, user.passwordHash);
      if (!valid) {
        return jsonResponse({ error: '当前密码错误' }, 403);
      }
      user.passwordHash = await hashPassword(body.newPassword);
    }

    await saveAdminData(env, data);

    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar || '',
        role: user.role,
      },
    });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
