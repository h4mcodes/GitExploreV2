import { describe, it, expect } from 'vitest';
import {
  validateAIResponse,
  cleanJsonContent,
  RepositoryOverviewResponseSchema,
  CommitExplanationResponseSchema,
  DiffReviewResponseSchema,
  BranchAnalysisResponseSchema,
  RepositoryHealthResponseSchema,
  RepositoryQAResponseSchema,
} from '../../src/ai/schemas/index.js';
import { AIInvalidResponseError } from '../../src/ai/types.js';

describe('AI Structured Response Validation (D6-P4)', () => {
  describe('cleanJsonContent utility', () => {
    it('strips ```json code fences cleanly', () => {
      const wrapped = '```json\n{"key": "value"}\n```';
      expect(cleanJsonContent(wrapped)).toBe('{"key": "value"}');
    });

    it('strips ``` code fences without language tag', () => {
      const wrapped = '```\n{"key": "value"}\n```';
      expect(cleanJsonContent(wrapped)).toBe('{"key": "value"}');
    });

    it('returns raw text unchanged if no code fences present', () => {
      const raw = '{"key": "value"}';
      expect(cleanJsonContent(raw)).toBe(raw);
    });
  });

  describe('Repository Overview Schema', () => {
    const validData = {
      summary: 'High-performance Git repository workbench',
      primaryStack: ['TypeScript', 'React', 'Node.js'],
      activityLevel: 'HIGH',
      architectureObservations: ['Modular repository pattern', 'Strict separation of concerns'],
      hotspotAnalysis: {
        criticalFiles: ['src/services/githubApi.ts'],
        observations: 'Frequent modifications around API caching layer',
      },
      growthTrajectory: 'ACCELERATING',
      keyTakeaways: ['High test coverage', 'Fast build times'],
    };

    it('validates correct repository overview data', () => {
      const parsed = validateAIResponse('REPOSITORY_OVERVIEW', validData);
      expect(parsed.summary).toBe(validData.summary);
      expect(parsed.activityLevel).toBe('HIGH');
    });

    it('validates stringified JSON with markdown code fence', () => {
      const stringified = `\`\`\`json\n${JSON.stringify(validData)}\n\`\`\``;
      const parsed = validateAIResponse('REPOSITORY_OVERVIEW', stringified);
      expect(parsed.primaryStack).toEqual(['TypeScript', 'React', 'Node.js']);
    });

    it('rejects invalid activityLevel enum', () => {
      const invalid = { ...validData, activityLevel: 'SUPER_ACTIVE' };
      expect(() => validateAIResponse('REPOSITORY_OVERVIEW', invalid)).toThrow(
        AIInvalidResponseError
      );
    });

    it('rejects missing keyTakeaways', () => {
      const invalid = { ...validData, keyTakeaways: [] };
      expect(() => validateAIResponse('REPOSITORY_OVERVIEW', invalid)).toThrow(
        AIInvalidResponseError
      );
    });
  });

  describe('Commit Explanation Schema', () => {
    const validData = {
      intent: 'FEATURE',
      summary: 'Added response validation layer',
      technicalImpact: 'Prevents invalid LLM payloads from reaching clients',
      modifiedComponents: [
        {
          filename: 'backend/src/ai/schemas/index.ts',
          summary: 'Created schema validator and Zod definitions',
          riskLevel: 'LOW',
        },
      ],
      potentialRisks: ['Slight parsing overhead'],
      isBreakingChange: false,
    };

    it('validates correct commit explanation', () => {
      const parsed = validateAIResponse('COMMIT_EXPLANATION', validData);
      expect(parsed.intent).toBe('FEATURE');
      expect(parsed.isBreakingChange).toBe(false);
    });

    it('rejects missing required technicalImpact', () => {
      const invalid = { ...validData, technicalImpact: '' };
      expect(() => validateAIResponse('COMMIT_EXPLANATION', invalid)).toThrow(
        AIInvalidResponseError
      );
    });
  });

  describe('Diff Review Schema', () => {
    const validData = {
      overallAssessment: 'APPROVED',
      summary: 'Clean architecture implementation',
      netChangesSummary: '+150 / -20 lines across 3 files',
      fileReviews: [
        {
          filename: 'backend/src/ai/schemas/diffReview.ts',
          status: 'added',
          feedback: 'Valid schema definitions',
          issuesFound: [],
        },
      ],
      riskFactors: [],
      recommendations: ['Ensure unit tests cover enum limits'],
    };

    it('validates correct diff review payload', () => {
      const parsed = validateAIResponse('DIFF_REVIEW', validData);
      expect(parsed.overallAssessment).toBe('APPROVED');
      expect(parsed.fileReviews).toHaveLength(1);
    });

    it('rejects invalid assessment value', () => {
      const invalid = { ...validData, overallAssessment: 'UNKNOWN' };
      expect(() => validateAIResponse('DIFF_REVIEW', invalid)).toThrow(
        AIInvalidResponseError
      );
    });
  });

  describe('Branch Analysis Schema', () => {
    const validData = {
      divergenceSummary: 'Head branch is 4 commits ahead of main',
      syncStatus: 'AHEAD',
      mergeReadiness: 'READY',
      keyContributions: ['AI Provider layer', 'Zod validation'],
      mainAuthors: ['Hamza'],
      riskFactors: [],
      recommendations: ['Squash and merge'],
    };

    it('validates correct branch analysis', () => {
      const parsed = validateAIResponse('BRANCH_ANALYSIS', validData);
      expect(parsed.syncStatus).toBe('AHEAD');
      expect(parsed.mergeReadiness).toBe('READY');
    });
  });

  describe('Repository Health Schema', () => {
    const validData = {
      healthGrade: 'A',
      vitalityStatus: 'THRIVING',
      summary: 'Healthy repository with consistent push frequency',
      trajectoryAssessment: 'Recent velocity is double historical velocity',
      maintenanceRisks: [],
      codeChurnHotspots: ['src/services/githubApi.ts'],
      actionableRecommendations: ['Keep dependencies updated'],
    };

    it('validates correct repository health assessment', () => {
      const parsed = validateAIResponse('REPOSITORY_HEALTH', validData);
      expect(parsed.healthGrade).toBe('A');
      expect(parsed.vitalityStatus).toBe('THRIVING');
    });

    it('rejects empty actionableRecommendations', () => {
      const invalid = { ...validData, actionableRecommendations: [] };
      expect(() => validateAIResponse('REPOSITORY_HEALTH', invalid)).toThrow(
        AIInvalidResponseError
      );
    });
  });

  describe('Repository QA Schema', () => {
    const validData = {
      answer: 'The primary language is TypeScript.',
      confidence: 'HIGH',
      supportingEvidence: ['package.json dependencies', '95% TypeScript repository files'],
      limitations: null,
      suggestedFollowUps: ['Check recent commits', 'Review test suite'],
    };

    it('validates correct repository QA output', () => {
      const parsed = validateAIResponse('REPOSITORY_QA', validData);
      expect(parsed.confidence).toBe('HIGH');
      expect(parsed.answer).toContain('TypeScript');
    });
  });

  describe('Error & Edge Cases', () => {
    it('throws AIInvalidResponseError for unparseable JSON string', () => {
      expect(() => validateAIResponse('REPOSITORY_OVERVIEW', 'Not JSON at all')).toThrow(
        AIInvalidResponseError
      );
    });

    it('validates CUSTOM type with non-null object', () => {
      const customPayload = { customField: 'hello', count: 10 };
      const parsed = validateAIResponse('CUSTOM', customPayload);
      expect(parsed).toEqual(customPayload);
    });

    it('rejects CUSTOM type with primitive value', () => {
      expect(() => validateAIResponse('CUSTOM', 'string is not an object')).toThrow(
        AIInvalidResponseError
      );
    });
  });
});
