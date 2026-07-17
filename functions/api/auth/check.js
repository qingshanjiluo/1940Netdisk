/**
 * 检查认证状态 API - 支持多用户
 * GET /api/auth/check
 */
import {
  checkAuthentication,
  isAuthRequired,
  getSessionFromCookie,
  verifySession
} from '../../utils/auth.js';
import { getGuestConfig } from '../../utils/guest.js';
import { findUserByUsername } from '../../utils/admin-data.js';

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const guestConfig = getGuestConfig(env);

    // 如果没有配置认证
    if (!isAuthRequired(env)) {
      return new Response(JSON.stringify({
        authenticated: true,
        authRequired: false,
        message: '无需登录',
        guestUpload: guestConfig
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const authResult = await checkAuthentication(context);
    
    let userInfo = null;
    if (authResult.authenticated) {
      // 尝试获取用户详细信息
      const sessionToken = getSessionFromCookie(context.request);
      if (sessionToken && env.img_url) {
        try {
          const sessionData = await env.img_url.get(`session:${sessionToken}`, { type: 'json' });
          if (sessionData && sessionData.user) {
            const user = await findUserByUsername(env, sessionData.user);
            if (user) {
              userInfo = { username: user.username, nickname: user.nickname, role: user.role };
            } else {
              // 可能是 env 变量用户
              userInfo = { username: sessionData.user, role: 'admin', nickname: '管理员' };
            }
          }
        } catch (e) {
          console.error('Get user info error:', e);
        }
      }
    }

    return new Response(JSON.stringify({
      authenticated: authResult.authenticated,
      authRequired: true,
      reason: authResult.reason,
      user: userInfo,
      guestUpload: guestConfig
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return new Response(JSON.stringify({
      authenticated: false,
      authRequired: true,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
