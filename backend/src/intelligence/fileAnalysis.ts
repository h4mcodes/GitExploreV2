// Server-side File-Change Intelligence Engine
// Computes file change frequency, hotspots, churn metrics, and file extension breakdowns

import type {
  GithubApiCommitDetail,
  GithubApiCommitFile,
} from '../github/types.js';
import type {
  FileMetrics,
  FileChurnAnalysis,
} from './types.js';

interface CommitWithFiles {
  readonly files?: readonly GithubApiCommitFile[];
  readonly commit?: {
    readonly author?: {
      readonly date?: string;
    } | null;
    readonly committer?: {
      readonly date?: string;
    } | null;
  };
}

function extractExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return 'other';
  }
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Aggregates file change metrics per file across commits.
 */
export function aggregateFileChanges(
  commits: readonly CommitWithFiles[] = []
): FileMetrics[] {
  const fileMap = new Map<
    string,
    {
      filename: string;
      changeCount: number;
      additions: number;
      deletions: number;
      totalChanges: number;
      lastModifiedTime: number;
      lastModifiedDate: string | null;
      statuses: Set<string>;
    }
  >();

  for (const commit of commits) {
    if (!commit || !Array.isArray(commit.files)) continue;

    const dateStr = commit.commit?.author?.date || commit.commit?.committer?.date || null;
    const commitTime = dateStr ? new Date(dateStr).getTime() : 0;

    for (const file of commit.files) {
      if (!file || !file.filename) continue;

      const filename = file.filename;
      const additions = file.additions || 0;
      const deletions = file.deletions || 0;
      const changes = file.changes || additions + deletions;
      const status = file.status || 'modified';

      const existing = fileMap.get(filename);
      if (existing) {
        existing.changeCount += 1;
        existing.additions += additions;
        existing.deletions += deletions;
        existing.totalChanges += changes;
        existing.statuses.add(status);

        if (commitTime > existing.lastModifiedTime && dateStr) {
          existing.lastModifiedTime = commitTime;
          existing.lastModifiedDate = dateStr;
        }
      } else {
        const statusSet = new Set<string>();
        statusSet.add(status);
        fileMap.set(filename, {
          filename,
          changeCount: 1,
          additions,
          deletions,
          totalChanges: changes,
          lastModifiedTime: commitTime,
          lastModifiedDate: dateStr,
          statuses: statusSet,
        });
      }
    }
  }

  return Array.from(fileMap.values()).map((entry) => ({
    filename: entry.filename,
    changeCount: entry.changeCount,
    additions: entry.additions,
    deletions: entry.deletions,
    totalChanges: entry.totalChanges,
    churnScore: entry.additions + entry.deletions,
    lastModifiedDate: entry.lastModifiedDate,
    statuses: Array.from(entry.statuses),
  }));
}

/**
 * Identifies the top hotspot files sorted by change count and churn volume.
 */
export function findHotspotFiles(
  fileMetrics: readonly FileMetrics[],
  limit: number = 10
): FileMetrics[] {
  return [...fileMetrics]
    .sort((a, b) => {
      if (b.changeCount !== a.changeCount) {
        return b.changeCount - a.changeCount;
      }
      return b.churnScore - a.churnScore;
    })
    .slice(0, Math.max(1, limit));
}

/**
 * Computes full file churn analysis including totals, hotspots, and extension distributions.
 */
export function computeFileChurn(
  commits: readonly (GithubApiCommitDetail | CommitWithFiles)[] = [],
  hotspotLimit: number = 10
): FileChurnAnalysis {
  const fileMetrics = aggregateFileChanges(commits);

  let totalFileModifications = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;
  const fileExtensions: Record<string, number> = {};

  for (const metric of fileMetrics) {
    totalFileModifications += metric.changeCount;
    totalAdditions += metric.additions;
    totalDeletions += metric.deletions;

    const ext = extractExtension(metric.filename);
    fileExtensions[ext] = (fileExtensions[ext] || 0) + metric.changeCount;
  }

  const hotspots = findHotspotFiles(fileMetrics, hotspotLimit);

  return {
    totalFilesChanged: fileMetrics.length,
    totalFileModifications,
    totalAdditions,
    totalDeletions,
    hotspots,
    fileExtensions,
  };
}
