import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleDot, Clock3, ExternalLink, GitBranch, GitFork, Globe2, Star, Sparkles, Layers, HeartPulse, MessageSquareCode } from 'lucide-react';
import type { GithubRepository } from '../types/github';
import { BranchExplorer } from './BranchExplorer';
import { AIOverview } from './AIOverview';
import { AIHealthAnalysis } from './AIHealthAnalysis';
import { RepositoryQA } from './RepositoryQA';
import { ErrorBoundary } from './ErrorBoundary';
import { sanitizeUrl } from '../services/security';

type PreviewRepoCardProps = { name: string; description: string; language: string; color: string; stars: string };
type GithubRepoCardProps = {
  repository: GithubRepository;
  index: number;
  targetState?: { branch?: string; sha?: string; id: number } | null;
};
type RepoCardProps = PreviewRepoCardProps | GithubRepoCardProps;

function formatUpdatedDate(date: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

function normaliseHomepage(homepage: string) {
  return homepage.startsWith('http://') || homepage.startsWith('https://') ? homepage : `https://${homepage}`;
}

export const RepoCard = memo(function RepoCard(props: RepoCardProps) {
  const [activeSection, setActiveSection] = useState<'branches' | 'ai' | null>(null);
  const [persistedSection, setPersistedSection] = useState<'branches' | 'ai'>('branches');
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [aiTab, setAiTab] = useState<'overview' | 'health' | 'qa'>('overview');

  useEffect(() => {
    if (activeSection) {
      setPersistedSection(activeSection);
      setIsDrawerMounted(true);
    }
  }, [activeSection]);

  const showBranches = activeSection === 'branches';
  const showAI = activeSection === 'ai';
  const currentSection = activeSection || persistedSection;
  const isBranchesActive = showBranches || (isDrawerMounted && persistedSection === 'branches');
  const isAIActive = showAI || (isDrawerMounted && persistedSection === 'ai');

  if ('repository' in props) {
    const { repository, index, targetState } = props;
    const [owner, repoName] = repository.full_name.includes('/')
      ? repository.full_name.split('/')
      : ['', repository.name];

    useEffect(() => {
      if (targetState) {
        setActiveSection('branches');
      }
    }, [targetState?.id]);

    return (
      <motion.article
        id={`repo-card-${repository.name.toLowerCase()}`}
        data-repo-name={repository.full_name.toLowerCase()}
        className={`repository-card ${isBranchesActive ? 'branches-expanded' : ''} ${isAIActive ? 'ai-expanded' : ''} ${isDrawerMounted ? 'drawer-active' : ''}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: Math.min(index * 0.025, 0.16), ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="repository-card-heading">
          <div className="repository-name">
            <CircleDot size={15} />
            <h3>{repository.name}</h3>
          </div>
          <span className="repository-visibility">{repository.visibility}</span>
        </div>

        <p className="repository-description">{repository.description || ''}</p>

        <div className="repository-details">
          <span className="repository-language">
            <i />
            {repository.language || 'No primary language'}
          </span>
          <span><Star size={14} />{repository.stargazers_count.toLocaleString()}</span>
          <span><GitFork size={14} />{repository.forks_count.toLocaleString()}</span>
          <span><CircleDot size={14} />{repository.open_issues_count.toLocaleString()}</span>
        </div>

        <div className="repository-card-footer">
          <span><Clock3 size={13} />Updated {formatUpdatedDate(repository.updated_at)}</span>
          <div className="repository-actions">
            <button
              type="button"
              className={`repo-branches-btn ${showBranches ? 'active' : ''}`}
              onClick={() => {
                setActiveSection((prev) => (prev === 'branches' ? null : 'branches'));
              }}
              aria-expanded={showBranches}
              aria-label={`Toggle branch explorer for ${repository.name}`}
            >
              <GitBranch size={13} />
              <span>Branches</span>
            </button>

            <button
              type="button"
              className={`repo-ai-btn ${showAI ? 'active' : ''}`}
              onClick={() => {
                setActiveSection((prev) => (prev === 'ai' ? null : 'ai'));
              }}
              aria-expanded={showAI}
              aria-label={`Toggle AI insights for ${repository.name}`}
            >
              <Sparkles size={13} />
              <span>AI Insights</span>
            </button>

            <div className="repository-links">
              {repository.homepage && sanitizeUrl(repository.homepage) && (
                <a href={sanitizeUrl(repository.homepage)} target="_blank" rel="noreferrer" aria-label={`Open ${repository.name} homepage`}>
                  <Globe2 size={14} />
                </a>
              )}
              {sanitizeUrl(repository.html_url) && (
                <a href={sanitizeUrl(repository.html_url)} target="_blank" rel="noreferrer" aria-label={`Open ${repository.name} on GitHub`}>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence
          initial={false}
          onExitComplete={() => {
            setIsDrawerMounted(false);
          }}
        >
          {activeSection && (
            <motion.div
              key="repo-expandable-drawer"
              className="repo-expandable-drawer"
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: 'auto',
                opacity: 1,
                transition: {
                  height: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.22, delay: 0.02, ease: 'easeOut' },
                },
              }}
              exit={{
                height: 0,
                opacity: 0,
                transition: {
                  height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.24, ease: 'easeInOut' },
                },
              }}
              style={{ overflow: 'hidden' }}
            >
              <div className="repo-expandable-body">
                {currentSection === 'ai' && (
                  <div className="repo-ai-panel">
                    <div className="repo-ai-tabs">
                      <button
                        type="button"
                        className={`repo-ai-tab ${aiTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setAiTab('overview')}
                      >
                        <Layers size={12} />
                        <span>Architecture Overview</span>
                      </button>
                      <button
                        type="button"
                        className={`repo-ai-tab ${aiTab === 'health' ? 'active' : ''}`}
                        onClick={() => setAiTab('health')}
                      >
                        <HeartPulse size={12} />
                        <span>Health & Vitality</span>
                      </button>
                      <button
                        type="button"
                        className={`repo-ai-tab ${aiTab === 'qa' ? 'active' : ''}`}
                        onClick={() => setAiTab('qa')}
                      >
                        <MessageSquareCode size={12} />
                        <span>Ask AI (Q&A)</span>
                      </button>
                    </div>

                    <ErrorBoundary
                      fallbackTitle="AI Analysis Error"
                      fallbackMessage={`Failed to render AI analysis for ${repository.name}.`}
                      isCompact
                    >
                      {aiTab === 'overview' && (
                        <AIOverview
                          owner={owner}
                          repo={repoName}
                          branch={repository.default_branch}
                          onClose={() => setActiveSection(null)}
                        />
                      )}
                      {aiTab === 'health' && (
                        <AIHealthAnalysis
                          owner={owner}
                          repo={repoName}
                          branch={repository.default_branch}
                          onClose={() => setActiveSection(null)}
                        />
                      )}
                      {aiTab === 'qa' && (
                        <RepositoryQA
                          owner={owner}
                          repo={repoName}
                          branch={repository.default_branch}
                          isCompact
                          onClose={() => setActiveSection(null)}
                        />
                      )}
                    </ErrorBoundary>
                  </div>
                )}

                {currentSection === 'branches' && (
                  <div className="repo-branches-panel">
                    <ErrorBoundary
                      fallbackTitle="Branch Explorer Error"
                      fallbackMessage={`Failed to render branch graph for ${repository.name}.`}
                      isCompact
                    >
                      <BranchExplorer
                        owner={owner}
                        repo={repoName}
                        defaultBranch={repository.default_branch}
                        fullName={repository.full_name}
                        initialBranch={targetState?.branch || repository.default_branch}
                        initialSha={targetState?.sha}
                        onClose={() => setActiveSection(null)}
                      />
                    </ErrorBoundary>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
    );
  }

  const { name, description, language, color, stars } = props;
  return (
    <div className="repo-card preview-surface">
      <div className="repo-title">
        <span className="repo-dot" />
        {name}
      </div>
      <p>{description}</p>
      <div className="repo-footer">
        <span><i style={{ background: color }} />{language}</span>
        <span><Star size={13} /> {stars}</span>
        <span><GitFork size={13} /> 24</span>
      </div>
    </div>
  );
});
