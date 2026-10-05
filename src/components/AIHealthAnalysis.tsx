import { useEffect, useState } from 'react';
import {
  Sparkles,
  RotateCw,
  AlertCircle,
  Cpu,
  Zap,
  Clock,
  HeartPulse,
  TrendingUp,
  AlertTriangle,
  FileWarning,
  CheckCircle2,
  Lightbulb,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../services/api';
import type { AIAnalysisEnvelope, RepositoryHealthData } from '../types/ai';

interface AIHealthAnalysisProps {
  owner: string;
  repo: string;
  branch?: string;
  onClose?: () => void;
}

export function AIHealthAnalysis({ owner, repo, branch, onClose }: AIHealthAnalysisProps) {
  const [data, setData] = useState<AIAnalysisEnvelope<RepositoryHealthData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async (bypassCache = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchRepositoryHealth(owner, repo, branch, { bypassCache });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze repository health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [owner, repo, branch]);

  const gradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'ai-grade-a';
      case 'B':
        return 'ai-grade-b';
      case 'C':
        return 'ai-grade-c';
      case 'D':
        return 'ai-grade-d';
      case 'F':
      default:
        return 'ai-grade-f';
    }
  };

  const vitalityColor = (status: string) => {
    switch (status) {
      case 'THRIVING':
        return 'ai-badge-emerald';
      case 'HEALTHY':
        return 'ai-badge-blue';
      case 'MAINTENANCE':
        return 'ai-badge-amber';
      case 'STAGNANT':
        return 'ai-badge-orange';
      case 'AT_RISK':
      default:
        return 'ai-badge-rose';
    }
  };

  return (
    <div className="ai-panel ai-panel-health" data-testid="ai-health-analysis-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title-wrap">
          <div className="ai-pill-badge">
            <Sparkles size={13} />
            <span>AI Repository Health & Vitality</span>
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
            onClick={() => fetchHealth(true)}
            disabled={loading}
            title="Refresh analysis (bypass cache)"
            aria-label="Refresh health analysis"
          >
            <RotateCw size={13} className={loading ? 'ai-spin' : ''} />
            <span>Refresh</span>
          </button>
          {onClose && (
            <button type="button" className="ai-close-btn" onClick={onClose} aria-label="Close AI health analysis">
              &times;
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="ai-skeleton-wrap" aria-busy="true">
          <div className="ai-skeleton-card ai-skeleton-shimmer" style={{ height: '90px' }} />
          <div className="ai-skeleton-card ai-skeleton-shimmer" style={{ height: '110px' }} />
          <div className="ai-skeleton-card ai-skeleton-shimmer" style={{ height: '140px' }} />
        </div>
      )}

      {error && !loading && (
        <div className="ai-error-banner" role="alert">
          <AlertCircle size={16} />
          <div className="ai-error-text">
            <strong>Health Assessment Failed</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="ai-retry-btn" onClick={() => fetchHealth(true)}>
            Retry
          </button>
        </div>
      )}

      {data && !loading && !error && (
        <div className="ai-panel-body">
          {/* Health Score Banner */}
          <div className="ai-health-score-banner">
            <div className={`ai-health-grade-circle ${gradeColor(data.data.healthGrade)}`}>
              <span className="ai-grade-letter">{data.data.healthGrade}</span>
              <span className="ai-grade-sub">Grade</span>
            </div>

            <div className="ai-health-score-details">
              <div className="ai-health-meta-row">
                <div className="ai-vitality-badge-wrap">
                  <span className={`ai-badge ${vitalityColor(data.data.vitalityStatus)}`}>
                    <HeartPulse size={12} />
                    {data.data.vitalityStatus}
                  </span>
                </div>
                <div className="ai-health-score-num">
                  <span className="ai-score-val">{data.data.healthScore}</span>
                  <span className="ai-score-max">/100</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="ai-meter-track">
                <div
                  className={`ai-meter-fill ${gradeColor(data.data.healthGrade)}`}
                  style={{ width: `${Math.min(Math.max(data.data.healthScore, 0), 100)}%` }}
                />
              </div>

              <p className="ai-body-text ai-summary-sm">{data.data.summary}</p>
            </div>
          </div>

          {/* Trajectory & Vitality Breakdown */}
          <div className="ai-section">
            <div className="ai-section-title">
              <TrendingUp size={14} />
              <span>Growth Trajectory & Maintenance Outlook</span>
            </div>
            <p className="ai-body-text">{data.data.trajectoryAssessment}</p>

            {data.data.activityAssessment && (
              <div className="ai-callout-sub">
                <Activity size={13} />
                <span>{data.data.activityAssessment}</span>
              </div>
            )}
          </div>

          {/* Maintenance Signals */}
          {data.data.maintenanceSignals && data.data.maintenanceSignals.length > 0 && (
            <div className="ai-section">
              <div className="ai-section-title">
                <ShieldCheck size={14} />
                <span>Positive Signals</span>
              </div>
              <ul className="ai-bullet-list">
                {data.data.maintenanceSignals.map((signal: string, idx: number) => (
                  <li key={idx}>
                    <CheckCircle2 size={13} className="ai-bullet-icon-emerald" />
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Maintenance Risks */}
          {((data.data.maintenanceRisks && data.data.maintenanceRisks.length > 0) ||
            (data.data.risks && data.data.risks.length > 0)) && (
            <div className="ai-section">
              <div className="ai-section-title">
                <AlertTriangle size={14} />
                <span>Maintenance Risks & Bottlenecks</span>
              </div>
              <ul className="ai-bullet-list ai-risk-list">
                {(data.data.maintenanceRisks || data.data.risks || []).map(
                  (risk: string, idx: number) => (
                    <li key={idx}>
                      <AlertTriangle size={13} className="ai-bullet-icon-rose" />
                      <span>{risk}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* Code Churn Hotspots */}
          {data.data.codeChurnHotspots && data.data.codeChurnHotspots.length > 0 && (
            <div className="ai-section">
              <div className="ai-section-title">
                <FileWarning size={14} />
                <span>High-Churn Hotspots</span>
              </div>
              <div className="ai-hotspots-grid">
                {data.data.codeChurnHotspots.map((file: string, idx: number) => (
                  <div key={idx} className="ai-hotspot-item" title={file}>
                    <FileWarning size={12} className="ai-hotspot-icon" />
                    <span className="ai-hotspot-path">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Recommendations */}
          {((data.data.actionableRecommendations && data.data.actionableRecommendations.length > 0) ||
            (data.data.recommendations && data.data.recommendations.length > 0)) && (
            <div className="ai-section">
              <div className="ai-section-title">
                <Lightbulb size={14} />
                <span>Recommended Health Actions</span>
              </div>
              <ul className="ai-bullet-list">
                {(data.data.actionableRecommendations || data.data.recommendations || []).map(
                  (action: string, idx: number) => (
                    <li key={idx}>
                      <CheckCircle2 size={13} className="ai-bullet-icon-emerald" />
                      <span>{action}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
