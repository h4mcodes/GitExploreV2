import { Router, Request, Response } from 'express';
import { env } from '../config/env.js';

export const healthRouter: Router = Router();

export interface HealthResponse {
  readonly status: 'ok';
  readonly timestamp: string;
  readonly service: string;
  readonly environment: 'development' | 'production' | 'test';
  readonly uptime: number;
}

healthRouter.get('/', (_req: Request, res: Response<HealthResponse>): void => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'gitexplore-backend',
    environment: env.nodeEnv,
    uptime: Math.floor(process.uptime()),
  });
});
