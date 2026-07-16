import {
  createApiToken,
  getApiTokenScopes,
  listApiTokens,
} from '../../utils/api-token.js';
import { apiError, apiSuccess, parsePositiveInt } from '../../utils/api-v1.js';

function normalizeExpiryInput(body = {}) {
  if (Object.prototype.hasOwnProperty.call(body, 'expiresAt')) {
    return body.expiresAt;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'expires_in')) {
    const seconds = parsePositiveInt(body.expires_in, { defaultValue: 0, min: 1, max: 3650 * 24 * 3600 });
    return seconds > 0 ? Date.now() + seconds * 1000 : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'expiresIn')) {
    const seconds = parsePositiveInt(body.expiresIn, { defaultValue: 0, min: 1, max: 3650 * 24 * 3600 });
    return seconds > 0 ? Date.now() + seconds * 1000 : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'expiresInDays')) {
    const days = parsePositiveInt(body.expiresInDays, { defaultValue: 0, min: 1, max: 3650 });
    return days > 0 ? Date.now() + days * 24 * 3600 * 1000 : null;
  }
  return null;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (request.method === 'GET') {
    const tokens = await listApiTokens(env);
    return apiSuccess({
      tokens,
      scopes: getApiTokenScopes(),
    });
  }

  if (request.method !== 'POST') {
    return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name = String(body?.name || body?.remark || '').trim();
  if (!name) {
    return apiError('VALIDATION_ERROR', 'Token name is required.', 400);
  }

  try {
    const created = await createApiToken(
      {
        name,
        scopes: body?.scopes || [],
        expiresAt: normalizeExpiryInput(body),
        enabled: body?.enabled !== false,
      },
      env
    );

    return apiSuccess(
      {
        token: created.token,
        tokenInfo: created.record,
      },
      201
    );
  } catch (error) {
    return apiError('TOKEN_CREATE_FAILED', error.message || 'Failed to create API Token.', 400);
  }
}
