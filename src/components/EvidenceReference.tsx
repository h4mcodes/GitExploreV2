import { memo, useMemo } from 'react';
import { ExternalLink, FileCode, GitBranch, GitCommit, ShieldCheck, Tag } from 'lucide-react';
import { sanitizeUrl } from '../services/security';

interface ParsedEvidence {
  type: 'commit' | 'file' | 'branch' | 'metric';
  label: string;
  url?: string;
  identifier?: string;
}

const COMMIT_SHA_REGEX = /\b([0-9a-f]{7,40})\b/i;
const FILE_PATH_REGEX = /\b([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*\.[a-zA-Z0-9]{1,10})\b/;
const BRANCH_PREFIX_REGEX = /^(?:branch|on branch|from branch):\s*([a-zA-Z0-9_.\-\/]+)/i;

export function parseEvidenceItem(
  item: string,
  owner?: string,
  repo?: string,
  defaultBranch = 'main'
): ParsedEvidence {
  const trimmed = item.trim();
  const repoBase = owner && repo ? `https://github.com/${owner}/${repo}` : '';

  // 1. Check for explicit branch prefix or branch pattern
  const branchMatch = trimmed.match(BRANCH_PREFIX_REGEX);
  if (branchMatch && branchMatch[1]) {
    const branchName = branchMatch[1].trim();
    return {
      type: 'branch',
      label: `branch: ${branchName}`,
      identifier: branchName,
      url: repoBase ? sanitizeUrl(`${repoBase}/tree/${encodeURIComponent(branchName)}`) : undefined,
    };
  }

  // 2. Check for commit SHA pattern
  const commitMatch = trimmed.match(COMMIT_SHA_REGEX);
  // Ensure it's not a numeric-only string or standard word
  if (commitMatch && commitMatch[1] && /[a-f]/i.test(commitMatch[1])) {
    const sha = commitMatch[1];
    return {
      type: 'commit',
      label: trimmed.length <= 42 ? trimmed : `Commit ${sha.slice(0, 7)}: ${trimmed.slice(0, 36)}...`,
      identifier: sha,
      url: repoBase ? sanitizeUrl(`${repoBase}/commit/${sha}`) : undefined,
    };
  }

  // 3. Check for file path pattern
  const fileMatch = trimmed.match(FILE_PATH_REGEX);
  if (fileMatch && fileMatch[1]) {
    const filePath = fileMatch[1];
    return {
      type: 'file',
      label: trimmed,
      identifier: filePath,
      url: repoBase
        ? sanitizeUrl(`${repoBase}/blob/${encodeURIComponent(defaultBranch)}/${filePath}`)
        : undefined,
    };
  }

  // 4. Default to verified metric or fact
  return {
    type: 'metric',
    label: trimmed,
  };
}

interface EvidenceBadgeProps {
  item: string;
  owner?: string;
  repo?: string;
  branch?: string;
}

export const EvidenceBadge = memo(function EvidenceBadge({
  item,
  owner,
  repo,
  branch,
}: EvidenceBadgeProps) {
  const parsed = useMemo(
    () => parseEvidenceItem(item, owner, repo, branch),
    [item, owner, repo, branch]
  );

  const getIcon = () => {
    switch (parsed.type) {
      case 'commit':
        return <GitCommit size={12} className="ai-evidence-icon commit" />;
      case 'file':
        return <FileCode size={12} className="ai-evidence-icon file" />;
      case 'branch':
        return <GitBranch size={12} className="ai-evidence-icon branch" />;
      case 'metric':
      default:
        return <ShieldCheck size={12} className="ai-evidence-icon metric" />;
    }
  };

  if (parsed.url) {
    return (
      <a
        href={parsed.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`ai-evidence-badge ai-evidence-badge-link type-${parsed.type}`}
        title={`Inspect ${parsed.type} ${parsed.identifier || ''} on GitHub`}
        aria-label={`Inspect ${parsed.type} on GitHub: ${parsed.label}`}
      >
        {getIcon()}
        <span className="ai-evidence-text">{parsed.label}</span>
        <ExternalLink size={10} className="ai-evidence-ext" />
      </a>
    );
  }

  return (
    <span className={`ai-evidence-badge type-${parsed.type}`}>
      {getIcon()}
      <span className="ai-evidence-text">{parsed.label}</span>
    </span>
  );
});

interface EvidenceListProps {
  evidence?: string[];
  owner?: string;
  repo?: string;
  branch?: string;
  title?: string;
  className?: string;
}

export const EvidenceList = memo(function EvidenceList({
  evidence,
  owner,
  repo,
  branch,
  title = 'Supporting Evidence & References',
  className = '',
}: EvidenceListProps) {
  if (!evidence || evidence.length === 0) {
    return null;
  }

  return (
    <div className={`ai-evidence-section ${className}`}>
      <div className="ai-evidence-header">
        <Tag size={12} className="ai-evidence-header-icon" />
        <span className="ai-evidence-title">{title}</span>
        <span className="ai-evidence-count">{evidence.length}</span>
      </div>
      <div className="ai-evidence-list">
        {evidence.map((item, index) => (
          <EvidenceBadge
            key={`${index}-${item.slice(0, 24)}`}
            item={item}
            owner={owner}
            repo={repo}
            branch={branch}
          />
        ))}
      </div>
    </div>
  );
});
