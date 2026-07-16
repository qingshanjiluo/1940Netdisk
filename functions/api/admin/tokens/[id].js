import {
  deleteApiToken,
  updateApiToken,
} from '../../../utils/api-token.js';
import { apiError, apiSuccess, decodePathParam } from '../../../utils/api-v1.js';

export async function onRequest(context) {
  const { request, params, env } = context;
  const tokenId = decodePathParam(params?.id || '');

  if (!tokenId) {
    return apiError('VALIDATION_ERROR', 'Token id is required.', 400);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (request.method === 'PATCH') {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    try {
      const patch = {};
      if (Object.prototype.hasOwnProperty.call(body, 'enabled')) {
        patch.enabled = body.enabled;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'name')) {
        patch.name = body.name;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'scopes')) {
        patch.scopes = body.scopes;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'expiresAt')) {
        patch.expiresAt = body.expiresAt;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'expires_in')) {
        const seconds = Number.parseInt(String(body.expires_in), 10);
        patch.expiresAt = Number.isFinite(seconds) && seconds > 0 ? Date.now() + seconds * 1000 : null;
      }

      if (Object.keys(patch).length === 0) {
        return apiError('VALIDATION_ERROR', 'No token fields provided to update.', 400);
      }

      const token = await updateApiToken(
        tokenId,
        patch,
        env
      );

      if (!token) {
        return apiError('TOKEN_NOT_FOUND', 'API Token not found.', 404);
      }

      return apiSuccess({ token });
    } catch (error) {
      return apiError('TOKEN_UPDATE_FAILED', error.message || 'Failed to update API Token.', 400);
    }
  }

  if (request.method === 'DELETE') {
    const deleted = await deleteApiToken(tokenId, env);
    if (!deleted) {
      return apiError('TOKEN_NOT_FOUND', 'API Token not found.', 404);
    }
    return apiSuccess({ deleted: true });
  }

  return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
}
