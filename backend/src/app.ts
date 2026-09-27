import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';

export function createApp(): Express {
  const app: Express = express();

  // Basic middleware
  app.use(
    cors({
      origin: env.corsOrigin === '*' ? true : env.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json());

  // Mount routes
  app.use('/api/health', healthRouter);

  // Root fallback
  app.get('/', (_req: Request, res: Response): void => {
    res.json({
      message: 'GitExplore V2 Backend API',
      health: '/api/health',
      status: 'active',
    });
  });

  return app;
}

const app: Express = createApp();

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(env.port, (): void => {
    console.log(`[GitExplore Backend] Server running on port ${env.port} (${env.nodeEnv})`);
    console.log(`[GitExplore Backend] Health check: http://localhost:${env.port}/api/health`);
  });
}

export default app;
