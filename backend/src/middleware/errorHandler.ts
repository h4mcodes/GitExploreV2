import { Request, Response, NextFunction } from 'express';
import { AppError, ApiErrorResponse } from '../types/api.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<ApiErrorResponse>,
  _next: NextFunction
): void {
  // Handle known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  // Handle JSON parse errors from body-parser
  if (err instanceof SyntaxError && 'status' in err && (err as { status: unknown }).status === 400) {
    res.status(400).json({
      error: 'Malformed JSON payload in request body',
      code: 'INVALID_JSON',
    });
    return;
  }

  // Handle Prisma database connection / service outages
  if (
    err &&
    typeof err === 'object' &&
    ('name' in err || 'code' in err) &&
    ((err as { name?: string }).name === 'PrismaClientInitializationError' ||
     (err as { code?: string }).code === 'P1001' ||
     (err as { code?: string }).code === 'P1002' ||
     (err as { code?: string }).code === 'P1003' ||
     (err as { code?: string }).code === 'P1017')
  ) {
    res.status(503).json({
      error: 'Database connection failed or service unavailable',
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }

  // Log unhandled server errors
  console.error('[Unhandled Error]', err);

  const isProduction = env.nodeEnv === 'production';
  const errorMessage = isProduction
    ? 'An unexpected internal server error occurred'
    : err instanceof Error
      ? err.message
      : 'Unknown error';

  res.status(500).json({
    error: errorMessage,
    code: 'INTERNAL_SERVER_ERROR',
    ...(!isProduction && err instanceof Error && err.stack ? { details: err.stack } : {}),
  });
}

export function notFoundHandler(req: Request, res: Response<ApiErrorResponse>): void {
  res.status(404).json({
    error: `Cannot ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  });
}
