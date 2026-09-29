import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { githubRouter } from './routes/github.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app: Express = express();

  // Basic middleware
  app.use(
    cors({
      origin: env.corsOrigin === '*' ? true : env.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());

  // Mount routes
  app.use('/api/health', healthRouter);
  app.use('/api/github', githubRouter);

  // Root fallback
  app.get('/', (_req: Request, res: Response): void => {
    res.json({
      message: 'GitExplore V2 Backend API',
      health: '/api/health',
      status: 'active',
    });
  });

  // 404 Route Catch-All
  app.use(notFoundHandler);

  // Centralized Error Handling (Must be last)
  app.use(errorHandler);

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
