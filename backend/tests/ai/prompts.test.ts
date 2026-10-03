import { describe, it, expect } from 'vitest';
import {
  resolvePrompt,
  buildRepositoryOverviewPrompt,
  buildCommitExplanationPrompt,
  buildDiffReviewPrompt,
  buildBranchAnalysisPrompt,
  buildRepositoryHealthPrompt,
  buildRepositoryQAPrompt,
  REPOSITORY_OVERVIEW_PROMPT_VERSION,
  COMMIT_EXPLANATION_PROMPT_VERSION,
  DIFF_REVIEW_PROMPT_VERSION,
  BRANCH_ANALYSIS_PROMPT_VERSION,
  REPOSITORY_HEALTH_PROMPT_VERSION,
  REPOSITORY_QA_PROMPT_VERSION,
} from '../../src/ai/prompts/index.js';

describe('AI Prompt System (D6-P3)', () => {
  const sampleContext = {
    repository: { name: 'gitexplore', owner: 'h4mcodes' },
    metrics: { stars: 350, forks: 42 },
  };

  describe('Repository Overview Prompt', () => {
    it('produces formatted prompt with version and grounding instructions', () => {
      const result = buildRepositoryOverviewPrompt(sampleContext);
      expect(result.version).toBe(REPOSITORY_OVERVIEW_PROMPT_VERSION);
      expect(result.systemInstruction).toContain('GitExplore AI');
      expect(result.systemInstruction).toContain('Base your summary and observations strictly on the structured evidence');
      expect(result.prompt).toContain('"gitexplore"');
      expect(result.prompt).toContain('Key activity indicators');
    });
  });

  describe('Commit Explanation Prompt', () => {
    it('produces formatted commit explanation prompt with version', () => {
      const result = buildCommitExplanationPrompt({
        commit: { sha: 'abc1234', message: 'fix: resolve race condition' },
      });
      expect(result.version).toBe(COMMIT_EXPLANATION_PROMPT_VERSION);
      expect(result.systemInstruction).toContain('code reviewer and Git forensics assistant');
      expect(result.prompt).toContain('fix: resolve race condition');
      expect(result.prompt).toContain('blast radius');
    });
  });

  describe('Diff Review Prompt', () => {
    it('produces formatted diff review prompt with version', () => {
      const result = buildDiffReviewPrompt({
        reviewTarget: { title: 'PR #42' },
        files: [{ filename: 'src/App.tsx', additions: 10 }],
      });
      expect(result.version).toBe(DIFF_REVIEW_PROMPT_VERSION);
      expect(result.systemInstruction).toContain('diff reviewer');
      expect(result.prompt).toContain('src/App.tsx');
      expect(result.prompt).toContain('Risk assessment');
    });
  });

  describe('Branch Analysis Prompt', () => {
    it('produces formatted branch analysis prompt with version', () => {
      const result = buildBranchAnalysisPrompt({
        branchComparison: { baseRef: 'main', headRef: 'feature/ai' },
      });
      expect(result.version).toBe(BRANCH_ANALYSIS_PROMPT_VERSION);
      expect(result.systemInstruction).toContain('branching workflows');
      expect(result.prompt).toContain('feature/ai');
      expect(result.prompt).toContain('PR readiness assessment');
    });
  });

  describe('Repository Health Prompt', () => {
    it('produces formatted health audit prompt with version', () => {
      const result = buildRepositoryHealthPrompt({
        activityMetrics: { totalCommits: 500 },
      });
      expect(result.version).toBe(REPOSITORY_HEALTH_PROMPT_VERSION);
      expect(result.systemInstruction).toContain('health, maintainability, and sustainability auditor');
      expect(result.prompt).toContain('500');
      expect(result.prompt).toContain('Repository Vitality Verdict');
    });
  });

  describe('Repository QA Prompt', () => {
    it('packages user question directly with context evidence', () => {
      const result = buildRepositoryQAPrompt({
        question: 'Who are the most active contributors?',
        contributors: ['Hamza'],
      });
      expect(result.version).toBe(REPOSITORY_QA_PROMPT_VERSION);
      expect(result.systemInstruction).toContain('question-answering assistant');
      expect(result.prompt).toContain('User Question: "Who are the most active contributors?"');
      expect(result.prompt).toContain('Hamza');
    });
  });

  describe('resolvePrompt (Universal Dispatcher)', () => {
    it('dispatches REPOSITORY_OVERVIEW correctly', () => {
      const result = resolvePrompt('REPOSITORY_OVERVIEW', sampleContext);
      expect(result.version).toBe(REPOSITORY_OVERVIEW_PROMPT_VERSION);
      expect(result.prompt).toContain('overview');
    });

    it('dispatches CUSTOM analysis type with custom prompt', () => {
      const result = resolvePrompt('CUSTOM', sampleContext, 'Custom test prompt');
      expect(result.prompt).toBe('Custom test prompt');
      expect(result.version).toBe('1.0.0');
    });

    it('throws error for unsupported analysis type', () => {
      expect(() => {
        // @ts-expect-error Testing runtime safeguard
        resolvePrompt('UNKNOWN_TYPE', {});
      }).toThrow('Unsupported analysis type for prompt generation: UNKNOWN_TYPE');
    });
  });
});
