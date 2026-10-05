import { useEffect, useState } from 'react';
import {
  Sparkles,
  RotateCw,
  AlertCircle,
  Cpu,
  Zap,
  Clock,
  ShieldAlert,
  FileCode,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '../services/api';
import type { AIAnalysisEnvelope, CommitExplanationData } from '../types/ai';

interface AICommitExplainerProps {
  owner: string;
  repo: string;
  sha: string;
  onClose?: () => void;
}

export function AICommitExplainer({ owner, repo, sha, onClose }: AICommitExplainerProps) {
  const [data, setData] = useState<AIAnalysisEnvelope<CommitExplanationData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanation = async (bypassCache = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchCommitExplanation(owner, repo, sha, { bypassCache });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate commit explanation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplanation();
  }, [owner, repo, sha]);

  const intentColor = (intent: string) => {
    switch (intent) {
      case 'FEATURE':
        return 'ai-badge-emerald';
      case 'BUGFIX':
        return 'ai-badge-rose';
      case 'REFACTOR':
        return 'ai-badge-blue';
      case 'PERFORMANCE':
        return 'ai-badge-purple';
      case 'SECURITY':
        return 'ai-badge-red';
      default:
        return 'ai-badge-zinc';
    }
  };

  const complexityColor = (comp?: string) => {
    switch (comp) {
      case 'HIGH':
        return 'ai-badge-rose';
      case 'MEDIUM':
        return 'ai-badge-amber';
      case 'LOW':
      default:
        return 'ai-badge-emerald';
    }
  };

  return (
    <div className="ai-panel ai-panel-commit" data-testid="ai-commit-explainer-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title-wrap">
          <div className="ai-pill-badge">
            <Sparkles size={13} />
            <span>AI Commit Forensics</span>
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
            onClick={() => fetchExplanation(true)}
            disabled={loading}
            title="Refresh commit analysis (bypass cache)"
            aria-label="Refresh commit analysis"
          >
            <RotateCw size={13} className={loading ? 'ai-spin' : ''} />
            <span>Refresh</span>
          </button>
          {onClose && (
            <button type="button" className="ai-close-btn" onClick={onClose} aria-label="Close commit explanation">
              &times;
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="ai-skeleton-container" aria-busy="true" aria-label="Analyzing commit changes">
          <div className="ai-skeleton ai-skeleton-hero" />
          <div className="ai-skeleton ai-skeleton-line" />
          <div className="ai-skeleton ai-skeleton-line short" />
        </div>
      )}

      {error && !loading && (
        <div className="ai-error-box" role="alert">
          <AlertCircle size={16} />
          <div className="ai-error-content">
            <p className="ai-error-msg">{error}</p>
            <button type="button" className="ai-retry-btn" onClick={() => fetchExplanation(true)}>
              Retry Analysis
            </button>
          </div>
        </div>
      )}

      {data && !loading && !error && (
        <div className="ai-panel-body">
          {/* Breaking Change Alert */}
          {data.data.isBreakingChange && (
            <div className="ai-breaking-banner" role="alert">
              <AlertTriangle size={15} />
              <span>Breaking Change: This commit introduces breaking changes or API shifts.</span>
            </div>
          )}

          {/* Badges Row */}
          <div className="ai-stats-row">
            <div className="ai-stat-box">
              <span className="ai-stat-label">
                <Tag size={12} /> Intent
              </span>
              <span className={`ai-badge ${intentColor(data.data.intent)}`}>
                {data.data.intent}
              </span>
            </div>
            <div className="ai-stat-box">
              <span className="ai-stat-label">Complexity</span>
              <span className={`ai-badge ${complexityColor(data.data.complexity)}`}>
                {data.data.complexity || 'LOW'}
              </span>
            </div>
          </div>

          {/* Motivation & Summary */}
          <div className="ai-summary-card">
            <h4 className="ai-card-title">What Changed & Why</h4>
            <p className="ai-summary-text">{data.data.summary}</p>
            {data.data.motivation && (
              <p className="ai-purpose-text">
                <strong>Underlying Motivation:</strong> {data.data.motivation}
              </p>
            )}
          </div>

          {/* Technical Impact */}
          {data.data.technicalImpact && (
            <div className="ai-section">
              <h4 className="ai-section-title">
                <Sparkles size={13} />
                Technical Impact & System Dynamics
              </h4>
              <p className="ai-section-desc">{data.data.technicalImpact}</p>
            </div>
          )}

          {/* Changes per file */}
          {((data.data.changesPerFile && data.data.changesPerFile.length > 0) ||
            (data.data.modifiedComponents && data.data.modifiedComponents.length > 0)) && (
            <div className="ai-section">
              <h4 className="ai-section-title">
                <FileCode size={13} />
                Key File Modifications
              </h4>
              <div className="ai-files-list">
                {(data.data.changesPerFile || data.data.modifiedComponents).map((item, idx) => (
                  <div key={idx} className="ai-file-item">
                    <div className="ai-file-header">
                      <code className="ai-file-code">{item.filename}</code>
                      {item.riskLevel && (
                        <span className={`ai-badge ${complexityColor(item.riskLevel)} text-xs`}>
                          {item.riskLevel} Risk
                        </span>
                      )}
                    </div>
                    <p className="ai-file-summary">{item.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Potential Risks */}
          {data.data.potentialRisks && data.data.potentialRisks.length > 0 && (
            <div className="ai-section ai-risks-section">
              <h4 className="ai-section-title">
                <ShieldAlert size={13} />
                Regression & Risk Vectors
              </h4>
              <ul className="ai-takeaways-list">
                {data.data.potentialRisks.map((risk, idx) => (
                  <li key={idx} className="ai-takeaway-item ai-risk-item">
                    <span className="ai-takeaway-bullet text-rose-400">⚠</span>
                    <span>{risk}</span>
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
