import type {
  GithubApiRepo,
  GithubApiCommitDetail,
  GithubApiCommitFile,
  GithubApiComparison,
} from '../github/types.js';
import type {
  CommitRelationshipGraph,
  CommitStatistics,
  BranchDivergenceAnalysis,
  FileChurnAnalysis,
  RepositoryEvolutionAnalysis,
  RepositoryAnalysis,
} from '../intelligence/types.js';
import type { AnalysisType } from './types.js';

// Token and payload safety boundaries
export const MAX_CONTEXT_TOKEN_BUDGET = 6000;
const MAX_PATCH_LENGTH_PER_FILE = 1200; // characters
const MAX_TOTAL_DIFF_PATCH_LENGTH = 6000; // characters
const MAX_HOTSPOTS_IN_CONTEXT = 8;
const MAX_COMMITS_IN_DELTA = 15;
const MAX_EXTENSIONS_IN_CONTEXT = 10;
const MAX_INVESTIGATION_COMMITS = 15;
const MAX_INVESTIGATION_MESSAGE_LENGTH = 160;
const MAX_INVESTIGATION_HOTSPOTS = 10;
const MAX_INVESTIGATION_QUERY_LENGTH = 500;

/**
 * Estimates the token count of a JSON-serializable context object (heuristic: ~4 chars per token).
 */
export function estimatePayloadTokens(payload: unknown): number {
  const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return Math.ceil(json.length / 4);
}

/**
 * Normalizes diff patch content by collapsing redundant consecutive whitespace and blank lines.
 */
export function normalizePatch(patch: string | null | undefined): string {
  if (!patch) return '';
  return patch.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Truncates text safely with an explicit indicator if it exceeds maxLength.
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text || maxLength <= 0) return '';
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
  readonly investigation?: RepositoryInvestigationContextInput;
}

