import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  isRetryableAIError,
  executeWithRetry,
  executeAIPipeline,
} from '../../src/controllers/aiController.js';
import {
  AITimeoutError,
  AIRateLimitError,
  AIProviderError,
  AIConfigurationError,
  AIInvalidResponseError,
} from '../../src/ai/types.js';
import { MockAIProvider } from '../../src/ai/providers/mockProvider.js';
import { setAIProvider, resetAIProvider } from '../../src/ai/provider.js';

describe('AI Failure & Error Hardening (D8-P6)', () => {
  const app = createApp();
  let mockProvider: MockAIProvider;

  beforeEach(() => {
    mockProvider = new MockAIProvider();
    setAIProvider(mockProvider);
  });

  afterEach(() => {
    resetAIProvider();
    vi.restoreAllMocks();
  });

  describe('isRetryableAIError', () => {
    it('identifies transient errors as retryable', () => {
      expect(isRetryableAIError(new AITimeoutError())).toBe(true);
      expect(isRetryableAIError(new AIRateLimitError())).toBe(true);
      expect(isRetryableAIError(new AIProviderError('503 Service Unavailable', 503))).toBe(true);
      expect(isRetryableAIError(new AIProviderError('502 Bad Gateway', 502))).toBe(true);
      expect(isRetryableAIError(new AIProviderError('504 Gateway Timeout', 504))).toBe(true);
      expect(isRetryableAIError(new AIProviderError('Network connection lost', 500, 'AI_NETWORK_ERROR'))).toBe(true);
      expect(isRetryableAIError(new Error('fetch failed: ECONNREFUSED'))).toBe(true);
      expect(isRetryableAIError(new Error('socket hang up: timeout'))).toBe(true);
    });

    it('identifies deterministic and configuration errors as non-retryable', () => {
      expect(isRetryableAIError(new AIConfigurationError())).toBe(false);
      expect(isRetryableAIError(new AIInvalidResponseError('Invalid JSON schema'))).toBe(false);
      expect(isRetryableAIError(new Error('Invalid user input parameters'))).toBe(false);
    });
  });

  describe('executeWithRetry', () => {
    it('succeeds on first attempt without retrying', async () => {
      const fn = vi.fn().mockResolvedValue('success-result');
      const result = await executeWithRetry(fn, 2, 0);

      expect(result).toBe('success-result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries transient failures and returns successfully when a retry succeeds', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new AITimeoutError('First attempt timed out'))
        .mockRejectedValueOnce(new AIProviderError('503 unavailable', 503))
        .mockResolvedValueOnce('eventual-success');

      const result = await executeWithRetry(fn, 3, 5);

      expect(result).toBe('eventual-success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('stops and throws original error when maxRetries is exceeded', async () => {
      const fn = vi.fn().mockRejectedValue(new AITimeoutError('Persistent timeout'));

      await expect(executeWithRetry(fn, 2, 5)).rejects.toThrow(AITimeoutError);
      expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('fails immediately without retrying for non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new AIConfigurationError('Missing API key'));

      await expect(executeWithRetry(fn, 2, 5)).rejects.toThrow(AIConfigurationError);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('AI Pipeline Execution Hardening', () => {
    it('propagates structured AITimeoutError when provider request times out', async () => {
      mockProvider.setSimulatedError(new AITimeoutError('Request exceeded 10000ms deadline'));

      await expect(
        executeAIPipeline({
          type: 'REPOSITORY_OVERVIEW',
          context: { owner: 'torvalds', repo: 'linux', stars: 180000 },
          bypassCache: true,
          maxRetries: 0,
        })
      ).rejects.toThrow(AITimeoutError);
    });

    it('catches schema validation failures as AIInvalidResponseError without retry', async () => {
      mockProvider.setMockResponse(() => 'This is plain text, not valid JSON');

      await expect(
        executeAIPipeline({
          type: 'REPOSITORY_OVERVIEW',
          context: { owner: 'torvalds', repo: 'linux' },
          bypassCache: true,
          maxRetries: 2,
        })
      ).rejects.toThrow(AIInvalidResponseError);
    });
  });

  describe('AI Route Rate Limiting', () => {
    it('sets standard rate limit headers on /api/ai endpoints', async () => {
      const res = await request(app).get('/api/ai/status');

      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });
  });
});
