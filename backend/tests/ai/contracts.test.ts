import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAIResponse,
  cleanJsonContent,
} from '../../src/ai/schemas/index.js';
import {
  computeContextHash,
  getCachedAnalysis,
  storeCachedAnalysis,
  withAICache,
  DEFAULT_AI_CACHE_TTLS,
} from '../../src/ai/cache.js';
import {
  REPOSITORY_OVERVIEW_PROMPT_VERSION,
  COMMIT_EXPLANATION_PROMPT_VERSION,
  DIFF_REVIEW_PROMPT_VERSION,
  BRANCH_ANALYSIS_PROMPT_VERSION,
  REPOSITORY_HEALTH_PROMPT_VERSION,
  REPOSITORY_QA_PROMPT_VERSION,
  resolvePrompt,
} from '../../src/ai/prompts/index.js';
import { AIInvalidResponseError } from '../../src/ai/types.js';
import * as aiAnalysisRepo from '../../src/repositories/aiAnalysisRepository.js';
import { AnalysisType as PrismaAnalysisType, type AIAnalysis } from '@prisma/client';

// Mock repository functions for isolated cache testing
vi.mock('../../src/repositories/aiAnalysisRepository.js', () => ({
  createAIAnalysis: vi.fn(),
  findAIAnalysisByContextHash: vi.fn(),
}));