export function buildRepositoryQAContext(
  input: RepositoryQAContextInput
): Record<string, unknown> {
  const { question, repo, analysis, focusedContext, investigation } = input;

  const baseQAContext: Record<string, unknown> = {
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

  if (investigation) {
    const investigationContext = buildRepositoryInvestigationContext({
      ...investigation,
      repo,
      query: question,
      customEvidence: focusedContext,
    });
    return {
      ...baseQAContext,
      ...investigationContext,
    };
  }

  return baseQAContext;
}

// 7. REPOSITORY_INVESTIGATION Context Engine (D8-P1)
export interface InvestigationCommitSummary {
  readonly sha: string;
  readonly message: string;
  readonly authorName: string;
  readonly authorLogin?: string | null;
  readonly date: string;
  readonly isMerge?: boolean;
  readonly parentCount?: number;
}

export interface RepositoryInvestigationContextInput {
  readonly repo: GithubApiRepo;
  readonly query?: string;
  readonly analysis?: Partial<RepositoryAnalysis> | null;
  readonly graph?: CommitRelationshipGraph | null;
  readonly statistics?: CommitStatistics | null;
  readonly fileAnalysis?: FileChurnAnalysis | null;
  readonly evolution?: RepositoryEvolutionAnalysis | null;
  readonly divergence?: BranchDivergenceAnalysis | null;
  readonly recentCommits?: readonly InvestigationCommitSummary[];
  readonly focusedFiles?: readonly string[];
  readonly focusedAuthors?: readonly string[];
  readonly customEvidence?: Record<string, unknown>;
}

export function buildRepositoryInvestigationContext(
  input: RepositoryInvestigationContextInput
): Record<string, unknown> {
  const {
    repo,
    query,
    analysis,
    graph,
    statistics,
    fileAnalysis,
    evolution,
    divergence,
    recentCommits,
    focusedFiles,
    focusedAuthors,
    customEvidence,
  } = input;

  const repoPayload: Record<string, unknown> = {
    owner: repo.owner?.login || '',
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description || 'No description provided',
    primaryLanguage: repo.language || 'Unknown',
    starsCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    openIssuesCount: repo.open_issues_count,
    defaultBranch: repo.default_branch,
    isArchived: Boolean((repo as { archived?: boolean }).archived),
    isFork: repo.fork,
    sizeKb: repo.size,
    createdAt: repo.created_at,
    lastUpdatedAt: repo.updated_at,
    lastPushedAt: repo.pushed_at,
    topics: ((repo as { topics?: readonly string[] }).topics || []).slice(0, 8),
  };

  // 1. Commit Relationship Graph / DAG Intelligence
  const effectiveGraph = graph || analysis?.graph;
  let graphSummary: Record<string, unknown> | undefined;
  if (effectiveGraph) {
    const nodeValues = Object.values(effectiveGraph.nodes || {});
    const mergeCommitsCount = nodeValues.filter((n) => n.isMerge).length;
    graphSummary = {
      totalCommitsInGraph: effectiveGraph.totalCommits,
      rootCommitsCount: (effectiveGraph.rootShas || []).length,
      headCommitsCount: (effectiveGraph.headShas || []).length,
      mergeCommitsCount,
      sampleRootShas: (effectiveGraph.rootShas || []).slice(0, 5),
      sampleHeadShas: (effectiveGraph.headShas || []).slice(0, 5),
    };
  }

  // 2. Bounded Recent Commits (Token limit enforcement: max 15 commits, max 160 chars message)
  let commitsList: InvestigationCommitSummary[] = [];
  if (recentCommits && recentCommits.length > 0) {
    commitsList = recentCommits.slice(0, MAX_INVESTIGATION_COMMITS).map((c) => ({
      sha: c.sha.slice(0, 7),
      message: truncateText(c.message.split('\n')[0], MAX_INVESTIGATION_MESSAGE_LENGTH),
      authorName: c.authorName,
      authorLogin: c.authorLogin || undefined,
      date: c.date,
      isMerge: c.isMerge,
      parentCount: c.parentCount,
    }));
  } else if (effectiveGraph) {
    const orderedNodes = (effectiveGraph.orderedShas || [])
      .slice(0, MAX_INVESTIGATION_COMMITS)
      .map((sha) => effectiveGraph.nodes[sha])
      .filter((n): n is NonNullable<typeof n> => Boolean(n));

    commitsList = orderedNodes.map((node) => ({
      sha: node.shortSha,
      message: truncateText(node.message.split('\n')[0], MAX_INVESTIGATION_MESSAGE_LENGTH),
      authorName: node.author.name,
      authorLogin: node.author.login || undefined,
      date: node.timestamp,
      isMerge: node.isMerge,
      parentCount: node.parentShas.length,
    }));
  }

  // 3. Commit Statistics & Cadence
  const effectiveStats = statistics || analysis?.statistics;
  let statsSummary: Record<string, unknown> | undefined;
  if (effectiveStats) {
    statsSummary = {
      totalCommits: effectiveStats.totalCommits,
      cadence: {
        commitsPerWeek: effectiveStats.frequency.commitsPerWeek,
        commitsPerDay: effectiveStats.frequency.commitsPerDay,
        activeDaysCount: effectiveStats.frequency.activeDaysCount,
        timeSpanDays: effectiveStats.frequency.timeSpanDays,
        firstCommitDate: effectiveStats.frequency.firstCommitDate,
        lastCommitDate: effectiveStats.frequency.lastCommitDate,
      },
      changeMetrics: {
        totalAdditions: effectiveStats.changeStats.totalAdditions,
        totalDeletions: effectiveStats.changeStats.totalDeletions,
        netChanges: effectiveStats.changeStats.totalAdditions - effectiveStats.changeStats.totalDeletions,
        avgChangesPerCommit: effectiveStats.changeStats.avgChangesPerCommit,
      },
    };
  }

  // 4. File Architecture & Hotspots
  const effectiveFileAnalysis = fileAnalysis || analysis?.fileAnalysis;
  let fileSummary: Record<string, unknown> | undefined;
  if (effectiveFileAnalysis) {
    const sortedExtensions = Object.entries(effectiveFileAnalysis.fileExtensions || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_EXTENSIONS_IN_CONTEXT);

    const hotspots = (effectiveFileAnalysis.hotspots || [])
      .slice(0, MAX_INVESTIGATION_HOTSPOTS)
      .map((h) => ({
        filename: h.filename,
        churnScore: h.churnScore,
        totalChanges: h.totalChanges,
        changeCount: h.changeCount,
      }));

    fileSummary = {
      totalFilesChanged: effectiveFileAnalysis.totalFilesChanged,
      totalFileModifications: effectiveFileAnalysis.totalFileModifications,
      topExtensions: Object.fromEntries(sortedExtensions),
      criticalHotspots: hotspots,
    };
  }

  // 5. Repository Evolution & Trajectory
  const effectiveEvolution = evolution || analysis?.evolution;
  let evolutionSummary: Record<string, unknown> | undefined;
  if (effectiveEvolution) {
    evolutionSummary = {
      growthTrajectory: effectiveEvolution.trajectory.pattern,
      trajectoryDescription: effectiveEvolution.trajectory.description,
      momentumMultiplier: effectiveEvolution.trajectory.momentumMultiplier,
      recentVelocityCommitsPerDay: effectiveEvolution.trajectory.recentVelocity,
      previousVelocityCommitsPerDay: effectiveEvolution.trajectory.previousVelocity,
      recentActivityPeriods: (effectiveEvolution.periods || []).slice(-3).map((p) => ({
        intensity: p.intensity,
        commitCount: p.commitCount,
        startDate: p.startDate,
        endDate: p.endDate,
      })),
    };
  }

  // 6. Branch Divergence (if available)
  const effectiveDivergence = divergence || analysis?.divergence;
  let divergenceSummary: Record<string, unknown> | undefined;
  if (effectiveDivergence) {
    divergenceSummary = {
      baseRef: effectiveDivergence.baseRef,
      headRef: effectiveDivergence.headRef,
      status: effectiveDivergence.status,
      aheadBy: effectiveDivergence.aheadBy,
      behindBy: effectiveDivergence.behindBy,
      deltaTotalCommits: effectiveDivergence.delta.totalCommits,
      deltaTotalFilesChanged: effectiveDivergence.delta.totalFilesChanged,
      topAuthors: (effectiveDivergence.delta.authors || []).slice(0, 5).map((a) => ({
        name: a.name,
        login: a.login,
        commitCount: a.commitCount,
      })),
    };
  }

  // 7. Investigation Scope Filters
  const investigationScope =
    (focusedFiles && focusedFiles.length > 0) || (focusedAuthors && focusedAuthors.length > 0)
      ? {
          targetedFiles: (focusedFiles || []).slice(0, 10),
          targetedAuthors: (focusedAuthors || []).slice(0, 10),
        }
      : undefined;

  const context: Record<string, unknown> = {
    investigationTarget: repoPayload,
  };

  if (query) {
    context['investigationQuery'] = truncateText(query, MAX_INVESTIGATION_QUERY_LENGTH);
  }
  if (graphSummary) {
    context['graphIntelligence'] = graphSummary;
  }
  if (commitsList.length > 0) {
    context['recentCommits'] = commitsList;
  }
  if (statsSummary) {
    context['commitStatistics'] = statsSummary;
  }
  if (fileSummary) {
    context['fileArchitectureAndHotspots'] = fileSummary;
  }
  if (evolutionSummary) {
    context['evolutionTrajectory'] = evolutionSummary;
  }
  if (divergenceSummary) {
    context['branchDivergence'] = divergenceSummary;
  }
  if (investigationScope) {
    context['investigationScope'] = investigationScope;
  }
  if (customEvidence && Object.keys(customEvidence).length > 0) {
    context['customEvidence'] = customEvidence;
  }

  return context;
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
 * Enforces the maximum token budget on a context payload.
 * When payload estimated tokens exceed the budget, it progressively prunes patch snippets,
 * file lists, and oversized evidence so that model token boundaries are strictly respected.
 */
export function enforceContextTokenBudget(
  context: Record<string, unknown>,
  maxTokens: number = MAX_CONTEXT_TOKEN_BUDGET
): Record<string, unknown> {
  const currentTokens = estimatePayloadTokens(context);
  if (currentTokens <= maxTokens) {
    return context;
  }

  // Clone shallow/deep enough to safely prune without mutating raw source
  const pruned: Record<string, unknown> = JSON.parse(JSON.stringify(context));

  // 1. Truncate patch snippets in files or changedFiles
  if (Array.isArray(pruned.files)) {
    for (const file of pruned.files) {
      if (typeof file === 'object' && file !== null && 'patchSnippet' in file && typeof file.patchSnippet === 'string') {
        file.patchSnippet = truncateText(file.patchSnippet, 350);
      }
    }
  }
  if (Array.isArray(pruned.changedFiles)) {
    for (const file of pruned.changedFiles) {
      if (typeof file === 'object' && file !== null && 'patchSnippet' in file && typeof file.patchSnippet === 'string') {
        file.patchSnippet = truncateText(file.patchSnippet, 350);
      }
    }
  }

  if (estimatePayloadTokens(pruned) <= maxTokens) {
    return pruned;
  }

  // 2. Cap lists if still exceeding budget
  if (Array.isArray(pruned.files) && pruned.files.length > 8) {
    pruned.files = pruned.files.slice(0, 8);
  }
  if (Array.isArray(pruned.changedFiles) && pruned.changedFiles.length > 8) {
    pruned.changedFiles = pruned.changedFiles.slice(0, 8);
  }
  if (Array.isArray(pruned.recentCommits) && pruned.recentCommits.length > 8) {
    pruned.recentCommits = pruned.recentCommits.slice(0, 8);
  }

  // 3. Fallback: truncate custom/focused evidence
  if (pruned.customEvidence && typeof pruned.customEvidence === 'object') {
    pruned.customEvidence = { note: 'Truncated to respect context token budget' };
  }
  if (pruned.focusedEvidence && typeof pruned.focusedEvidence === 'object') {
    pruned.focusedEvidence = { note: 'Truncated to respect context token budget' };
  }

  return pruned;
}

/**
 * Universal dispatcher to construct structured AI context payloads for any AnalysisType.
 */
export function buildAIContext<T extends AnalysisType>(
  type: T,
  input: ContextBuilderInputMap[T]
): Record<string, unknown> {
  let context: Record<string, unknown>;

  switch (type) {
    case 'REPOSITORY_OVERVIEW':
      context = buildRepositoryOverviewContext(input as RepositoryOverviewContextInput);
      break;
    case 'COMMIT_EXPLANATION':
      context = buildCommitExplanationContext(input as CommitExplanationContextInput);
      break;
    case 'DIFF_REVIEW':
      context = buildDiffReviewContext(input as DiffReviewContextInput);
      break;
    case 'BRANCH_ANALYSIS':
      context = buildBranchAnalysisContext(input as BranchAnalysisContextInput);
      break;
    case 'REPOSITORY_HEALTH':
      context = buildRepositoryHealthContext(input as RepositoryHealthContextInput);
      break;
    case 'REPOSITORY_QA':
      context = buildRepositoryQAContext(input as RepositoryQAContextInput);
      break;
    case 'CUSTOM':
      context = (input as Record<string, unknown>) || {};
      break;
    default:
      throw new Error(`Unsupported analysis type for context building: ${String(type)}`);
  }

  return enforceContextTokenBudget(context);
}
