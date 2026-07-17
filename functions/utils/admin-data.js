/**
 * 管理数据存储模块
 * 将用户、身份组、版块、权限数据存储在 Cloudflare KV (img_url) 中
 * 
 * KV Key: admin:data
 * 数据结构:
 * {
 *   users: [{ id, username, nickname, passwordHash, role, enabled, createdAt }],
 *   groups: [{ id, name, description }],
 *   userGroups: [{ userId, groupId }],
 *   sections: [{ id, name, slug, description }],
 *   sectionPermissions: [{ sectionId, groupId, level }]
 * }
 */

const ADMIN_DATA_KEY = 'admin:data';

/**
 * 获取默认的空数据结构
 */
function getEmptyData() {
  return {
    users: [],
    groups: [],
    userGroups: [],
    sections: [],
    sectionPermissions: []
  };
}

/**
 * 从 KV 加载管理数据
 */
export async function loadAdminData(env) {
  if (!env.img_url) return getEmptyData();
  try {
    const data = await env.img_url.get(ADMIN_DATA_KEY, { type: 'json' });
    if (!data || typeof data !== 'object') return getEmptyData();
    // 确保所有字段存在
    return {
      users: Array.isArray(data.users) ? data.users : [],
      groups: Array.isArray(data.groups) ? data.groups : [],
      userGroups: Array.isArray(data.userGroups) ? data.userGroups : [],
      sections: Array.isArray(data.sections) ? data.sections : [],
      sectionPermissions: Array.isArray(data.sectionPermissions) ? data.sectionPermissions : []
    };
  } catch (e) {
    console.error('loadAdminData error:', e);
    return getEmptyData();
  }
}

/**
 * 保存管理数据到 KV
 */
export async function saveAdminData(env, data) {
  if (!env.img_url) throw new Error('KV binding not configured');
  const sanitized = {
    users: Array.isArray(data.users) ? data.users : [],
    groups: Array.isArray(data.groups) ? data.groups : [],
    userGroups: Array.isArray(data.userGroups) ? data.userGroups : [],
    sections: Array.isArray(data.sections) ? data.sections : [],
    sectionPermissions: Array.isArray(data.sectionPermissions) ? data.sectionPermissions : []
  };
  await env.img_url.put(ADMIN_DATA_KEY, JSON.stringify(sanitized));
  return sanitized;
}

/**
 * 简单密码哈希（使用 Web Crypto SHA-256）
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 验证密码
 */
export async function verifyPassword(password, hash) {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

/**
 * 根据用户名查找用户
 */
export async function findUserByUsername(env, username) {
  const data = await loadAdminData(env);
  return data.users.find(u => u.username === username) || null;
}

/**
 * 验证用户凭据（支持 env 变量回退）
 */
export async function authenticateUser(env, username, password) {
  // 优先检查 env 变量（管理员账号）
  if (env.BASIC_USER && env.BASIC_PASS && username === env.BASIC_USER && password === env.BASIC_PASS) {
    return { id: 'env_admin', username: env.BASIC_USER, role: 'admin', nickname: '管理员' };
  }

  // 检查 KV 中的用户
  const user = await findUserByUsername(env, username);
  if (!user) return null;
  if (user.enabled === false) return null;
  
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, username: user.username, role: user.role, nickname: user.nickname };
}

/**
 * 获取用户的身份组列表
 */
export async function getUserGroups(env, userId) {
  const data = await loadAdminData(env);
  return data.userGroups
    .filter(ug => ug.userId === userId)
    .map(ug => {
      const group = data.groups.find(g => g.id === ug.groupId);
      return group ? { ...group } : { id: ug.groupId, name: ug.groupId };
    });
}

/**
 * 获取用户在指定版块的权限级别
 */
export async function getUserSectionPermission(env, userId, sectionId) {
  const data = await loadAdminData(env);
  
  // admin 角色拥有全部权限
  const user = data.users.find(u => u.id === userId);
  if (user && user.role === 'admin') return 'write';
  
  // 通过身份组查找权限
  const userGroupIds = data.userGroups
    .filter(ug => ug.userId === userId)
    .map(ug => ug.groupId);
  
  let bestLevel = 'none';
  for (const groupId of userGroupIds) {
    const perm = data.sectionPermissions.find(sp => sp.groupId === groupId && sp.sectionId === sectionId);
    if (perm) {
      if (perm.level === 'write') return 'write';
      if (perm.level === 'read' && bestLevel === 'none') bestLevel = 'read';
    }
  }
  
  return bestLevel;
}

/**
 * 初始化默认管理员账号（如果没有任何用户）
 */
export async function ensureDefaultAdmin(env) {
  const data = await loadAdminData(env);
  if (data.users.length > 0) return data;
  
  // 如果 env 配置了 BASIC_USER，创建对应的管理员用户
  if (env.BASIC_USER && env.BASIC_PASS) {
    const passwordHash = await hashPassword(env.BASIC_PASS);
    data.users.push({
      id: 'user_' + Date.now(),
      username: env.BASIC_USER,
      nickname: '管理员',
      passwordHash,
      role: 'admin',
      enabled: true,
      createdAt: Date.now()
    });
    await saveAdminData(env, data);
  }
  
  return data;
}
