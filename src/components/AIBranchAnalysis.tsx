import { useEffect, useState } from 'react';
import {
  Sparkles,
  RotateCw,
  AlertCircle,
  Cpu,
  Zap,
  Clock,
  GitBranch,
  GitMerge,
  ShieldAlert,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../services/api';
import type { AIAnalysisEnvelope, BranchAnalysisData } from '../types/ai';

interface AIBranchAnalysisProps {
  owner: string;
  repo: string;
  base: string;
  head: string;
  onClose?: () => void;
}

export function AIBranchAnalysis({ owner, repo, base, head, onClose }: AIBranchAnalysisProps) {
  const [data, setData] = useState<AIAnalysisEnvelope<BranchAnalysisData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranchAnalysis = async (bypassCache = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchBranchAnalysis(owner, repo, base, head, { bypassCache });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze branch divergence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchAnalysis();
  }, [owner, repo, base, head]);

  const syncBadgeColor = (status: string) => {
    switch (status) {
      case 'SYNCED':
        return 'ai-badge-emerald';
      case 'AHEAD':
        return 'ai-badge-blue';
      case 'BEHIND':
        return 'ai-badge-amber';
      case 'DIVERGED':
      default:
        return 'ai-badge-purple';
    }
  };

  const readinessBadgeColor = (readiness: string) => {
    switch (readiness) {
      case 'READY':
        return 'ai-badge-emerald';
      case 'NEEDS_REBASE':
        return 'ai-badge-amber';
      case 'CONFLICT_RISK':
      case 'NOT_READY':
        return 'ai-badge-rose';
      default:
        return 'ai-badge-zinc';
    }
  };

  const riskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'ai-badge-emerald';
      case 'MEDIUM':
        return 'ai-badge-amber';
      case 'HIGH':
      default:
        return 'ai-badge-rose';
    }
  };

  return (
    <div className="ai-panel ai-panel-branch" data-testid="ai-branch-analysis-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title-wrap">
          <div className="ai-pill-badge">
            <Sparkles size={13} />
            <span>AI Branch Divergence Intelligence</span>
          </div>
          {data && (
            <div className="ai-meta-pills">
              {data.cached ? (
                <span className="ai-cache-pill" title={`Context Hash: ${data.contextHash}`}>
                  <Zap size={11} />
                  Cached
                </span>
              ) : (
                <span className="ai-live-pill">
                  <Clock size={11} />
                  Live AI
                </span>
              )}
              <span className="ai-model-pill">
                <Cpu size={11} />
                {data.modelId}
              </span>
            </div>
          )}
        </div>
        <div className="ai-panel-actions">
          <button
            type="button"
            className="ai-refresh-btn"
            onClick={() => fetchBranchAnalysis(true)}
            disabled={loading}
            title="Refresh analysis (bypass cache)"
            aria-label="Refresh branch analysis"
          >
            <RotateCw size={13} className={loading ? 'ai-spin' : ''} />
            <span>Refresh</span>
          </button>
          {onClose && (
            <button type="button" className="ai-close-btn" onClick={onClose} aria-label="Close AI branch analysis">
              &times;
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="ai-skeleton-wrap" aria-busy="true">
          <div className="ai-skeleton-card ai-skeleton-shimmer" style={{ height: '70px' }} />
          <div className="ai-skeleton-card ai-skeleton-shimmer" style={{ height: '110px' }} />
          <div className="ai-skeleton-card ai-skeleton-shimmer" style={{ height: '140px' }} />
        </div>
      )}

      {error && !loading && (
        <div className="ai-error-banner" role="alert">
          <AlertCircle size={16} />
          <div className="ai-error-text">
            <strong>Branch Divergence Analysis Failed</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="ai-retry-btn" onClick={() => fetchBranchAnalysis(true)}>
            Retry
          </button>
        </div>
      )}

      {data && !loading && !error && (
        <div className="ai-panel-body">
          {/* Branch coordinate breadcrumb */}
          <div className="ai-branch-breadcrumb">
            <span className="ai-branch-ref ai-badge-zinc">{base}</span>
            <ArrowRight size={13} className="ai-branch-arrow" />
            <span className="ai-branch-ref ai-badge-blue">{head}</span>
          </div>

          {/* Divergence Metrics Grid */}
          <div className="ai-status-grid">
            <div className="ai-status-card">
              <span className="ai-status-label">Sync Status</span>
              <span className={`ai-badge ${syncBadgeColor(data.data.syncStatus)}`}>
                <GitBranch size={12} />
                {data.data.syncStatus}
              </span>
            </div>

            <div className="ai-status-card">
              <span className="ai-status-label">Merge Readiness</span>
              <span className={`ai-badge ${readinessBadgeColor(data.data.mergeReadiness)}`}>
                <GitMerge size={12} />
                {data.data.mergeReadiness.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="ai-status-card">
              <span className="ai-status-label">Merge Risk</span>
              <span className={`ai-badge ${riskBadgeColor(data.data.mergeRisk)}`}>
                <ShieldAlert size={12} />
                {data.data.mergeRisk} Risk
              </span>
            </div>
          </div>

          {/* Divergence Summary */}
          <div className="ai-section">
            <p className="ai-body-text">{data.data.divergenceSummary || data.data.summary}</p>
            {data.data.aheadBehindAssessment && (
              <p className="ai-subtext-note">{data.data.aheadBehindAssessment}</p>
            )}
          </div>

          {/* Key Contributions & Notable Changes */}
          {((data.data.keyContributions && data.data.keyContributions.length > 0) ||
            (data.data.notableChanges && data.data.notableChanges.length > 0)) && (
            <div className="ai-section">
              <div className="ai-section-title">
                <GitBranch size={14} />
                <span>Key Changes & Contributions</span>
              </div>
              <ul className="ai-bullet-list">
                {(data.data.keyContributions || data.data.notableChanges || []).map(
                  (item: string, idx: number) => (
                    <li key={idx}>
                      <span className="ai-bullet-dot" />
                      <span>{item}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* Main Authors */}
          {data.data.mainAuthors && data.data.mainAuthors.length > 0 && (
            <div className="ai-section">
              <div className="ai-section-title">
                <Users size={14} />
                <span>Primary Authors</span>
              </div>
              <div className="ai-tag-group">
                {data.data.mainAuthors.map((author: string, idx: number) => (
                  <span key={idx} className="ai-tag ai-author-tag">
                    @{author}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Risk Factors */}
          {data.data.riskFactors && data.data.riskFactors.length > 0 && (
            <div className="ai-section">
              <div className="ai-section-title">
                <ShieldAlert size={14} />
                <span>Integration Risks</span>
              </div>
              <ul className="ai-bullet-list ai-risk-list">
                {data.data.riskFactors.map((risk: string, idx: number) => (
                  <li key={idx}>
                    <AlertTriangle size={13} className="ai-bullet-icon-rose" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {data.data.recommendations && data.data.recommendations.length > 0 && (
            <div className="ai-section">
              <div className="ai-section-title">
                <Lightbulb size={14} />
                <span>Merge Guidance</span>
              </div>
              <ul className="ai-bullet-list">
                {data.data.recommendations.map((rec: string, idx: number) => (
                  <li key={idx}>
                    <CheckCircle2 size={13} className="ai-bullet-icon-emerald" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
