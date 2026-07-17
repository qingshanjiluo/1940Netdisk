/**
 * 单个版块管理 API
 * PATCH  /api/admin/sections/[id] - 更新版块
 * DELETE /api/admin/sections/[id] - 删除版块
 */
import { loadAdminData, saveAdminData } from '../../../utils/admin-data.js';

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const sectionId = params.id;
  
  if (!env.img_url) {
    return new Response(JSON.stringify({ success: false, error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const data = await loadAdminData(env);
    const section = data.sections.find(s => s.id === sectionId);
    
    if (!section) {
      return new Response(JSON.stringify({ success: false, error: '版块不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (body.name !== undefined) section.name = body.name;
    if (body.slug !== undefined) section.slug = body.slug;
    if (body.description !== undefined) section.description = body.description;

    await saveAdminData(env, data);

    return new Response(JSON.stringify({ success: true, section }), {
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
  const sectionId = params.id;
  
  if (!env.img_url) {
    return new Response(JSON.stringify({ success: false, error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await loadAdminData(env);
    data.sections = data.sections.filter(s => s.id !== sectionId);
    data.sectionPermissions = data.sectionPermissions.filter(sp => sp.sectionId !== sectionId);
    await saveAdminData(env, data);

    return new Response(JSON.stringify({ success: true, message: '版块已删除' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
