import React, { useState } from 'react';
import {
  Sparkles,
  MessageSquareCode,
  Send,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Zap,
  Clock,
  Cpu,
  X,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../services/api';
import type { AIAnalysisEnvelope, RepositoryQAData } from '../types/ai';
import { EvidenceList } from './EvidenceReference';

export interface RepositoryQAProps {
  owner: string;
  repo: string;
  branch?: string;
  initialQuestion?: string;
  onClose?: () => void;
  isCompact?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'What is the primary architecture and purpose?',
  'What are the critical file churn hotspots?',
  'How has commit velocity and momentum evolved?',
  'What notable architectural patterns are in place?',
];

export function RepositoryQA({
  owner,
  repo,
  branch,
  initialQuestion = '',
  onClose,
  isCompact = false,
}: RepositoryQAProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [activeQuery, setActiveQuery] = useState(initialQuestion);
  const [result, setResult] = useState<AIAnalysisEnvelope<RepositoryQAData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = async (queryText: string, bypassCache = false) => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      setError('Please enter a question about the repository.');
      return;
    }

    setLoading(true);
    setError(null);
    setActiveQuery(trimmed);

    try {
      const response = await apiClient.askRepositoryQA(owner, repo, trimmed, {
        branch,
        bypassCache,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to investigate repository question.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !loading) {
      askQuestion(question);
    }
  };

  const handleChipClick = (suggested: string) => {
    setQuestion(suggested);
    askQuestion(suggested);
  };

  const confidenceBadge = (confidence: string) => {
    switch (confidence.toUpperCase()) {
      case 'HIGH':
        return (
          <span className="ai-qa-confidence ai-confidence-high" title="Grounding confidence: High">
            <CheckCircle2 size={11} />
            High Confidence
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="ai-qa-confidence ai-confidence-medium" title="Grounding confidence: Medium">
            <AlertTriangle size={11} />
            Medium Confidence
          </span>
        );
      case 'LOW':
        return (
          <span className="ai-qa-confidence ai-confidence-low" title="Grounding confidence: Low">
            <AlertCircle size={11} />
            Low Confidence
          </span>
        );
      default:
        return (
          <span className="ai-qa-confidence ai-confidence-high">
            <CheckCircle2 size={11} />
            {confidence}
          </span>
        );
    }
  };

  return (
    <div
      className={`ai-panel ai-panel-qa ${isCompact ? 'ai-panel-compact' : ''}`}
      data-testid="repository-qa-panel"
    >
      {/* Panel Header */}
      <div className="ai-panel-header">
        <div className="ai-panel-title-wrap">
          <div className="ai-pill-badge ai-pill-badge-qa">
            <MessageSquareCode size={13} />
            <span>Repository Q&A Assistant</span>
          </div>
          {result && (
            <div className="ai-meta-pills">
              {result.cached ? (
                <span className="ai-cache-pill" title={`Context Hash: ${result.contextHash}`}>
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
                {result.modelId}
              </span>
            </div>
          )}
        </div>

        <div className="ai-panel-actions">
          {result && (
            <button
              type="button"
              className="ai-refresh-btn"
              onClick={() => askQuestion(activeQuery, true)}
              disabled={loading}
              title="Re-ask question bypassing cache"
              aria-label="Refresh answer"
            >
              <RotateCw size={13} className={loading ? 'ai-spin' : ''} />
              <span>Re-analyze</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="ai-close-btn"
              onClick={onClose}
              aria-label="Close Q&A assistant"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Suggested Questions (when empty or initial) */}
      {!result && !loading && (
        <div className="ai-qa-prompt-section">
          <div className="ai-qa-suggestions-label">
            <HelpCircle size={12} />
            <span>Suggested Investigations:</span>
          </div>
          <div className="ai-qa-chips-grid">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="ai-qa-chip-btn"
                onClick={() => handleChipClick(q)}
              >
                <Sparkles size={11} />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Question Form */}
      <form onSubmit={handleSubmit} className="ai-qa-form">
        <div className="ai-qa-input-wrapper">
          <input
            type="text"
            className="ai-qa-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
            placeholder="Ask a question about this repository's code, commits, or evolution..."
            disabled={loading}
            maxLength={500}
            aria-label="Question about repository"
          />
          <span className="ai-qa-char-count">{question.length}/500</span>
          <button
            type="submit"
            className="ai-qa-submit-btn"
            disabled={loading || !question.trim()}
            aria-label="Submit question"
          >
            {loading ? <RotateCw size={13} className="ai-spin" /> : <Send size={13} />}
            <span>Ask</span>
          </button>
        </div>
      </form>

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="ai-qa-loading-box"
          >
            <div className="ai-qa-loading-header">
              <Sparkles size={14} className="ai-spin" />
              <span>Analyzing repository telemetry, commit DAG, and file churn...</span>
            </div>
            <div className="ai-loading-shimmer-bar" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && !loading && (
        <div className="ai-error-box" role="alert">
          <div className="ai-error-content">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="ai-retry-btn"
            onClick={() => askQuestion(activeQuery)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Result Display */}
      {result && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="ai-qa-result-container"
        >
          {/* Question Query Badge & Confidence */}
          <div className="ai-qa-query-header">
            <div className="ai-qa-query-text">
              <span className="ai-qa-query-prefix">Q:</span>
              <span className="ai-qa-query-val">{activeQuery}</span>
            </div>
            {confidenceBadge(result.data.confidence)}
          </div>

          {/* Direct Answer */}
          <div className="ai-qa-answer-card">
            <p className="ai-qa-answer-text">{result.data.answer}</p>
          </div>

          {/* Supporting Evidence */}
          <EvidenceList
            evidence={result.data.supportingEvidence}
            owner={owner}
            repo={repo}
            branch={branch}
            title="Supporting Repository Evidence"
          />

          {/* Limitations (if any) */}
          {result.data.limitations && (
            <div className="ai-qa-limitations-box">
              <div className="ai-qa-limitations-header">
                <Info size={13} />
                <span>Data Scope Limitations</span>
              </div>
              <p className="ai-qa-limitations-text">{result.data.limitations}</p>
            </div>
          )}

          {/* Suggested Follow-ups */}
          {result.data.suggestedFollowUps && result.data.suggestedFollowUps.length > 0 && (
            <div className="ai-qa-followups-section">
              <span className="ai-qa-followups-label">Suggested Follow-up Questions:</span>
              <div className="ai-qa-chips-grid">
                {result.data.suggestedFollowUps.map((followUp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="ai-qa-followup-chip"
                    onClick={() => handleChipClick(followUp)}
                  >
                    <span>{followUp}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
