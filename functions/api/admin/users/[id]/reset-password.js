/**
 * 用户密码重置 API
 * POST /api/admin/users/[id]/reset-password
 */
import { loadAdminData, saveAdminData, hashPassword } from '../../../../utils/admin-data.js';

export async function onRequestPost(context) {
  const { request, env, params } = context;
  const userId = params.id;
  
  if (!env.img_url) {
    return new Response(JSON.stringify({ success: false, error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ success: false, error: '密码至少6个字符' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await loadAdminData(env);
    const user = data.users.find(u => u.id === userId);
    
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: '用户不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    user.passwordHash = await hashPassword(password);
    await saveAdminData(env, data);

    return new Response(JSON.stringify({ success: true, message: '密码已重置' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
