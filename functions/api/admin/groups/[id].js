/**
 * 单个身份组管理 API
 * PATCH  /api/admin/groups/[id] - 更新身份组
 * DELETE /api/admin/groups/[id] - 删除身份组
 */
import { loadAdminData, saveAdminData } from '../../../utils/admin-data.js';

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const groupId = params.id;
  
  if (!env.img_url) {
    return new Response(JSON.stringify({ success: false, error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const data = await loadAdminData(env);
    const group = data.groups.find(g => g.id === groupId);
    
    if (!group) {
      return new Response(JSON.stringify({ success: false, error: '身份组不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (body.name !== undefined) group.name = body.name;
    if (body.description !== undefined) group.description = body.description;

    // 更新内置权限
    if (Array.isArray(body.builtinPerms)) {
      group.builtinPerms = body.builtinPerms;
    }

    await saveAdminData(env, data);

    return new Response(JSON.stringify({ success: true, group }), {
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
  const groupId = params.id;
  
  if (!env.img_url) {
    return new Response(JSON.stringify({ success: false, error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await loadAdminData(env);
    data.groups = data.groups.filter(g => g.id !== groupId);
    data.userGroups = data.userGroups.filter(ug => ug.groupId !== groupId);
    data.sectionPermissions = data.sectionPermissions.filter(sp => sp.groupId !== groupId);
    await saveAdminData(env, data);

    return new Response(JSON.stringify({ success: true, message: '身份组已删除' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
