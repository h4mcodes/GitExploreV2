import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyToken, AuthTokenPayload } from '../services/authService.js';
import { UnauthorizedError } from '../types/api.js';

// Extend Express Request namespace to include authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
      token?: string;
    }
  }
}

/**
 * Extracts Bearer token string from Authorization header.
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.trim().split(' ');
  if (parts.length === 2 && parts[0]?.toLowerCase() === 'bearer' && parts[1]) {
    return parts[1];
  }
  return null;
}

/**
 * Middleware that requires a valid, unexpired, non-revoked Bearer token.
 * Attaches decoded `req.user` and `req.token` on success.
 * Throws HTTP 401 UnauthorizedError if missing, invalid, or expired.
 */
export const requireAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedError(
        'Authentication required. Please provide a Bearer token in the Authorization header.',
        'AUTH_REQUIRED'
      );
    }

    const payload = verifyToken(token);
    req.user = payload;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware that optionally extracts user identity if valid Bearer token is provided,
 * but does not reject unauthenticated requests.
 */
export const optionalAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractBearerToken(req);
    if (token) {
      try {
        const payload = verifyToken(token);
        req.user = payload;
        req.token = token;
      } catch {
        // Ignored for optional auth
      }
    }
    next();
  } catch {
    next();
  }
};
