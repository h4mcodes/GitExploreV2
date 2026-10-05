import { useEffect, useState } from 'react';
import {
  Sparkles,
  RotateCw,
  AlertCircle,
  Cpu,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  ShieldAlert,
  Lightbulb,
  Scale,
  ChevronRight,
  Code2,
} from 'lucide-react';
import { apiClient } from '../services/api';
import type { AIAnalysisEnvelope, DiffReviewData, DiffObservation } from '../types/ai';

interface AIDiffReviewProps {
  owner: string;
  repo: string;
  base: string;
  head: string;
  onClose?: () => void;
}

export function AIDiffReview({ owner, repo, base, head, onClose }: AIDiffReviewProps) {
  const [data, setData] = useState<AIAnalysisEnvelope<DiffReviewData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const fetchDiffReview = async (bypassCache = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchDiffReview(owner, repo, base, head, { bypassCache });
      setData(response);
      if (response.data.fileReviews && response.data.fileReviews.length > 0) {
        setSelectedFile(response.data.fileReviews[0].filename);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI diff review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiffReview();
  }, [owner, repo, base, head]);

  const assessmentBadge = (assessment: string) => {
    switch (assessment) {
      case 'APPROVED':
        return {
          icon: <CheckCircle2 size={13} />,
          label: 'Ready to Merge',
          className: 'ai-badge-emerald',
        };
      case 'CHANGES_REQUESTED':
        return {
          icon: <XCircle size={13} />,
          label: 'Changes Requested',
          className: 'ai-badge-rose',
        };
      case 'HIGH_RISK':
        return {
          icon: <AlertTriangle size={13} />,
          label: 'High Risk Review',
          className: 'ai-badge-red',
        };
      default:
        return {
          icon: <Scale size={13} />,
          label: 'Neutral Assessment',
          className: 'ai-badge-blue',
        };
    }
  };

  const severityBadge = (severity: 'CRITICAL' | 'WARNING' | 'INFO') => {
    switch (severity) {
      case 'CRITICAL':
        return 'ai-badge-rose';
      case 'WARNING':
        return 'ai-badge-amber';
      case 'INFO':
      default:
        return 'ai-badge-blue';
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'added':
        return 'ai-badge-emerald';
      case 'deleted':
        return 'ai-badge-rose';
      default:
        return 'ai-badge-blue';
    }
  };

  return (
    <div className="ai-panel ai-panel-diff" data-testid="ai-diff-review-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title-wrap">
          <div className="ai-pill-badge">
            <Sparkles size={13} />
            <span>AI Code Review & Diff Audit</span>
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
            onClick={() => fetchDiffReview(true)}
            disabled={loading}
            title="Refresh review (bypass cache)"
            aria-label="Refresh diff review"
          >
            <RotateCw size={13} className={loading ? 'ai-spin' : ''} />
            <span>Refresh</span>
          </button>
          {onClose && (
            <button type="button" className="ai-close-btn" onClick={onClose} aria-label="Close AI diff review">
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
            <strong>Diff Analysis Failed</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="ai-retry-btn" onClick={() => fetchDiffReview(true)}>
            Retry
          </button>
        </div>
      )}

      {data && !loading && !error && (
        <div className="ai-panel-body">
          {/* Top assessment bar */}
          <div className="ai-diff-verdict-card">
            <div className="ai-verdict-header">
              <span className="ai-label">Review Verdict</span>
              {(() => {
                const badge = assessmentBadge(data.data.overallAssessment);
                return (
                  <span className={`ai-badge ${badge.className}`}>
                    {badge.icon}
                    {badge.label}
                  </span>
                );
              })()}
            </div>
            <p className="ai-body-text">{data.data.summary}</p>
            {data.data.netChangesSummary && (
              <div className="ai-net-changes-bar">
                <Code2 size={13} />
                <span>{data.data.netChangesSummary}</span>
              </div>
            )}
          </div>

          {/* Key Observations / High Risk Findings */}
          {((data.data.keyObservations && data.data.keyObservations.length > 0) ||
            (data.data.riskFactors && data.data.riskFactors.length > 0)) && (
            <div className="ai-section">
              <div className="ai-section-title">
                <ShieldAlert size={14} />
                <span>Critical Risks & Key Observations</span>
              </div>

              {data.data.keyObservations && data.data.keyObservations.length > 0 && (
                <div className="ai-observations-list">
                  {data.data.keyObservations.map((obs: DiffObservation, idx: number) => (
                    <div key={idx} className="ai-observation-card">
                      <div className="ai-observation-meta">
                        <span className={`ai-badge ${severityBadge(obs.severity)}`}>
                          {obs.severity}
                        </span>
                        <span className="ai-badge ai-badge-zinc">{obs.category}</span>
                        {obs.lineNumber && (
                          <span className="ai-line-ref">Line {obs.lineNumber}</span>
                        )}
                      </div>
                      <p className="ai-obs-message">{obs.message}</p>
                      {obs.suggestion && (
                        <div className="ai-suggestion-box">
                          <Lightbulb size={12} />
                          <span>{obs.suggestion}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {data.data.riskFactors && data.data.riskFactors.length > 0 && (
                <ul className="ai-bullet-list ai-risk-list">
                  {data.data.riskFactors.map((risk: string, idx: number) => (
                    <li key={idx}>
                      <AlertTriangle size={13} className="ai-bullet-icon-rose" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* File Reviews Breakdown */}
          {data.data.fileReviews && data.data.fileReviews.length > 0 && (
            <div className="ai-section">
              <div className="ai-section-title">
                <FileCode size={14} />
                <span>File Impact & Recommendations ({data.data.fileReviews.length})</span>
              </div>

              <div className="ai-files-split">
                <div className="ai-file-sidebar" role="tablist">
                  {data.data.fileReviews.map((file) => (
                    <button
                      key={file.filename}
                      type="button"
                      role="tab"
                      aria-selected={selectedFile === file.filename}
                      className={`ai-file-tab ${selectedFile === file.filename ? 'active' : ''}`}
                      onClick={() => setSelectedFile(file.filename)}
                    >
                      <span className={`ai-status-indicator ${statusBadge(file.status)}`} />
                      <span className="ai-file-tab-name" title={file.filename}>
                        {file.filename.split('/').pop()}
                      </span>
                      <ChevronRight size={12} className="ai-chevron" />
                    </button>
                  ))}
                </div>

                <div className="ai-file-content">
                  {(() => {
                    const activeReview = data.data.fileReviews.find(
                      (f) => f.filename === selectedFile
                    ) || data.data.fileReviews[0];

                    if (!activeReview) return null;

                    return (
                      <div className="ai-file-review-detail">
                        <div className="ai-file-review-header">
                          <span className="ai-file-title" title={activeReview.filename}>
                            {activeReview.filename}
                          </span>
                          <span className={`ai-badge ${statusBadge(activeReview.status)}`}>
                            {activeReview.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="ai-file-feedback">{activeReview.feedback}</p>

                        {activeReview.issuesFound && activeReview.issuesFound.length > 0 && (
                          <div className="ai-issues-subbox">
                            <span className="ai-subbox-title">Issues Noticed:</span>
                            <ul>
                              {activeReview.issuesFound.map((issue, idx) => (
                                <li key={idx}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {activeReview.observations && activeReview.observations.length > 0 && (
                          <div className="ai-file-observations">
                            {activeReview.observations.map((obs, idx) => (
                              <div key={idx} className="ai-file-observation-pill">
                                <span className={`ai-badge ${severityBadge(obs.severity)}`}>
                                  {obs.severity}
                                </span>
                                <span>{obs.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Actionable Recommendations */}
          {data.data.recommendations && data.data.recommendations.length > 0 && (
            <div className="ai-section">
              <div className="ai-section-title">
                <Lightbulb size={14} />
                <span>Actionable Review Checklist</span>
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
