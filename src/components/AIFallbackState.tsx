import { memo } from 'react';
import {
  AlertCircle,
  Clock,
  WifiOff,
  RotateCw,
  KeyRound,
  ShieldAlert,
  GitBranch,
} from 'lucide-react';

export interface AIFallbackStateProps {
  readonly error: string;
  readonly onRetry?: () => void;
  readonly isRetrying?: boolean;
  readonly featureName?: string;
  readonly isCompact?: boolean;
}

export const AIFallbackState = memo(function AIFallbackState({
  error,
  onRetry,
  isRetrying = false,
  featureName = 'AI Analysis',
  isCompact = false,
}: AIFallbackStateProps) {
  const lower = error.toLowerCase();

  let title = `${featureName} Unavailable`;
  let description = error;
  let icon = <AlertCircle size={isCompact ? 16 : 20} />;
  let badgeText = 'AI Degraded';
  let badgeClass = 'ai-fallback-badge-amber';

  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many requests')) {
    title = 'AI Rate Limit Reached';
    description =
      'The AI service request quota was reached. Please wait a moment before running another analysis.';
    icon = <Clock size={isCompact ? 16 : 20} />;
    badgeText = 'Rate Limited (429)';
    badgeClass = 'ai-fallback-badge-amber';
  } else if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('504')) {
    title = 'AI Request Timed Out';
    description =
      'The inference provider took longer than expected to complete. You can retry the analysis.';
    icon = <Clock size={isCompact ? 16 : 20} />;
    badgeText = 'Timed Out (504)';
    badgeClass = 'ai-fallback-badge-amber';
  } else if (
    lower.includes('unavailable') ||
    lower.includes('503') ||
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('offline')
  ) {
    title = 'AI Provider Offline';
    description =
      'The external AI intelligence provider is currently unreachable or experiencing service degradation.';
    icon = <WifiOff size={isCompact ? 16 : 20} />;
    badgeText = 'Provider Offline';
    badgeClass = 'ai-fallback-badge-red';
  } else if (
    lower.includes('key') ||
    lower.includes('configured') ||
    lower.includes('configuration') ||
    lower.includes('authentication failed')
  ) {
    title = 'AI Provider Not Configured';
    description =
      'Server-side Gemini API credentials are not configured or failed authentication.';
    icon = <KeyRound size={isCompact ? 16 : 20} />;
    badgeText = 'Config Required';
    badgeClass = 'ai-fallback-badge-purple';
  } else if (lower.includes('schema') || lower.includes('invalid response') || lower.includes('json')) {
    title = 'Unexpected AI Response';
    description =
      'The AI provider returned an unexpected structure that did not pass strict validation schema checks.';
    icon = <ShieldAlert size={isCompact ? 16 : 20} />;
    badgeText = 'Schema Mismatch';
    badgeClass = 'ai-fallback-badge-amber';
  }

  return (
    <div
      className={`ai-fallback-card ${isCompact ? 'ai-fallback-compact' : ''}`}
      role="alert"
      data-testid="ai-fallback-card"
    >
      <div className="ai-fallback-header">
        <div className="ai-fallback-icon-wrap">{icon}</div>
        <div className="ai-fallback-title-wrap">
          <div className="ai-fallback-headline">
            <h4>{title}</h4>
            <span className={`ai-fallback-badge ${badgeClass}`}>{badgeText}</span>
          </div>
          <p className="ai-fallback-desc">{description}</p>
        </div>
      </div>

      <div className="ai-fallback-guarantee">
        <GitBranch size={13} />
        <span>
          <strong>Deterministic Intelligence Active:</strong> Branches, commit logs, code diffs,
          and DAG graphs remain fully operational.
        </span>
      </div>

      {onRetry && (
        <div className="ai-fallback-actions">
          <button
            type="button"
            className="ai-fallback-retry-btn"
            onClick={onRetry}
            disabled={isRetrying}
            aria-label="Retry AI analysis"
          >
            <RotateCw size={13} className={isRetrying ? 'ai-spin' : ''} />
            <span>{isRetrying ? 'Retrying...' : 'Retry Analysis'}</span>
          </button>
        </div>
      )}
    </div>
  );
});
