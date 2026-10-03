import type {
  GithubApiRepo,
  GithubApiCommitDetail,
  GithubApiCommitFile,
  GithubApiComparison,
} from '../github/types.js';
import type {
  CommitStatistics,
  BranchDivergenceAnalysis,
  FileChurnAnalysis,
  RepositoryEvolutionAnalysis,
  RepositoryAnalysis,
} from '../intelligence/types.js';
import type { AnalysisType } from './types.js';

// Token and payload safety boundaries
const MAX_PATCH_LENGTH_PER_FILE = 1200; // characters
const MAX_TOTAL_DIFF_PATCH_LENGTH = 6000; // characters
const MAX_HOTSPOTS_IN_CONTEXT = 8;
const MAX_COMMITS_IN_DELTA = 15;
const MAX_EXTENSIONS_IN_CONTEXT = 10;

/**
 * Truncates text safely with an explicit indicator if it exceeds maxLength.
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n... [Truncated: ${text.length - maxLength} chars omitted]`;
}

// 1. REPOSITORY_OVERVIEW Context
export interface RepositoryOverviewContextInput {
  readonly repo: GithubApiRepo;
  readonly statistics?: CommitStatistics | null;
  readonly fileAnalysis?: FileChurnAnalysis | null;
  readonly evolution?: RepositoryEvolutionAnalysis | null;
}

export function buildRepositoryOverviewContext(
  input: RepositoryOverviewContextInput
): Record<string, unknown> {
  const { repo, statistics, fileAnalysis, evolution } = input;

  const context: Record<string, unknown> = {
    repository: {
      owner: repo.owner?.login || '',
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || 'No description provided',
      primaryLanguage: repo.language || 'Unknown',
      starsCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
      defaultBranch: repo.default_branch,
      isFork: repo.fork,
      createdAt: repo.created_at,
      lastUpdatedAt: repo.updated_at,
      lastPushedAt: repo.pushed_at,
      sizeKb: repo.size,
    },
  };

  if (statistics) {
    context['commitStatistics'] = {
      totalCommitsAnalyzed: statistics.totalCommits,
      commitsPerWeek: statistics.frequency.commitsPerWeek,
      activeDaysCount: statistics.frequency.activeDaysCount,
      timeSpanDays: statistics.frequency.timeSpanDays,
      firstCommitDate: statistics.frequency.firstCommitDate,
      lastCommitDate: statistics.frequency.lastCommitDate,
      totalAdditions: statistics.changeStats.totalAdditions,
      totalDeletions: statistics.changeStats.totalDeletions,
      avgChangesPerCommit: statistics.changeStats.avgChangesPerCommit,
    };
  }

  if (fileAnalysis) {
    const sortedExtensions = Object.entries(fileAnalysis.fileExtensions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_EXTENSIONS_IN_CONTEXT);

    const topHotspots = fileAnalysis.hotspots
      .slice(0, 5)
      .map((h) => ({
        filename: h.filename,
        churnScore: h.churnScore,
        changes: h.totalChanges,
      }));

    context['fileArchitecture'] = {
      totalFilesChanged: fileAnalysis.totalFilesChanged,
      topFileExtensions: Object.fromEntries(sortedExtensions),
      topHotspotFiles: topHotspots,
    };
  }

  if (evolution) {
    context['evolutionPattern'] = {
      growthTrajectory: evolution.trajectory.pattern,
      trajectoryDescription: evolution.trajectory.description,
      momentumMultiplier: evolution.trajectory.momentumMultiplier,
      recentVelocityCommitsPerDay: evolution.trajectory.recentVelocity,
    };
  }

  return context;
}

// 2. COMMIT_EXPLANATION Context
export interface CommitExplanationContextInput {
  readonly commit: GithubApiCommitDetail;
  readonly repositoryCoordinates?: { readonly owner: string; readonly repo: string };
  readonly parentMessages?: readonly string[];
}

export function buildCommitExplanationContext(
  input: CommitExplanationContextInput
): Record<string, unknown> {
  const { commit, repositoryCoordinates, parentMessages } = input;

  let totalPatchAccumulator = 0;
  const filesSummary = (commit.files || []).map((file: GithubApiCommitFile) => {
    let patchSnippet = '';
    if (file.patch && totalPatchAccumulator < MAX_TOTAL_DIFF_PATCH_LENGTH) {
      const allowedPatchLen = Math.min(
        MAX_PATCH_LENGTH_PER_FILE,
        MAX_TOTAL_DIFF_PATCH_LENGTH - totalPatchAccumulator
      );
      patchSnippet = truncateText(file.patch, allowedPatchLen);
      totalPatchAccumulator += patchSnippet.length;
    }

    return {
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      previousFilename: file.previous_filename,
      patchSnippet: patchSnippet || undefined,
    };
  });

  return {
    repository: repositoryCoordinates || undefined,
    commit: {
      sha: commit.sha,
      shortSha: commit.sha ? commit.sha.slice(0, 7) : '',
      message: commit.commit?.message || '',
      author: {
        name: commit.commit?.author?.name || 'Unknown',
        email: commit.commit?.author?.email || null,
        date: commit.commit?.author?.date || '',
        login: commit.author?.login || null,
      },
      isMerge: (commit.parents || []).length > 1,
      parentShas: (commit.parents || []).map((p) => p.sha),
      parentMessages: parentMessages && parentMessages.length > 0 ? parentMessages : undefined,
    },
    changeStats: {
      totalChanges: commit.stats?.total ?? 0,
      additions: commit.stats?.additions ?? 0,
      deletions: commit.stats?.deletions ?? 0,
      filesCount: (commit.files || []).length,
    },
    changedFiles: filesSummary,
  };
}

// 3. DIFF_REVIEW Context
export interface DiffReviewContextInput {
  readonly title: string;
  readonly files: readonly GithubApiCommitFile[];
  readonly baseRef?: string;
  readonly headRef?: string;
}

export function buildDiffReviewContext(
  input: DiffReviewContextInput
): Record<string, unknown> {
  const { title, files, baseRef, headRef } = input;

  let totalPatchLength = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;

  const fileReviews = files.map((file) => {
    totalAdditions += file.additions;
    totalDeletions += file.deletions;

    let patchSnippet = '';
    if (file.patch && totalPatchLength < MAX_TOTAL_DIFF_PATCH_LENGTH) {
      const remainingAllowance = MAX_TOTAL_DIFF_PATCH_LENGTH - totalPatchLength;
      patchSnippet = truncateText(file.patch, Math.min(MAX_PATCH_LENGTH_PER_FILE, remainingAllowance));
      totalPatchLength += patchSnippet.length;
    }

    return {
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patchSnippet: patchSnippet || undefined,
    };
  });

  return {
    reviewTarget: {
      title,
      baseRef: baseRef || undefined,
      headRef: headRef || undefined,
    },
    aggregateMetrics: {
      filesChangedCount: files.length,
      totalAdditions,
      totalDeletions,
      totalNetChanges: totalAdditions - totalDeletions,
    },
    files: fileReviews,
  };
}

// 4. BRANCH_ANALYSIS Context
export interface BranchAnalysisContextInput {
  readonly divergence: BranchDivergenceAnalysis;
  readonly comparison?: GithubApiComparison | null;
}

export function buildBranchAnalysisContext(
  input: BranchAnalysisContextInput
): Record<string, unknown> {
  const { divergence, comparison } = input;

  const deltaMessages = (divergence.delta.commitMessages || []).slice(0, MAX_COMMITS_IN_DELTA);

  const context: Record<string, unknown> = {
    branchComparison: {
      baseRef: divergence.baseRef,
      headRef: divergence.headRef,
      divergenceStatus: divergence.status,
      aheadBy: divergence.aheadBy,
      behindBy: divergence.behindBy,
      mergeBaseSha: divergence.mergeBaseSha,
      mergeBaseMessage: divergence.mergeBaseMessage,
    },
    deltaSummary: {
      totalCommits: divergence.delta.totalCommits,
      totalFilesChanged: divergence.delta.totalFilesChanged,
      totalAdditions: divergence.delta.totalAdditions,
      totalDeletions: divergence.delta.totalDeletions,
      authors: divergence.delta.authors.map((a) => ({
        name: a.name,
        login: a.login,
        commitCount: a.commitCount,
      })),
      sampleCommitMessages: deltaMessages,
    },
  };

  if (comparison?.files && comparison.files.length > 0) {
    context['topModifiedFiles'] = comparison.files.slice(0, 10).map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    }));
  }

  return context;
}

// 5. REPOSITORY_HEALTH Context
export interface RepositoryHealthContextInput {
  readonly repo: GithubApiRepo;
  readonly statistics: CommitStatistics;
  readonly evolution: RepositoryEvolutionAnalysis;
  readonly fileAnalysis?: FileChurnAnalysis | null;
}

export function buildRepositoryHealthContext(
  input: RepositoryHealthContextInput
): Record<string, unknown> {
  const { repo, statistics, evolution, fileAnalysis } = input;

  const now = Date.now();
  const lastPushedMs = repo.pushed_at ? new Date(repo.pushed_at).getTime() : 0;
  const daysSinceLastPush = lastPushedMs > 0 ? Math.floor((now - lastPushedMs) / (1000 * 60 * 60 * 24)) : null;

  return {
    repository: {
      owner: repo.owner?.login,
      name: repo.name,
      starsCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
      isArchived: Boolean((repo as { archived?: boolean }).archived),
      daysSinceLastPush,
      createdAt: repo.created_at,
    },
    activityMetrics: {
      totalCommits: statistics.totalCommits,
      commitsPerWeek: statistics.frequency.commitsPerWeek,
      activeDaysCount: statistics.frequency.activeDaysCount,
      timeSpanDays: statistics.frequency.timeSpanDays,
      firstCommitDate: statistics.frequency.firstCommitDate,
      lastCommitDate: statistics.frequency.lastCommitDate,
    },
    evolutionHealth: {
      growthTrajectory: evolution.trajectory.pattern,
      trajectoryDescription: evolution.trajectory.description,
      momentumMultiplier: evolution.trajectory.momentumMultiplier,
      recentVelocity: evolution.trajectory.recentVelocity,
      previousVelocity: evolution.trajectory.previousVelocity,
      recentPeriods: evolution.periods.slice(-3).map((p) => ({
        intensity: p.intensity,
        commitCount: p.commitCount,
        startDate: p.startDate,
        endDate: p.endDate,
      })),
    },
    codeStability: fileAnalysis
      ? {
          totalFilesChanged: fileAnalysis.totalFilesChanged,
          criticalHotspotsCount: fileAnalysis.hotspots.filter((h) => h.churnScore > 50).length,
          topHotspots: fileAnalysis.hotspots.slice(0, MAX_HOTSPOTS_IN_CONTEXT).map((h) => ({
            filename: h.filename,
            churnScore: h.churnScore,
            totalChanges: h.totalChanges,
          })),
        }
      : undefined,
  };
}

// 6. REPOSITORY_QA Context
export interface RepositoryQAContextInput {
  readonly question: string;
  readonly repo: GithubApiRepo;
  readonly analysis?: Partial<RepositoryAnalysis> | null;
  readonly focusedContext?: Record<string, unknown>;
}

export function buildRepositoryQAContext(
  input: RepositoryQAContextInput
): Record<string, unknown> {
  const { question, repo, analysis, focusedContext } = input;

  return {
    question,
    repository: {
      owner: repo.owner?.login,
      name: repo.name,
      description: repo.description,
      primaryLanguage: repo.language,
      defaultBranch: repo.default_branch,
      starsCount: repo.stargazers_count,
      forksCount: repo.forks_count,
    },
    intelligenceSummary: analysis
      ? {
          totalCommits: analysis.statistics?.totalCommits,
          commitsPerWeek: analysis.statistics?.frequency.commitsPerWeek,
          growthTrajectory: analysis.evolution?.trajectory.pattern,
          hotspotFilesCount: analysis.fileAnalysis?.hotspots.length,
          branchDivergenceStatus: analysis.divergence?.status,
        }
      : undefined,
    focusedEvidence: focusedContext && Object.keys(focusedContext).length > 0 ? focusedContext : undefined,
  };
}

// Unified Dispatcher Interface
export type ContextBuilderInputMap = {
  REPOSITORY_OVERVIEW: RepositoryOverviewContextInput;
  COMMIT_EXPLANATION: CommitExplanationContextInput;
  DIFF_REVIEW: DiffReviewContextInput;
  BRANCH_ANALYSIS: BranchAnalysisContextInput;
  REPOSITORY_HEALTH: RepositoryHealthContextInput;
  REPOSITORY_QA: RepositoryQAContextInput;
  CUSTOM: Record<string, unknown>;
};

/**
 * Universal dispatcher to construct structured AI context payloads for any AnalysisType.
 */
export function buildAIContext<T extends AnalysisType>(
  type: T,
  input: ContextBuilderInputMap[T]
): Record<string, unknown> {
  switch (type) {
    case 'REPOSITORY_OVERVIEW':
      return buildRepositoryOverviewContext(input as RepositoryOverviewContextInput);
    case 'COMMIT_EXPLANATION':
      return buildCommitExplanationContext(input as CommitExplanationContextInput);
    case 'DIFF_REVIEW':
      return buildDiffReviewContext(input as DiffReviewContextInput);
    case 'BRANCH_ANALYSIS':
      return buildBranchAnalysisContext(input as BranchAnalysisContextInput);
    case 'REPOSITORY_HEALTH':
      return buildRepositoryHealthContext(input as RepositoryHealthContextInput);
    case 'REPOSITORY_QA':
      return buildRepositoryQAContext(input as RepositoryQAContextInput);
    case 'CUSTOM':
      return (input as Record<string, unknown>) || {};
    default:
      throw new Error(`Unsupported analysis type for context building: ${String(type)}`);
  }
}
