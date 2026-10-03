import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createAIProvider,
  getAIProvider,
  setAIProvider,
  resetAIProvider,
} from '../../src/ai/provider.js';
import { GeminiProvider } from '../../src/ai/providers/geminiProvider.js';
import { MockAIProvider } from '../../src/ai/providers/mockProvider.js';
import {
  AIConfigurationError,
  AIRateLimitError,
  AITimeoutError,
  AIProviderError,
  AIAnalysisRequest,
} from '../../src/ai/types.js';

describe('AI Provider Abstraction & Gemini Provider (D6-P1)', () => {
  beforeEach(() => {
    resetAIProvider();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetAIProvider();
    vi.restoreAllMocks();
  });

  describe('Provider Factory & Interface Boundary', () => {
    it('creates a GeminiProvider by default when provider is "gemini"', () => {
      const provider = createAIProvider('gemini', { apiKey: 'test-gemini-key' });
      expect(provider).toBeInstanceOf(GeminiProvider);
      expect(provider.name).toBe('gemini');
      expect(provider.model).toBe('gemini-1.5-flash');
    });

    it('creates a MockAIProvider when provider is "mock"', () => {
      const provider = createAIProvider('mock');
      expect(provider).toBeInstanceOf(MockAIProvider);
      expect(provider.name).toBe('mock');
      expect(provider.isAvailable()).toBe(true);
    });

    it('throws AIConfigurationError for unsupported provider name', () => {
      expect(() => createAIProvider('unsupported-llm')).toThrowError(AIConfigurationError);
    });

    it('manages singleton provider lifecycle via getAIProvider and setAIProvider', () => {
      const customMock = new MockAIProvider({ model: 'custom-test-model' });
      setAIProvider(customMock);

      const active = getAIProvider();
      expect(active).toBe(customMock);
      expect(active.model).toBe('custom-test-model');

      resetAIProvider();
      const defaultProvider = getAIProvider();
      expect(defaultProvider).toBeInstanceOf(GeminiProvider);
    });
  });

  describe('GeminiProvider Adapter', () => {
    const sampleRequest: AIAnalysisRequest = {
      type: 'REPOSITORY_OVERVIEW',
      context: {
        owner: 'facebook',
        name: 'react',
        stars: 230000,
        language: 'JavaScript',
      },
      prompt: 'Provide a structured architectural overview of this repository.',
      temperature: 0.1,
      maxTokens: 1024,
    };

    it('reports isAvailable = false and validation failure when API key is missing', () => {
      const provider = new GeminiProvider({ apiKey: undefined });
      expect(provider.isAvailable()).toBe(false);

      const validation = provider.validateConfiguration();
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('GEMINI_API_KEY');
    });

    it('reports isAvailable = true when API key is configured', () => {
      const provider = new GeminiProvider({ apiKey: 'valid-test-key-123' });
      expect(provider.isAvailable()).toBe(true);

      const validation = provider.validateConfiguration();
      expect(validation.valid).toBe(true);
    });

    it('rejects analysis with AIConfigurationError if API key is not configured', async () => {
      const provider = new GeminiProvider({ apiKey: '' });
      await expect(provider.analyze(sampleRequest)).rejects.toThrowError(AIConfigurationError);
    });

    it('successfully calls Gemini API and returns structured AIRawResponse', async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    purpose: 'A declarative UI library for web applications',
                    techStack: ['JavaScript', 'Flow', 'Rust'],
                    activityLevel: 'High',
                  }),
                },
              ],
              role: 'model',
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 140,
          candidatesTokenCount: 85,
          totalTokenCount: 225,
        },
        modelVersion: 'gemini-1.5-flash',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockGeminiResponse,
      } as Response);

      const provider = new GeminiProvider({
        apiKey: 'secure-gemini-key',
        model: 'gemini-1.5-flash',
        baseUrl: 'https://generativelanguage.googleapis.com',
      });

      const response = await provider.analyze(sampleRequest);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions] = fetchSpy.mock.calls[0]!;

      // Verify endpoint and model
      expect(calledUrl.toString()).toContain('/v1beta/models/gemini-1.5-flash:generateContent');
      // Verify API key is transmitted via x-goog-api-key header and NOT in the URL
      expect(calledUrl.toString()).not.toContain('secure-gemini-key');
      expect(calledOptions?.headers).toMatchObject({
        'Content-Type': 'application/json',
        'x-goog-api-key': 'secure-gemini-key',
      });

      // Verify returned parsed structure
      expect(response.provider).toBe('gemini');
      expect(response.model).toBe('gemini-1.5-flash');
      expect(response.content).toContain('declarative UI library');
      expect(response.tokenUsage).toEqual({
        promptTokens: 140,
        completionTokens: 85,
        totalTokens: 225,
      });
      expect(response.finishReason).toBe('STOP');
    });

    it('maps HTTP 401/403 to AIConfigurationError', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'API_KEY_INVALID' } }),
      } as Response);

      const provider = new GeminiProvider({ apiKey: 'invalid-key' });
      await expect(provider.analyze(sampleRequest)).rejects.toThrowError(AIConfigurationError);
    });

    it('maps HTTP 429 to AIRateLimitError', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'RESOURCE_EXHAUSTED' } }),
      } as Response);

      const provider = new GeminiProvider({ apiKey: 'rate-limited-key' });
      await expect(provider.analyze(sampleRequest)).rejects.toThrowError(AIRateLimitError);
    });

    it('maps HTTP 503 to AIProviderError with 503 code', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: 'Service Unavailable' } }),
      } as Response);

      const provider = new GeminiProvider({ apiKey: 'test-key' });
      await expect(provider.analyze(sampleRequest)).rejects.toThrowError(AIProviderError);
    });

    it('sanitizes error message so that no key parameter leaks in errors', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid parameter key=AIzaSySecretKey123 in payload' } }),
      } as Response);

      const provider = new GeminiProvider({ apiKey: 'test-key' });
      try {
        await provider.analyze(sampleRequest);
        expect.unreachable('Should have thrown error');
      } catch (err) {
        expect(err).toBeInstanceOf(AIProviderError);
        expect((err as Error).message).not.toContain('AIzaSySecretKey123');
        expect((err as Error).message).toContain('key=REDACTED');
      }
    });

    it('handles request timeout safely with AITimeoutError', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const provider = new GeminiProvider({ apiKey: 'test-key', timeoutMs: 100 });
      await expect(provider.analyze(sampleRequest)).rejects.toThrowError(AITimeoutError);
    });
  });

  describe('MockAIProvider for Offline / Test Environments', () => {
    it('executes analysis and returns predictable mock content', async () => {
      const mockProvider = new MockAIProvider({ model: 'mock-test' });
      const response = await mockProvider.analyze({
        type: 'COMMIT_EXPLANATION',
        context: { commitSha: 'abc1234' },
        prompt: 'Explain commit',
      });

      expect(response.provider).toBe('mock');
      expect(response.model).toBe('mock-test');
      expect(response.tokenUsage.totalTokens).toBe(150);
      expect(response.content).toContain('Mock analysis response for COMMIT_EXPLANATION');
    });

    it('supports custom response generators for deterministic integration tests', async () => {
      const mockProvider = new MockAIProvider();
      mockProvider.setMockResponse(() => JSON.stringify({ customResult: true, verified: 1 }));

      const response = await mockProvider.analyze({
        type: 'DIFF_REVIEW',
        context: {},
        prompt: 'Review diff',
      });

      expect(JSON.parse(response.content)).toEqual({ customResult: true, verified: 1 });
    });
  });
});
