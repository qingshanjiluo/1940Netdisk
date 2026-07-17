/**
 * 登录 API - 支持多用户认证
 * POST /api/auth/login
 * GET  /api/auth/login - 检查是否需要认证
 */
import { 
  createSession, 
  createSessionCookieHeader,
  isAuthRequired 
} from '../../utils/auth.js';
import { authenticateUser, ensureDefaultAdmin } from '../../utils/admin-data.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 如果没有配置认证且没有用户数据，返回成功
    if (!isAuthRequired(env)) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: '无需登录',
        authRequired: false 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const username = String(body?.username ?? body?.user ?? '').trim();
    const password = String(body?.password ?? body?.pass ?? '');

    if (!username || password === '') {
      return new Response(JSON.stringify({
        success: false,
        message: '请输入用户名和密码'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 确保默认管理员已初始化
    await ensureDefaultAdmin(env);

    // 验证凭据（支持 env 变量和 KV 用户）
    const user = await authenticateUser(env, username, password);
    
    if (user) {
      // 创建会话
      const sessionToken = await createSession(username, env);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: '登录成功',
        user: { username: user.username, role: user.role, nickname: user.nickname }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': createSessionCookieHeader(sessionToken)
        }
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      message: '用户名或密码错误' 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: '登录失败：' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 检查登录状态
export async function onRequestGet(context) {
  const { env } = context;
  
  return new Response(JSON.stringify({
    authRequired: isAuthRequired(env)
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
