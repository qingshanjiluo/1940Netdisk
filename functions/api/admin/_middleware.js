/**
 * 管理后台中间件 - 支持多用户认证
 * 检查 Cookie session 或 Basic Auth
 * 如果没有配置认证且没有用户数据，直接放行
 */
import { checkAuthentication, isAuthRequired } from '../../utils/auth.js';
import { loadAdminData, ensureDefaultAdmin } from '../../utils/admin-data.js';
import { apiError } from '../../utils/api-v1.js';

export async function onRequest(context) {
  if (!context.env?.img_url) {
    return apiError(
      'SERVER_MISCONFIGURED',
      'KV binding img_url is not configured.',
      500
    );
  }

  // 确保默认管理员已初始化
  await ensureDefaultAdmin(context.env);

  // 如果没有配置认证（无 env 变量），检查是否有 KV 用户
  if (!isAuthRequired(context.env)) {
    const data = await loadAdminData(context.env);
    // 如果有用户数据，要求登录
    if (data.users.length > 0) {
      const authResult = await checkAuthentication(context);
      if (!authResult.authenticated) {
        return new Response('You need to login.', {
          status: 401,
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            'Cache-Control': 'no-store',
          },
        });
      }
    }
    // 没有用户数据，放行（首次设置）
    return context.next();
  }

  // 有 env 变量，使用标准认证
  const authResult = await checkAuthentication(context);
  if (authResult.authenticated) {
    return context.next();
  }

  return new Response('You need to login.', {
    status: 401,
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });
}
