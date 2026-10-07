import { describe, it, expect } from 'vitest';
import {
  aggregateFileChanges,
  findHotspotFiles,
  computeFileChurn,
} from '../../src/intelligence/fileAnalysis.js';
import type { GithubApiCommitDetail, GithubApiCommitFile } from '../../src/github/types.js';

function createMockCommitDetail(
  sha: string,
  date: string,
  files: GithubApiCommitFile[]
): GithubApiCommitDetail {
  return {
    sha,
    html_url: `https://github.com/test/repo/commit/${sha}`,
    commit: {
      message: `Commit ${sha}`,
      comment_count: 0,
      author: {
        name: 'Test Author',
        email: 'test@example.com',
        date,
      },
      committer: null,
    },
    author: null,
    committer: null,
    parents: [],
    files,
  };
}

describe('File-Change Intelligence Engine', () => {
  describe('aggregateFileChanges', () => {
    it('handles empty commit array', () => {
      const metrics = aggregateFileChanges([]);
      expect(metrics).toEqual([]);
    });

    it('aggregates multiple modifications to the same file across commits', () => {
      const f1: GithubApiCommitFile = {
        filename: 'src/app.ts',
        status: 'added',
        additions: 50,
        deletions: 0,
        changes: 50,
      };

      const f2: GithubApiCommitFile = {
        filename: 'src/app.ts',
        status: 'modified',
        additions: 20,
        deletions: 10,
        changes: 30,
      };

      const c1 = createMockCommitDetail('c1', '2026-10-01T10:00:00Z', [f1]);
      const c2 = createMockCommitDetail('c2', '2026-10-02T12:00:00Z', [f2]);

      const metrics = aggregateFileChanges([c1, c2]);

      expect(metrics.length).toBe(1);
      const appMetrics = metrics[0];
      expect(appMetrics?.filename).toBe('src/app.ts');
      expect(appMetrics?.changeCount).toBe(2);
      expect(appMetrics?.additions).toBe(70);
      expect(appMetrics?.deletions).toBe(10);
      expect(appMetrics?.totalChanges).toBe(80);
      expect(appMetrics?.churnScore).toBe(80);
      expect(appMetrics?.lastModifiedDate).toBe('2026-10-02T12:00:00Z');
      expect(appMetrics?.statuses).toContain('added');
      expect(appMetrics?.statuses).toContain('modified');
    });
  });

  describe('findHotspotFiles', () => {
    it('ranks files by change count and churn volume', () => {
      const fileA = {
        filename: 'rare.ts',
        changeCount: 1,
        additions: 10,
        deletions: 5,
        totalChanges: 15,
        churnScore: 15,
        lastModifiedDate: null,
        statuses: ['modified'],
      };

      const fileB = {
        filename: 'hotspot.ts',
        changeCount: 5,
        additions: 100,
        deletions: 50,
        totalChanges: 150,
        churnScore: 150,
        lastModifiedDate: null,
        statuses: ['modified'],
      };

      const fileC = {
        filename: 'highChurn.ts',
        changeCount: 1,
        additions: 500,
        deletions: 200,
        totalChanges: 700,
        churnScore: 700,
        lastModifiedDate: null,
        statuses: ['modified'],
      };

      const hotspots = findHotspotFiles([fileA, fileB, fileC], 2);

      expect(hotspots.length).toBe(2);
      expect(hotspots[0]?.filename).toBe('hotspot.ts'); // most changes (5)
      expect(hotspots[1]?.filename).toBe('highChurn.ts'); // tied at 1 change, higher churn (700)
    });
  });

  describe('computeFileChurn', () => {
    it('computes full churn summary with extension distributions', () => {
      const f1: GithubApiCommitFile = {
        filename: 'src/index.ts',
        status: 'modified',
        additions: 25,
        deletions: 5,
        changes: 30,
      };

      const f2: GithubApiCommitFile = {
        filename: 'README.md',
        status: 'modified',
        additions: 10,
        deletions: 2,
        changes: 12,
      };

      const f3: GithubApiCommitFile = {
        filename: 'Dockerfile',
        status: 'added',
        additions: 40,
        deletions: 0,
        changes: 40,
      };

      const commit = createMockCommitDetail('c1', '2026-10-01T00:00:00Z', [f1, f2, f3]);

      const churn = computeFileChurn([commit]);

      expect(churn.totalFilesChanged).toBe(3);
      expect(churn.totalFileModifications).toBe(3);
      expect(churn.totalAdditions).toBe(75);
      expect(churn.totalDeletions).toBe(7);
      expect(churn.hotspots.length).toBe(3);

      expect(churn.fileExtensions['.ts']).toBe(1);
      expect(churn.fileExtensions['.md']).toBe(1);
      expect(churn.fileExtensions['other']).toBe(1); // Dockerfile has no dot extension
    });

    it('correctly categorizes dotfiles and multiple file extensions', () => {
      const dotGitignore: GithubApiCommitFile = {
        filename: '.gitignore',
        status: 'added',
        additions: 15,
        deletions: 0,
        changes: 15,
      };
      const eslintJson: GithubApiCommitFile = {
        filename: '.eslintrc.json',
        status: 'modified',
        additions: 5,
        deletions: 2,
        changes: 7,
      };
      const deepTsx: GithubApiCommitFile = {
        filename: 'src/components/ui/Button.tsx',
        status: 'modified',
        additions: 50,
        deletions: 10,
        changes: 60,
      };

      const commit = createMockCommitDetail('c1', '2026-10-01T00:00:00Z', [dotGitignore, eslintJson, deepTsx]);
      const churn = computeFileChurn([commit]);

      expect(churn.fileExtensions['.json']).toBe(1);
      expect(churn.fileExtensions['.tsx']).toBe(1);
      expect(churn.fileExtensions['other']).toBe(1); // .gitignore without dot extension
    });

    it('handles findHotspotFiles when requested limit exceeds file count', () => {
      const files = [
        {
          filename: 'a.ts',
          changeCount: 1,
          additions: 10,
          deletions: 0,
          totalChanges: 10,
          churnScore: 10,
          lastModifiedDate: null,
          statuses: ['modified'],
        },
      ];

      const hotspots = findHotspotFiles(files, 50);
      expect(hotspots.length).toBe(1);
    });

    it('stress tests churn and hotspots across 1,000 file modifications', () => {
      // 200 commits, each modifying 5 files (total 1,000 modifications across 50 unique files)
      const uniqueFileCount = 50;
      const commitCount = 200;
      const commits: GithubApiCommitDetail[] = [];

      for (let c = 0; c < commitCount; c++) {
        const commitFiles: GithubApiCommitFile[] = [];
        for (let f = 0; f < 5; f++) {
          const fileIndex = (c + f) % uniqueFileCount;
          commitFiles.push({
            filename: `src/module_${fileIndex}/file_${fileIndex}.ts`,
            status: c === 0 ? 'added' : 'modified',
            additions: 10,
            deletions: 2,
            changes: 12,
          });
        }
        commits.push(createMockCommitDetail(`c_${c}`, new Date(2026, 0, c + 1).toISOString(), commitFiles));
      }

      const startTime = performance.now();
      const churn = computeFileChurn(commits);
      const elapsed = performance.now() - startTime;

      expect(churn.totalFileModifications).toBe(1000);
      expect(churn.totalFilesChanged).toBe(uniqueFileCount);
      expect(churn.totalAdditions).toBe(1000 * 10);
      expect(churn.totalDeletions).toBe(1000 * 2);
      expect(churn.hotspots.length).toBe(10); // default top 10
      expect(churn.fileExtensions['.ts']).toBe(1000);

      // Fast execution under 250ms
      expect(elapsed).toBeLessThan(400);
    });
  });
});
