import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { githubRouter } from './routes/github.js';
import { repositoriesRouter } from './routes/repositories.js';
import { authRouter } from './routes/auth.js';
import { workspaceRouter } from './routes/workspace.js';
import { investigationsRouter } from './routes/investigations.js';
import { notesRouter } from './routes/notes.js';
import { bookmarksRouter } from './routes/bookmarks.js';
import { aiRouter } from './routes/ai.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app: Express = express();

  // 1. Security Headers (nosniff, frame denial, xss protection, referrer policy, hsts)
  app.use((_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (env.nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // 2. CORS restricted to frontend origin(s)
  const allowedOrigins = env.corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, same-origin, test runners)
        if (!requestOrigin) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(requestOrigin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        // Disallowed origin: deny cleanly
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());

  // Mount routes (supporting both with and without /api prefix for proxy/serverless flexibility)
  app.use('/api/health', healthRouter);
  app.use('/health', healthRouter);
  app.use('/api/github', githubRouter);
  app.use('/github', githubRouter);
  app.use('/api/repositories', repositoriesRouter);
  app.use('/repositories', repositoriesRouter);
  app.use('/api/auth', authRouter);
  app.use('/auth', authRouter);
  app.use('/api/workspace', workspaceRouter);
  app.use('/workspace', workspaceRouter);
  app.use('/api/investigations', investigationsRouter);
  app.use('/investigations', investigationsRouter);
  app.use('/api/notes', notesRouter);
  app.use('/notes', notesRouter);
  app.use('/api/bookmarks', bookmarksRouter);
  app.use('/bookmarks', bookmarksRouter);
  app.use('/api/ai', aiRouter);
  app.use('/ai', aiRouter);


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

// Only start the HTTP listener when running directly in local Node, not on Vercel or in tests
const isServerless = Boolean(process.env['VERCEL'] || process.env['AWS_LAMBDA_FUNCTION_NAME']);
if (process.env['NODE_ENV'] !== 'test' && !isServerless) {
  app.listen(env.port, (): void => {
    console.log(`[GitExplore Backend] Server running on port ${env.port} (${env.nodeEnv})`);
    console.log(`[GitExplore Backend] Health check: http://localhost:${env.port}/api/health`);
  });
}

// Export callable app compatible with both ES Modules and Vercel CommonJS handler expectations
try {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Object.assign(app, { createApp, default: app });
  }
} catch {
  // Ignored in strict ESM runtime environments
}

export default app;