describe('D9-P3: AI Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Schema Validation Contract Tests (All 6 Analysis Types + Adversarial)
  // =========================================================================
  describe('1. Schema Validation Contracts', () => {
    describe('REPOSITORY_OVERVIEW contract', () => {
      const validPayload = {
        summary: 'Production-ready Git intelligence engine',
        primaryStack: ['TypeScript', 'Express', 'React', 'Prisma'],
        activityLevel: 'HIGH' as const,
        architectureObservations: ['Decoupled modular layers', 'Clean repository patterns'],
        hotspotAnalysis: {
          criticalFiles: ['backend/src/ai/cache.ts', 'src/pages/Workspace.tsx'],
          observations: 'Frequent feature iterations and test hardening',
        },
        growthTrajectory: 'ACCELERATING' as const,
        keyTakeaways: ['High test fidelity', 'Resilient error recovery'],
      };

      it('accepts compliant structured payload', () => {
        const validated = validateAIResponse('REPOSITORY_OVERVIEW', validPayload);
        expect(validated.summary).toBe(validPayload.summary);
        expect(validated.activityLevel).toBe('HIGH');
        expect(validated.primaryStack).toHaveLength(4);
      });

      it('accepts markdown-wrapped JSON code fence', () => {
        const markdownWrapped = `\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\``;
        const validated = validateAIResponse('REPOSITORY_OVERVIEW', markdownWrapped);
        expect(validated.summary).toBe(validPayload.summary);
      });

      it('adversarially rejects invalid activityLevel enum', () => {
        const invalid = { ...validPayload, activityLevel: 'EXTREME' };
        expect(() => validateAIResponse('REPOSITORY_OVERVIEW', invalid)).toThrow(
          AIInvalidResponseError
        );
      });

      it('adversarially rejects missing required keyTakeaways', () => {
        const invalid = { ...validPayload, keyTakeaways: [] };
        expect(() => validateAIResponse('REPOSITORY_OVERVIEW', invalid)).toThrow(
          AIInvalidResponseError
        );
      });
    });

    describe('COMMIT_EXPLANATION contract', () => {
      const validPayload = {
        intent: 'FEATURE' as const,
        summary: 'Integrated contract test suite for AI layer boundary',
        technicalImpact: 'Ensures absolute adherence to interface contracts and prevents payload regressions',
        modifiedComponents: [
          {
            filename: 'backend/tests/ai/contracts.test.ts',
            summary: 'Added rigorous contract validation test suite',
            riskLevel: 'LOW' as const,
          },
        ],
        potentialRisks: ['Slight execution overhead during CI runs'],
        isBreakingChange: false,
      };

      it('accepts compliant commit explanation payload', () => {
        const validated = validateAIResponse('COMMIT_EXPLANATION', validPayload);
        expect(validated.intent).toBe('FEATURE');
        expect(validated.isBreakingChange).toBe(false);
      });

      it('adversarially rejects unallowed riskLevel values in modifiedComponents', () => {
        const invalid = {
          ...validPayload,
          modifiedComponents: [
            {
              filename: 'test.ts',
              summary: 'test',
              riskLevel: 'APOCALYPTIC',
            },
          ],
        };
        expect(() => validateAIResponse('COMMIT_EXPLANATION', invalid)).toThrow(
          AIInvalidResponseError
        );
      });

      it('adversarially rejects empty technicalImpact', () => {
        const invalid = { ...validPayload, technicalImpact: '' };
        expect(() => validateAIResponse('COMMIT_EXPLANATION', invalid)).toThrow(
          AIInvalidResponseError
        );
      });
    });

    describe('DIFF_REVIEW contract', () => {
      const validPayload = {
        overallAssessment: 'APPROVED' as const,
        summary: 'Excellent test implementation adhering to contract specifications',
        netChangesSummary: '+210 lines in test suite',
        fileReviews: [
          {
            filename: 'backend/tests/ai/contracts.test.ts',
            status: 'added' as const,
            feedback: 'Exhaustive coverage of AI boundary',
            issuesFound: [],
          },
        ],
        riskFactors: [],
        recommendations: ['Maintain strict schema validation in production'],
      };

      it('accepts compliant diff review payload', () => {
        const validated = validateAIResponse('DIFF_REVIEW', validPayload);
        expect(validated.overallAssessment).toBe('APPROVED');
        expect(validated.fileReviews[0].status).toBe('added');
      });

      it('adversarially rejects unknown overallAssessment enum', () => {
        const invalid = { ...validPayload, overallAssessment: 'MAYBE_LATER' };
        expect(() => validateAIResponse('DIFF_REVIEW', invalid)).toThrow(
          AIInvalidResponseError
        );
      });
    });

    describe('BRANCH_ANALYSIS contract', () => {
      const validPayload = {
        divergenceSummary: 'Branch is 5 commits ahead and 0 behind main',
        syncStatus: 'AHEAD' as const,
        mergeReadiness: 'READY' as const,
        keyContributions: ['Contract testing', 'Validation boundary'],
        mainAuthors: ['H4MZA'],
        riskFactors: [],
        recommendations: ['Safe for fast-forward or squash merge'],
      };

      it('accepts compliant branch analysis payload', () => {
        const validated = validateAIResponse('BRANCH_ANALYSIS', validPayload);
        expect(validated.syncStatus).toBe('AHEAD');
        expect(validated.mergeReadiness).toBe('READY');
      });

      it('adversarially rejects invalid syncStatus enum', () => {
        const invalid = { ...validPayload, syncStatus: 'OUT_OF_SYNC' };
        expect(() => validateAIResponse('BRANCH_ANALYSIS', invalid)).toThrow(
          AIInvalidResponseError
        );
      });
    });

    describe('REPOSITORY_HEALTH contract', () => {
      const validPayload = {
        healthGrade: 'A' as const,
        vitalityStatus: 'THRIVING' as const,
        summary: 'Active development velocity with zero critical technical debt',
        trajectoryAssessment: 'Stable sustained delivery across recent milestones',
        maintenanceRisks: [],
        codeChurnHotspots: ['backend/src/ai/cache.ts'],
        actionableRecommendations: ['Continue automated test expansion'],
      };

      it('accepts compliant repository health payload', () => {
        const validated = validateAIResponse('REPOSITORY_HEALTH', validPayload);
        expect(validated.healthGrade).toBe('A');
        expect(validated.vitalityStatus).toBe('THRIVING');
      });

      it('adversarially rejects invalid healthGrade enum', () => {
        const invalid = { ...validPayload, healthGrade: 'Z' };
        expect(() => validateAIResponse('REPOSITORY_HEALTH', invalid)).toThrow(
          AIInvalidResponseError
        );
      });
    });

    describe('REPOSITORY_QA contract', () => {
      const validPayload = {
        answer: 'The repository implements a layered architectural boundary with Vitest contract verification.',
        confidence: 'HIGH' as const,
        supportingEvidence: [
          'contracts.test.ts',
          'schemas/index.ts',
          'cache.ts',
        ],
        limitations: null,
        suggestedFollowUps: ['Run vitest to verify test execution', 'Inspect test coverage metrics'],
      };

      it('accepts compliant repository QA payload with evidence', () => {
        const validated = validateAIResponse('REPOSITORY_QA', validPayload);
        expect(validated.confidence).toBe('HIGH');
        expect(validated.supportingEvidence).toHaveLength(3);
        expect(validated.answer).toContain('Vitest');
      });

      it('adversarially rejects invalid confidence enum', () => {
        const invalid = { ...validPayload, confidence: 'CERTAIN' };
        expect(() => validateAIResponse('REPOSITORY_QA', invalid)).toThrow(
          AIInvalidResponseError
        );
      });

      it('adversarially rejects non-string answer', () => {
        const invalid = { ...validPayload, answer: 12345 };
        expect(() => validateAIResponse('REPOSITORY_QA', invalid)).toThrow(
          AIInvalidResponseError
        );
      });
    });

    describe('CUSTOM and Edge Sanitization contracts', () => {
      it('validates custom object dictionaries cleanly', () => {
        const custom = { customResult: true, count: 42 };
        const validated = validateAIResponse('CUSTOM', custom);
        expect(validated).toEqual(custom);
      });

      it('adversarially rejects primitive values for CUSTOM type', () => {
        expect(() => validateAIResponse('CUSTOM', 'plain string')).toThrow(
          AIInvalidResponseError
        );
        expect(() => validateAIResponse('CUSTOM', 100)).toThrow(
          AIInvalidResponseError
        );
      });

      it('correctly handles code fence cleanup without language identifier', () => {
        const raw = '```\n{"test": 123}\n```';
        expect(cleanJsonContent(raw)).toBe('{"test": 123}');
      });
    });
  });

  // =========================================================================
  // 2. Cache Hit / Miss / TTL Contract Tests
  // =========================================================================
  describe('2. Cache Hit & Miss Contracts', () => {
    it('returns null on cache miss for unrecorded context hash', async () => {
      vi.mocked(aiAnalysisRepo.findAIAnalysisByContextHash).mockResolvedValue(null);

      const cached = await getCachedAnalysis('non-existent-hash-12345');
      expect(cached).toBeNull();
      expect(aiAnalysisRepo.findAIAnalysisByContextHash).toHaveBeenCalledWith(
        'non-existent-hash-12345',
        expect.any(Date)
      );
    });

    it('returns structured result on cache hit with metadata intact', async () => {
      const mockDbRecord: AIAnalysis = {
        id: 'analysis-contract-1',
        repositoryId: 'repo-abc',
        analysisType: PrismaAnalysisType.OVERVIEW,
        contextHash: 'valid-context-hash-67890',
        prompt: 'Repository overview prompt',
        response: { summary: 'Cached overview' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 120, completionTokens: 60, totalTokens: 180 },
        createdAt: new Date('2026-10-01T00:00:00Z'),
        expiresAt: new Date(Date.now() + 3600000),
      };

      vi.mocked(aiAnalysisRepo.findAIAnalysisByContextHash).mockResolvedValue(mockDbRecord);

      const cached = await getCachedAnalysis<{ summary: string }>('valid-context-hash-67890');
      expect(cached).not.toBeNull();
      expect(cached?.id).toBe('analysis-contract-1');
      expect(cached?.data.summary).toBe('Cached overview');
      expect(cached?.tokenUsage.totalTokens).toBe(180);
      expect(cached?.provider).toBe('gemini');
    });

    it('enforces TTL contract: expired records are rejected', async () => {
      // When expiresAt < now, repository query finds no record or filters it out
      vi.mocked(aiAnalysisRepo.findAIAnalysisByContextHash).mockResolvedValue(null);

      const now = new Date('2026-10-08T00:00:00Z');
      const cached = await getCachedAnalysis('expired-hash', now);
      expect(cached).toBeNull();
      expect(aiAnalysisRepo.findAIAnalysisByContextHash).toHaveBeenCalledWith('expired-hash', now);
    });

    it('withAICache orchestrator returns cached hit without invoking fetcher', async () => {
      const mockRecord: AIAnalysis = {
        id: 'analysis-hit-2',
        repositoryId: null,
        analysisType: PrismaAnalysisType.COMMIT,
        contextHash: 'cached-context-hash',
        prompt: 'Commit explanation prompt',
        response: { intent: 'REFACTOR' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      };

      vi.mocked(aiAnalysisRepo.findAIAnalysisByContextHash).mockResolvedValue(mockRecord);

      const fetcher = vi.fn();
      const result = await withAICache({
        type: 'COMMIT_EXPLANATION',
        context: { commitSha: 'abcdef' },
        prompt: 'Commit explanation prompt',
        promptVersion: '1.0.0',
        fetcher,
      });

      expect(result.cached).toBe(true);
      expect(result.data).toEqual({ intent: 'REFACTOR' });
      expect(result.analysisId).toBe('analysis-hit-2');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('withAICache orchestrator executes fetcher and persists on cache miss', async () => {
      vi.mocked(aiAnalysisRepo.findAIAnalysisByContextHash).mockResolvedValue(null);
      vi.mocked(aiAnalysisRepo.createAIAnalysis).mockResolvedValue({
        id: 'new-persisted-analysis',
        repositoryId: null,
        analysisType: PrismaAnalysisType.HEALTH,
        contextHash: 'new-hash',
        prompt: 'Health prompt',
        response: { healthGrade: 'A' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 80, completionTokens: 40, totalTokens: 120 },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + DEFAULT_AI_CACHE_TTLS.REPOSITORY_HEALTH),
      });

      const fetcher = vi.fn().mockResolvedValue({
        data: { healthGrade: 'A' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 80, completionTokens: 40, totalTokens: 120 },
      });

      const result = await withAICache({
        type: 'REPOSITORY_HEALTH',
        context: { repo: 'gitexplore' },
        prompt: 'Health prompt',
        promptVersion: '1.0.0',
        fetcher,
      });

      expect(result.cached).toBe(false);
      expect(result.data).toEqual({ healthGrade: 'A' });
      expect(result.analysisId).toBe('new-persisted-analysis');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(aiAnalysisRepo.createAIAnalysis).toHaveBeenCalledTimes(1);
    });

    it('withAICache bypasses cache when bypassCache: true is requested', async () => {
      vi.mocked(aiAnalysisRepo.findAIAnalysisByContextHash).mockResolvedValue({
        id: 'stale-analysis',
        repositoryId: null,
        analysisType: PrismaAnalysisType.OVERVIEW,
        contextHash: 'bypass-hash',
        prompt: 'Overview prompt',
        response: { summary: 'Old stale summary' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      });

      vi.mocked(aiAnalysisRepo.createAIAnalysis).mockResolvedValue({
        id: 'fresh-analysis',
        repositoryId: null,
        analysisType: PrismaAnalysisType.OVERVIEW,
        contextHash: 'bypass-hash',
        prompt: 'Overview prompt',
        response: { summary: 'Freshly analyzed summary' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 30, completionTokens: 20, totalTokens: 50 },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      });

      const fetcher = vi.fn().mockResolvedValue({
        data: { summary: 'Freshly analyzed summary' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 30, completionTokens: 20, totalTokens: 50 },
      });

      const result = await withAICache({
        type: 'REPOSITORY_OVERVIEW',
        context: { repo: 'gitexplore' },
        prompt: 'Overview prompt',
        bypassCache: true,
        fetcher,
      });

      expect(result.cached).toBe(false);
      expect(result.data).toEqual({ summary: 'Freshly analyzed summary' });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(aiAnalysisRepo.findAIAnalysisByContextHash).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Prompt Version Invalidation Contract Tests
  // =========================================================================
  describe('3. Prompt Version Invalidation Contracts', () => {
    const staticContext = {
      repository: { owner: 'h4mcodes', name: 'gitexplore' },
      branch: 'main',
    };

    it('changing prompt version produces a completely different context hash', () => {
      const hashV1 = computeContextHash('REPOSITORY_OVERVIEW', staticContext, '1.0.0');
      const hashV2 = computeContextHash('REPOSITORY_OVERVIEW', staticContext, '2.0.0');
      const hashPatch = computeContextHash('REPOSITORY_OVERVIEW', staticContext, '1.0.1');

      expect(hashV1).not.toBe(hashV2);
      expect(hashV1).not.toBe(hashPatch);
      expect(hashV2).not.toBe(hashPatch);
    });

    it('prompt version changes invalidate cached lookups in withAICache', async () => {
      const hashV1 = computeContextHash('DIFF_REVIEW', staticContext, '1.0.0');
      const hashV2 = computeContextHash('DIFF_REVIEW', staticContext, '2.0.0');

      // V1 is cached in DB
      vi.mocked(aiAnalysisRepo.findAIAnalysisByContextHash).mockImplementation(
        async (hash) => {
          if (hash === hashV1) {
            return {
              id: 'cached-v1-id',
              repositoryId: null,
              analysisType: PrismaAnalysisType.DIFF,
              contextHash: hashV1,
              prompt: 'Diff prompt v1',
              response: { overallAssessment: 'APPROVED' },
              provider: 'gemini',
              modelId: 'gemini-1.5-flash',
              tokenUsage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 100000),
            };
          }
          return null;
        }
      );

      vi.mocked(aiAnalysisRepo.createAIAnalysis).mockResolvedValue({
        id: 'new-v2-id',
        repositoryId: null,
        analysisType: PrismaAnalysisType.DIFF,
        contextHash: hashV2,
        prompt: 'Diff prompt v2',
        response: { overallAssessment: 'NEEDS_CHANGES' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 15, completionTokens: 12, totalTokens: 27 },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      });

      // Calling with promptVersion 1.0.0 produces a cache hit
      const fetcherV1 = vi.fn();
      const resultV1 = await withAICache({
        type: 'DIFF_REVIEW',
        context: staticContext,
        prompt: 'Diff prompt v1',
        promptVersion: '1.0.0',
        fetcher: fetcherV1,
      });
      expect(resultV1.cached).toBe(true);
      expect(resultV1.analysisId).toBe('cached-v1-id');
      expect(fetcherV1).not.toHaveBeenCalled();

      // Calling with promptVersion 2.0.0 invalidates the cache and executes fetcher
      const fetcherV2 = vi.fn().mockResolvedValue({
        data: { overallAssessment: 'NEEDS_CHANGES' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 15, completionTokens: 12, totalTokens: 27 },
      });

      const resultV2 = await withAICache({
        type: 'DIFF_REVIEW',
        context: staticContext,
        prompt: 'Diff prompt v2',
        promptVersion: '2.0.0',
        fetcher: fetcherV2,
      });
      expect(resultV2.cached).toBe(false);
      expect(resultV2.analysisId).toBe('new-v2-id');
      expect(fetcherV2).toHaveBeenCalledTimes(1);
    });

    it('verifies all prompt builders export valid semantic version contracts', () => {
      const semverRegex = /^\d+\.\d+\.\d+$/;

      expect(REPOSITORY_OVERVIEW_PROMPT_VERSION).toMatch(semverRegex);
      expect(COMMIT_EXPLANATION_PROMPT_VERSION).toMatch(semverRegex);
      expect(DIFF_REVIEW_PROMPT_VERSION).toMatch(semverRegex);
      expect(BRANCH_ANALYSIS_PROMPT_VERSION).toMatch(semverRegex);
      expect(REPOSITORY_HEALTH_PROMPT_VERSION).toMatch(semverRegex);
      expect(REPOSITORY_QA_PROMPT_VERSION).toMatch(semverRegex);
    });

    it('resolvePrompt dispatcher binds the correct version to each prompt payload', () => {
      const overviewPrompt = resolvePrompt('REPOSITORY_OVERVIEW', staticContext);
      expect(overviewPrompt.version).toBe(REPOSITORY_OVERVIEW_PROMPT_VERSION);

      const commitPrompt = resolvePrompt('COMMIT_EXPLANATION', { commit: { sha: '123' } });
      expect(commitPrompt.version).toBe(COMMIT_EXPLANATION_PROMPT_VERSION);

      const diffPrompt = resolvePrompt('DIFF_REVIEW', { files: [] });
      expect(diffPrompt.version).toBe(DIFF_REVIEW_PROMPT_VERSION);

      const branchPrompt = resolvePrompt('BRANCH_ANALYSIS', { branchComparison: {} });
      expect(branchPrompt.version).toBe(BRANCH_ANALYSIS_PROMPT_VERSION);

      const healthPrompt = resolvePrompt('REPOSITORY_HEALTH', { activityMetrics: {} });
      expect(healthPrompt.version).toBe(REPOSITORY_HEALTH_PROMPT_VERSION);

      const qaPrompt = resolvePrompt('REPOSITORY_QA', { question: 'What is this repo?' });
      expect(qaPrompt.version).toBe(REPOSITORY_QA_PROMPT_VERSION);
    });
  });
});
