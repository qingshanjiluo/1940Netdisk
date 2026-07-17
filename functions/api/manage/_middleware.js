import { 
  checkAuthentication,
  isAuthRequired 
} from '../../utils/auth.js';
import { loadAdminData, ensureDefaultAdmin } from '../../utils/admin-data.js';

async function errorHandling(context) {
    try {
      return await context.next();
    } catch (err) {
      return new Response(`${err.message}\n${err.stack}`, { status: 500 });
    }
  }

  async function authentication(context) {
    // 检查 KV 是否绑定
    if (typeof context.env.img_url == "undefined" || context.env.img_url == null || context.env.img_url == "") {
        return new Response('Dashboard is disabled. Please bind a KV namespace to use this feature.', { status: 200 });
    }

    // 确保默认管理员已初始化
    await ensureDefaultAdmin(context.env);

    // 如果没有配置认证（无 env 变量），检查是否有 KV 用户
    if (!isAuthRequired(context.env)) {
        const data = await loadAdminData(context.env);
        // 如果有用户数据，要求登录
        if (data.users.length > 0) {
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
        // 没有用户数据，放行
        return context.next();
    }
    
    // 有 env 变量，使用标准认证
    const authResult = await checkAuthentication(context);
    
    if (authResult.authenticated) {
        return context.next();
    }
    
    // 认证失败，返回 401
    return new Response('You need to login.', {
        status: 401,
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          'Cache-Control': 'no-store',
        },
    });
  }
  
  export const onRequest = [errorHandling, authentication];
