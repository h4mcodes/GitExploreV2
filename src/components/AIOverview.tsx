import { useEffect, useState } from 'react';
import {
  Sparkles,
  RotateCw,
  AlertCircle,
  Cpu,
  Layers,
  Activity,
  Flame,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';
import { apiClient } from '../services/api';
import type { AIAnalysisEnvelope, RepositoryOverviewData } from '../types/ai';

interface AIOverviewProps {
  owner: string;
  repo: string;
  branch?: string;
  onClose?: () => void;
}

export function AIOverview({ owner, repo, branch, onClose }: AIOverviewProps) {
  const [data, setData] = useState<AIAnalysisEnvelope<RepositoryOverviewData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async (bypassCache = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchRepositoryOverview(owner, repo, branch, { bypassCache });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate repository overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [owner, repo, branch]);

  const activityBadgeColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'ai-badge-emerald';
      case 'MODERATE':
        return 'ai-badge-blue';
      case 'LOW':
        return 'ai-badge-amber';
      default:
        return 'ai-badge-zinc';
    }
  };

  return (
    <div className="ai-panel ai-panel-overview" data-testid="ai-overview-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title-wrap">
          <div className="ai-pill-badge">
            <Sparkles size={13} />
            <span>AI Architecture Overview</span>
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
            onClick={() => fetchOverview(true)}
            disabled={loading}
            title="Refresh analysis (bypass cache)"
            aria-label="Refresh analysis"
          >
            <RotateCw size={13} className={loading ? 'ai-spin' : ''} />
            <span>Refresh</span>
          </button>
          {onClose && (
            <button type="button" className="ai-close-btn" onClick={onClose} aria-label="Close AI overview">
              &times;
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="ai-skeleton-container" aria-busy="true" aria-label="Loading AI overview">
          <div className="ai-skeleton ai-skeleton-hero" />
          <div className="ai-skeleton-grid">
            <div className="ai-skeleton ai-skeleton-card" />
            <div className="ai-skeleton ai-skeleton-card" />
          </div>
          <div className="ai-skeleton ai-skeleton-line" />
          <div className="ai-skeleton ai-skeleton-line short" />
        </div>
      )}

      {error && !loading && (
        <div className="ai-error-box" role="alert">
          <AlertCircle size={16} />
          <div className="ai-error-content">
            <p className="ai-error-msg">{error}</p>
            <button type="button" className="ai-retry-btn" onClick={() => fetchOverview(true)}>
              Retry Analysis
            </button>
          </div>
        </div>
      )}

      {data && !loading && !error && (
        <div className="ai-panel-body">
          {/* Executive Summary */}
          <div className="ai-summary-card">
            <p className="ai-summary-text">{data.data.summary}</p>
            {data.data.purpose && (
              <p className="ai-purpose-text">
                <strong>Core Purpose:</strong> {data.data.purpose}
              </p>
            )}
          </div>

          {/* Activity & Maintenance Stats */}
          <div className="ai-stats-row">
            <div className="ai-stat-box">
              <span className="ai-stat-label">
                <Activity size={12} /> Activity Level
              </span>
              <span className={`ai-badge ${activityBadgeColor(data.data.activityLevel)}`}>
                {data.data.activityLevel}
              </span>
            </div>
            {data.data.growthTrajectory && (
              <div className="ai-stat-box">
                <span className="ai-stat-label">Trajectory</span>
                <span className="ai-stat-val">{data.data.growthTrajectory}</span>
              </div>
            )}
            <div className="ai-stat-box ai-stat-maintenance">
              <span className="ai-stat-label">Maintenance Verdict</span>
              <span className="ai-stat-val text-sm">{data.data.maintenanceAssessment}</span>
            </div>
          </div>

          {/* Tech Stack */}
          {((data.data.primaryStack && data.data.primaryStack.length > 0) ||
            (data.data.techStack && data.data.techStack.length > 0)) && (
            <div className="ai-section">
              <h4 className="ai-section-title">
                <Layers size={13} />
                Detected Technology Stack
              </h4>
              <div className="ai-tags-wrap">
                {(data.data.primaryStack || []).map((tech, idx) => (
                  <span key={idx} className="ai-tag ai-tag-primary">
                    {tech}
                  </span>
                ))}
                {(data.data.techStack || [])
                  .filter((t) => !(data.data.primaryStack || []).includes(t))
                  .map((tech, idx) => (
                    <span key={idx} className="ai-tag ai-tag-secondary">
                      {tech}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Key Takeaways */}
          {data.data.keyTakeaways && data.data.keyTakeaways.length > 0 && (
            <div className="ai-section">
              <h4 className="ai-section-title">
                <CheckCircle2 size={13} />
                Key Takeaways for Developers
              </h4>
              <ul className="ai-takeaways-list">
                {data.data.keyTakeaways.map((item, idx) => (
                  <li key={idx} className="ai-takeaway-item">
                    <span className="ai-takeaway-bullet">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Churn & Hotspots */}
          {data.data.hotspotAnalysis && data.data.hotspotAnalysis.criticalFiles && data.data.hotspotAnalysis.criticalFiles.length > 0 && (
            <div className="ai-section ai-hotspots-section">
              <h4 className="ai-section-title">
                <Flame size={13} />
                Architecture Hotspots & Churn Areas
              </h4>
              <div className="ai-hotspots-box">
                {data.data.hotspotAnalysis.observations && (
                  <p className="ai-hotspots-obs">{data.data.hotspotAnalysis.observations}</p>
                )}
                <div className="ai-hotspot-files">
                  {data.data.hotspotAnalysis.criticalFiles.map((file, idx) => (
                    <code key={idx} className="ai-file-code">
                      {file}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
