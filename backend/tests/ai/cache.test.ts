import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeContextHash,
  sortObjectKeys,
  getCachedAnalysis,
  storeCachedAnalysis,
  withAICache,
  DEFAULT_AI_CACHE_TTLS,
} from '../../src/ai/cache.js';
import * as aiAnalysisRepo from '../../src/repositories/aiAnalysisRepository.js';
import { AnalysisType as PrismaAnalysisType, type AIAnalysis } from '@prisma/client';

vi.mock('../../src/repositories/aiAnalysisRepository.js', () => ({
  createAIAnalysis: vi.fn(),
  findAIAnalysisByContextHash: vi.fn(),
}));

describe('AI Cache Layer (D6-P5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sortObjectKeys', () => {
    it('handles primitives, null, and undefined cleanly', () => {
      expect(sortObjectKeys(null)).toBeNull();
      expect(sortObjectKeys(undefined)).toBeUndefined();
      expect(sortObjectKeys(42)).toBe(42);
      expect(sortObjectKeys('string')).toBe('string');
    });

    it('sorts keys recursively in nested objects and arrays', () => {
      const input = {
        z: 1,
        a: {
          y: 2,
          b: 3,
        },
        arr: [{ d: 4, c: 5 }],
      };

      const sorted = sortObjectKeys(input) as Record<string, unknown>;
      expect(Object.keys(sorted)).toEqual(['a', 'arr', 'z']);
      expect(Object.keys(sorted.a as Record<string, unknown>)).toEqual(['b', 'y']);
      const arrItem = (sorted.arr as Array<Record<string, unknown>>)[0];
      expect(Object.keys(arrItem)).toEqual(['c', 'd']);
    });
  });

  describe('computeContextHash', () => {
    it('produces identical deterministic hash for same context regardless of key order', () => {
      const context1 = {
        repository: { name: 'gitexplore', owner: 'h4mcodes' },
        stars: 350,
        tags: ['react', 'ai'],
      };

      const context2 = {
        tags: ['react', 'ai'],
        stars: 350,
        repository: { owner: 'h4mcodes', name: 'gitexplore' },
      };

      const hash1 = computeContextHash('REPOSITORY_OVERVIEW', context1, '1.0.0');
      const hash2 = computeContextHash('REPOSITORY_OVERVIEW', context2, '1.0.0');

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces different hashes for different prompt versions', () => {
      const context = { repo: 'gitexplore' };
      const hashV1 = computeContextHash('REPOSITORY_OVERVIEW', context, '1.0.0');
      const hashV2 = computeContextHash('REPOSITORY_OVERVIEW', context, '1.1.0');

      expect(hashV1).not.toBe(hashV2);
    });

    it('produces different hashes for different analysis types', () => {
      const context = { repo: 'gitexplore' };
      const hash1 = computeContextHash('REPOSITORY_OVERVIEW', context, '1.0.0');
      const hash2 = computeContextHash('COMMIT_EXPLANATION', context, '1.0.0');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getCachedAnalysis', () => {
    it('returns formatted cache hit when record exists and is unexpired', async () => {
      const mockRecord: AIAnalysis = {
        id: 'analysis-123',
        repositoryId: null,
        analysisType: PrismaAnalysisType.OVERVIEW,
        contextHash: 'hash-abc',
        prompt: 'Overview prompt',
        response: { summary: 'Repository summary' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        createdAt: new Date('2026-03-01T12:00:00Z'),
        expiresAt: new Date(Date.now() + 100000),
      };

      vi.mocked(aiAnalysisRepo.findAIAnalysisByContextHash).mockResolvedValueOnce(mockRecord);

      const cached = await getCachedAnalysis<{ summary: string }>('hash-abc');
      expect(cached).not.toBeNull();
      expect(cached?.id).toBe('analysis-123');
      expect(cached?.data.summary).toBe('Repository summary');
      expect(cached?.provider).toBe('gemini');
    });

    it('returns null when no record exists in repository', async () => {
      vi.mocked(aiAnalysisRepo.findAIAnalysisByContextHash).mockResolvedValueOnce(null);

      const cached = await getCachedAnalysis('hash-missing');
      expect(cached).toBeNull();
    });
  });

  describe('storeCachedAnalysis', () => {
    it('calculates expiresAt based on analysis type default TTL and persists', async () => {
      const mockSaved: AIAnalysis = {
        id: 'new-id',
        repositoryId: 'repo-1',
        analysisType: PrismaAnalysisType.OVERVIEW,
        contextHash: 'hash-store',
        prompt: 'Overview prompt',
        response: { summary: 'Saved' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + DEFAULT_AI_CACHE_TTLS.REPOSITORY_OVERVIEW),
      };

      vi.mocked(aiAnalysisRepo.createAIAnalysis).mockResolvedValueOnce(mockSaved);

      const before = Date.now();
      const saved = await storeCachedAnalysis({
        type: 'REPOSITORY_OVERVIEW',
        contextHash: 'hash-store',
        prompt: 'Overview prompt',
        data: { summary: 'Saved' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
        repositoryId: 'repo-1',
      });

      expect(saved.id).toBe('new-id');
      expect(aiAnalysisRepo.createAIAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          contextHash: 'hash-store',
          provider: 'gemini',
          modelId: 'gemini-1.5-flash',
          expiresAt: expect.any(Date),
        })
      );

      const calledInput = vi.mocked(aiAnalysisRepo.createAIAnalysis).mock.calls[0][0];
      const expiry = calledInput.expiresAt?.getTime() || 0;
      expect(expiry).toBeGreaterThanOrEqual(before + DEFAULT_AI_CACHE_TTLS.REPOSITORY_OVERVIEW - 100);
    });
  });

  describe('withAICache orchestration', () => {
    it('returns cached analysis on cache hit without calling fetcher', async () => {
      const mockRecord: AIAnalysis = {
        id: 'analysis-hit',
        repositoryId: null,
        analysisType: PrismaAnalysisType.OVERVIEW,
        contextHash: computeContextHash('REPOSITORY_OVERVIEW', { repo: 'gitexplore' }, '1.0.0'),
        prompt: 'Prompt',
        response: { summary: 'Cached overview' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 80, completionTokens: 40, totalTokens: 120 },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      };

      vi.mocked(aiAnalysisRepo.findAIAnalysisByContextHash).mockResolvedValueOnce(mockRecord);

      const fetcherSpy = vi.fn();

      const result = await withAICache({
        type: 'REPOSITORY_OVERVIEW',
        context: { repo: 'gitexplore' },
        prompt: 'Prompt',
        fetcher: fetcherSpy,
      });

      expect(result.cached).toBe(true);
      expect(result.data).toEqual({ summary: 'Cached overview' });
      expect(result.analysisId).toBe('analysis-hit');
      expect(fetcherSpy).not.toHaveBeenCalled();
    });

    it('calls fetcher and caches result on cache miss', async () => {
      vi.mocked(aiAnalysisRepo.findAIAnalysisByContextHash).mockResolvedValueOnce(null);

      const mockSaved: AIAnalysis = {
        id: 'new-analysis-id',
        repositoryId: null,
        analysisType: PrismaAnalysisType.COMMIT,
        contextHash: computeContextHash('COMMIT_EXPLANATION', { sha: 'abc1234' }, '1.0.0'),
        prompt: 'Explain commit',
        response: { intent: 'BUGFIX' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 60, completionTokens: 30, totalTokens: 90 },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      };

      vi.mocked(aiAnalysisRepo.createAIAnalysis).mockResolvedValueOnce(mockSaved);

      const fetcher = vi.fn().mockResolvedValueOnce({
        data: { intent: 'BUGFIX' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 60, completionTokens: 30, totalTokens: 90 },
      });

      const result = await withAICache({
        type: 'COMMIT_EXPLANATION',
        context: { sha: 'abc1234' },
        prompt: 'Explain commit',
        fetcher,
      });

      expect(result.cached).toBe(false);
      expect(result.data).toEqual({ intent: 'BUGFIX' });
      expect(result.analysisId).toBe('new-analysis-id');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(aiAnalysisRepo.createAIAnalysis).toHaveBeenCalledTimes(1);
    });

    it('bypasses cache when bypassCache is true', async () => {
      const fetcher = vi.fn().mockResolvedValueOnce({
        data: { summary: 'Freshly fetched' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      });

      const mockSaved: AIAnalysis = {
        id: 'bypassed-id',
        repositoryId: null,
        analysisType: PrismaAnalysisType.OVERVIEW,
        contextHash: 'any',
        prompt: 'p',
        response: { summary: 'Freshly fetched' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        createdAt: new Date(),
        expiresAt: null,
      };

      vi.mocked(aiAnalysisRepo.createAIAnalysis).mockResolvedValueOnce(mockSaved);

      const result = await withAICache({
        type: 'REPOSITORY_OVERVIEW',
        context: { repo: 'gitexplore' },
        prompt: 'p',
        bypassCache: true,
        fetcher,
      });

      expect(result.cached).toBe(false);
      expect(aiAnalysisRepo.findAIAnalysisByContextHash).not.toHaveBeenCalled();
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });
});
