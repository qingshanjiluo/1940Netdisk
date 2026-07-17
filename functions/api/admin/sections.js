/**
 * 版块管理 API
 * GET  /api/admin/sections - 获取版块列表
 * POST /api/admin/sections - 创建版块
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
  
  const sections = data.sections.map(s => {
    const groups = data.sectionPermissions
      .filter(sp => sp.sectionId === s.id)
      .map(sp => ({
        groupId: sp.groupId,
        groupName: (data.groups.find(g => g.id === sp.groupId) || {}).name || sp.groupId,
        level: sp.level
      }));
    return { ...s, groups };
  });

  return new Response(JSON.stringify({ success: true, sections }), {
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
    const { name, slug, description } = body;

    if (!name) {
      return new Response(JSON.stringify({ success: false, error: '请输入版块名称' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!slug) {
      return new Response(JSON.stringify({ success: false, error: '请输入版块标识' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await loadAdminData(env);
    const sectionId = 'section_' + Date.now();
    
    data.sections.push({ id: sectionId, name, slug, description: description || '' });
    await saveAdminData(env, data);

    return new Response(JSON.stringify({ success: true, section: { id: sectionId, name, slug, description } }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
