/**
 * 身份组管理 API
 * GET  /api/admin/groups - 获取身份组列表
 * POST /api/admin/groups - 创建身份组
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
  
  // 附加成员数信息
  const groups = data.groups.map(g => {
    const memberCount = data.userGroups.filter(ug => ug.groupId === g.id).length;
    return { ...g, memberCount };
  });

  return new Response(JSON.stringify({ success: true, groups }), {
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
    const { name, description, builtinPerms } = body;

    if (!name) {
      return new Response(JSON.stringify({ success: false, error: '请输入身份组名称' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await loadAdminData(env);
    const groupId = 'group_' + Date.now();
    
    data.groups.push({ id: groupId, name, description: description || '', builtinPerms: Array.isArray(builtinPerms) ? builtinPerms : [] });

    await saveAdminData(env, data);

    return new Response(JSON.stringify({ success: true, group: { id: groupId, name, description, builtinPerms: Array.isArray(builtinPerms) ? builtinPerms : [] } }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
