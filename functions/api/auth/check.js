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
import { findUserByUsername, loadAdminData } from '../../utils/admin-data.js';

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const guestConfig = getGuestConfig(env);

    // 如果没有配置环境变量认证，检查 KV 是否有用户数据
    if (!isAuthRequired(env)) {
      // 检查 KV 中是否有用户数据（类似 admin/manage middleware 的逻辑）
      try {
        const data = await loadAdminData(env);
        if (data.users.length > 0) {
          // KV 有注册用户，需要完整的认证检查
          const authResult = await checkAuthentication(context);

          if (authResult.authenticated) {
            // 已通过 session / basic auth 认证
            let userInfo = null;
            const sessionToken = getSessionFromCookie(context.request);
            if (sessionToken && env.img_url) {
              try {
                const sessionData = await env.img_url.get(`session:${sessionToken}`, { type: 'json' });
                if (sessionData && sessionData.user) {
                  const user = await findUserByUsername(env, sessionData.user);
                  if (user) {
                    userInfo = { id: user.id, username: user.username, nickname: user.nickname || '', avatar: user.avatar || '', role: user.role };
                  } else {
                    userInfo = { id: 'env_admin', username: sessionData.user, role: 'admin', nickname: '管理员', avatar: '' };
                  }
                }
              } catch (e) {
                console.error('Get user info error:', e);
              }
            }

            return new Response(JSON.stringify({
              authenticated: true,
              authRequired: true,
              reason: authResult.reason,
              user: userInfo,
              guestUpload: guestConfig
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // 未认证，要求登录
          return new Response(JSON.stringify({
            authenticated: false,
            authRequired: true,
            message: '需要登录',
            guestUpload: guestConfig
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (e) {
        console.error('Auth check admin data error:', e);
      }

      // 没有用户数据，无需登录
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
              userInfo = { id: user.id, username: user.username, nickname: user.nickname || '', avatar: user.avatar || '', role: user.role };
            } else {
              // 可能是 env 变量用户
              userInfo = { id: 'env_admin', username: sessionData.user, role: 'admin', nickname: '管理员', avatar: '' };
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
