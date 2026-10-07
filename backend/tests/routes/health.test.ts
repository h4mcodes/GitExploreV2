import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Health and System Routes', () => {
  const app = createApp();

  describe('GET /api/health', () => {
    it('returns 200 with service health payload, uptime, and timestamp', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('gitexplore-backend');
      expect(typeof res.body.uptime).toBe('number');
      expect(typeof res.body.timestamp).toBe('string');
      expect(res.body.environment).toBeDefined();
    });
  });

  describe('Route Not Found Handler', () => {
    it('returns 404 with ROUTE_NOT_FOUND code for unmapped paths', async () => {
      const res = await request(app).get('/api/completely-unknown-route');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ROUTE_NOT_FOUND');
      expect(res.body.error).toContain('Cannot GET /api/completely-unknown-route');
    });

    it('returns 404 for unsupported HTTP methods on valid route paths', async () => {
      const res = await request(app).delete('/api/health');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ROUTE_NOT_FOUND');
    });
  });
});
