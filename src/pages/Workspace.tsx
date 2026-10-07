import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folders,
  FolderGit2,
  Search,
  Plus,
  Trash2,
  Tag as TagIcon,
  ExternalLink,
  Star,
  GitFork,
  ShieldCheck,
  User,
  LogOut,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Layers,
  FileCode2,
  Bookmark,
  Activity,
  ArrowUpRight,
  X,
  Compass,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  FileDiff,
  GitCommit,
  GitBranch,
  HeartPulse,
  MessageSquare,
  Cpu,
  Clock,
  Eye,
  BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EvidenceList } from '../components/EvidenceReference';
import { apiClient, BackendApiError } from '../services/api';
import type {
  AuthSession,
  SavedRepositoryItem,
  TagItem,
  WorkspaceOverview,
  InvestigationItem,
  AIAnalysisRecordItem,
} from '../types/workspace';

const PRESET_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#dc2626', // Red
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#475569', // Slate
];

export function Workspace() {
  const [session, setSession] = useState<AuthSession | null>(() => apiClient.getStoredAuth());
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [repositories, setRepositories] = useState<SavedRepositoryItem[]>([]);
  const [investigations, setInvestigations] = useState<InvestigationItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [invSearchQuery, setInvSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'repositories' | 'investigations' | 'activity'>('repositories');

  // Loading & Notification states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Investigation Modal State (D8-P5)
  const [showInvestigationModal, setShowInvestigationModal] = useState(false);
  const [newInvRepoId, setNewInvRepoId] = useState('');
  const [newInvTitle, setNewInvTitle] = useState('');
  const [newInvDescription, setNewInvDescription] = useState('');
  const [newInvBranch, setNewInvBranch] = useState('');
  const [isCreatingInv, setIsCreatingInv] = useState(false);

  // Attach AI Analysis Modal State (D8-P5)
  const [attachAnalysisInvId, setAttachAnalysisInvId] = useState<string | null>(null);
  const [attachAnalysisType, setAttachAnalysisType] = useState('REPOSITORY_OVERVIEW');
  const [attachAnalysisTitle, setAttachAnalysisTitle] = useState('');
  const [attachAnalysisSummary, setAttachAnalysisSummary] = useState('');
  const [isAttachingAnalysis, setIsAttachingAnalysis] = useState(false);

  // View AI Analysis Detail Modal (D8-P5)
  const [viewAnalysisModal, setViewAnalysisModal] = useState<{
    analysis: AIAnalysisRecordItem;
    invTitle: string;
    repoFullName: string;
  } | null>(null);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Repo Save Input
  const [repoInput, setRepoInput] = useState('');
  const [isSavingRepo, setIsSavingRepo] = useState(false);
  const [saveRepoError, setSaveRepoError] = useState<string | null>(null);

  // Tag Creation Modal
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0] || '#2563eb');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Tag Assignment Dropdown
  const [tagAssignRepoId, setTagAssignRepoId] = useState<string | null>(null);

  // Auto-dismiss notifications
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Keyboard shortcut: Escape to dismiss popover menu and modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTagModal) setShowTagModal(false);
        if (showInvestigationModal) setShowInvestigationModal(false);
        if (viewAnalysisModal) setViewAnalysisModal(null);
        if (attachAnalysisInvId) setAttachAnalysisInvId(null);
        if (tagAssignRepoId) setTagAssignRepoId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTagModal, showInvestigationModal, viewAnalysisModal, attachAnalysisInvId, tagAssignRepoId]);

  // Click outside to dismiss tag assignment popover
  useEffect(() => {
    if (!tagAssignRepoId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.ws-tag-menu') && !target.closest('.ws-repo-tag-add-btn')) {
        setTagAssignRepoId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [tagAssignRepoId]);

  // Load workspace data when session is active
  const loadWorkspaceData = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, reposData, tagsData, investigationsData] = await Promise.all([
        apiClient.getWorkspaceOverview(),
        apiClient.getSavedRepositories(),
        apiClient.getTags(),
        apiClient.getInvestigations(),
      ]);
      setOverview(overviewData);
      setRepositories(reposData);
      setTags(tagsData);
      setInvestigations(investigationsData);
    } catch (err) {
      if (err instanceof BackendApiError && err.status === 401) {
        apiClient.clearStoredAuth();
        setSession(null);
        setError('Your session has expired. Please sign in again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load workspace data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      loadWorkspaceData();
    }
  }, [session, loadWorkspaceData]);

  // Handle Authentication Submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim()) {
      setAuthError('Username is required.');
      return;
    }
    if (!authPassword.trim()) {
      setAuthError('Password is required.');
      return;
    }

    setAuthError(null);
    setIsAuthenticating(true);
    try {
      let authSession: AuthSession;
      if (authMode === 'login') {
        authSession = await apiClient.login({
          username: authUsername.trim(),
          password: authPassword.trim(),
        });
      } else {
        authSession = await apiClient.register({
          username: authUsername.trim(),
          password: authPassword.trim(),
          email: authEmail.trim() || undefined,
        });
      }
      setSession(authSession);
      setSuccessMessage(`Welcome back, @${authSession.user.username}!`);
      setAuthUsername('');
      setAuthPassword('');
      setAuthEmail('');
    } catch (err) {
      if (err instanceof BackendApiError) {
        setAuthError(err.message);
      } else {
        setAuthError('Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Quick Demo Account Login
  const handleDemoLogin = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const demoUser = `demo_dev_${Math.floor(1000 + Math.random() * 9000)}`;
      const authSession = await apiClient.register({
        username: demoUser,
        password: 'Password123!',
        email: `${demoUser}@gitexplore.io`,
      });
      setSession(authSession);
      setSuccessMessage(`Logged into demo workspace as @${demoUser}!`);
    } catch {
      try {
        const authSession = await apiClient.login({
          username: 'demo_developer',
          password: 'Password123!',
        });
        setSession(authSession);
      } catch (loginErr) {
        setAuthError(loginErr instanceof Error ? loginErr.message : 'Demo login failed');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await apiClient.logout();
    setSession(null);
    setOverview(null);
    setRepositories([]);
    setTags([]);
    setInvestigations([]);
    setSuccessMessage('Successfully signed out.');
  };

  // Handle Create Investigation (D8-P5)
  const handleCreateInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvTitle.trim()) {
      setError('Investigation title is required.');
      return;
    }
    if (!newInvRepoId) {
      setError('Please select a saved repository for this investigation.');
      return;
    }

    setIsCreatingInv(true);
    try {
      const created = await apiClient.createInvestigation({
        repositoryId: newInvRepoId,
        title: newInvTitle.trim(),
        description: newInvDescription.trim() || undefined,
        context: {
          branch: newInvBranch.trim() || undefined,
          aiAnalyses: [],
        },
      });

      setInvestigations((prev) => [created, ...prev]);
      setShowInvestigationModal(false);
      setNewInvTitle('');
      setNewInvDescription('');
      setNewInvBranch('');
      setSuccessMessage(`Investigation "${created.title}" successfully created!`);
      if (overview) {
        setOverview({
          ...overview,
          metrics: {
            ...overview.metrics,
            investigationsCount: overview.metrics.investigationsCount + 1,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create investigation');
    } finally {
      setIsCreatingInv(false);
    }
  };

  // Handle Delete Investigation (D8-P5)
  const handleDeleteInvestigation = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete investigation "${title}"?`)) {
      return;
    }
    try {
      await apiClient.deleteInvestigation(id);
      setInvestigations((prev) => prev.filter((i) => i.id !== id));
      setSuccessMessage(`Investigation "${title}" removed.`);
      if (overview) {
        setOverview({
          ...overview,
          metrics: {
            ...overview.metrics,
            investigationsCount: Math.max(0, overview.metrics.investigationsCount - 1),
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete investigation');
    }
  };

  // Handle Attach AI Analysis / Report to Investigation (D8-P5)
  const handleAttachAIAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachAnalysisInvId || !attachAnalysisSummary.trim()) {
      setError('Please provide a summary or observations for the AI analysis.');
      return;
    }

    setIsAttachingAnalysis(true);
    try {
      const updated = await apiClient.attachAIAnalysisToInvestigation(attachAnalysisInvId, {
        type: attachAnalysisType,
        title: attachAnalysisTitle.trim() || undefined,
        summary: attachAnalysisSummary.trim(),
        data: {
          summary: attachAnalysisSummary.trim(),
          attachedAt: new Date().toISOString(),
          manualEntry: true,
        },
        modelId: 'gemini-2.5-flash',
        provider: 'Google Gemini',
      });

      setInvestigations((prev) =>
        prev.map((inv) => (inv.id === attachAnalysisInvId ? updated : inv))
      );
      setAttachAnalysisInvId(null);
      setAttachAnalysisSummary('');
      setAttachAnalysisTitle('');
      setSuccessMessage('AI analysis report successfully linked to investigation!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach AI analysis');
    } finally {
      setIsAttachingAnalysis(false);
    }
  };

  // AI analysis type styling helper
  const getAnalysisTypeBadge = (type: string) => {
    switch (type) {
      case 'REPOSITORY_OVERVIEW':
        return { label: 'Repository Overview', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.28)' };
      case 'COMMIT_EXPLANATION':
        return { label: 'Commit Explainer', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.12)', border: 'rgba(192, 132, 252, 0.28)' };
      case 'DIFF_REVIEW':
        return { label: 'Diff Review', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.28)' };
      case 'BRANCH_ANALYSIS':
        return { label: 'Branch Analysis', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)', border: 'rgba(52, 211, 153, 0.28)' };
      case 'REPOSITORY_HEALTH':
        return { label: 'Repository Health', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.12)', border: 'rgba(251, 113, 133, 0.28)' };
      case 'REPOSITORY_QA':
        return { label: 'Repository Q&A', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.28)' };
      default:
        return { label: type.replace('_', ' '), color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.28)' };
    }
  };

  // Handle Saving New Repository
  const handleSaveRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = repoInput.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '');
    if (!input || !input.includes('/')) {
      setSaveRepoError('Please specify repository in owner/name format (e.g. facebook/react)');
      return;
    }

    const parts = input.split('/');
    const owner = parts[0]?.trim();
    const name = parts[1]?.trim();

    if (!owner || !name) {
      setSaveRepoError('Invalid repository format. Use owner/name.');
      return;
    }

    setIsSavingRepo(true);
    setSaveRepoError(null);

    try {
      const saved = await apiClient.saveRepository({
        owner,
        name,
        fullName: `${owner}/${name}`,
      });

      setRepositories((prev) => [saved, ...prev]);
      setRepoInput('');
      setSuccessMessage(`Saved ${saved.fullName} to workspace!`);
      apiClient.getWorkspaceOverview().then(setOverview).catch(() => {});
    } catch (err) {
      if (err instanceof BackendApiError) {
        setSaveRepoError(err.message);
      } else {
        setSaveRepoError('Could not save repository to workspace.');
      }
    } finally {
      setIsSavingRepo(false);
    }
  };

  // Handle Deleting Repository
  const handleDeleteRepository = async (id: string, fullName: string) => {
    if (!confirm(`Are you sure you want to remove '${fullName}' from your workspace?`)) {
      return;
    }

    try {
      await apiClient.deleteSavedRepository(id);
      setRepositories((prev) => prev.filter((r) => r.id !== id));
      setSuccessMessage(`Removed ${fullName} from workspace.`);
      apiClient.getWorkspaceOverview().then(setOverview).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete repository');
    }
  };

  // Handle Creating New Tag
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setIsCreatingTag(true);
    try {
      const created = await apiClient.createTag({
        name: newTagName.trim(),
        color: newTagColor,
      });
      setTags((prev) => [...prev, created]);
      setNewTagName('');
      setShowTagModal(false);
      setSuccessMessage(`Tag '${created.name}' created successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Handle Deleting Tag
  const handleDeleteTag = async (id: string, name: string) => {
    if (!confirm(`Delete tag '${name}'? This unassigns it from all repositories.`)) {
      return;
    }

    try {
      await apiClient.deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      if (selectedTagId === id) setSelectedTagId(null);
      loadWorkspaceData();
      setSuccessMessage(`Tag '${name}' deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  // Handle Assigning Tag to Repo
  const handleAssignTag = async (repoId: string, tagId: string) => {
    try {
      await apiClient.assignTagToRepository(repoId, tagId);
      setTagAssignRepoId(null);
      await loadWorkspaceData();
      setSuccessMessage('Tag attached to repository.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign tag');
    }
  };

  // Handle Removing Tag from Repo
  const handleRemoveTag = async (repoId: string, tagId: string) => {
    try {
      await apiClient.removeTagFromRepository(repoId, tagId);
      await loadWorkspaceData();
      setSuccessMessage('Tag removed from repository.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag');
    }
  };

  // Filtered Repositories
  const filteredRepositories = useMemo(() => {
    return repositories.filter((repo) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (repo.language && repo.language.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag =
        !selectedTagId ||
        repo.repositoryTags?.some((rt) => rt.tag.id === selectedTagId);

      return matchesSearch && matchesTag;
    });
  }, [repositories, searchQuery, selectedTagId]);

  // Aggregate count of AI analysis reports across all investigations (D8-P5)
  const totalAiAnalysesCount = useMemo(() => {
    return investigations.reduce((acc, inv) => {
      const analyses = inv.context?.aiAnalyses;
      return acc + (Array.isArray(analyses) ? analyses.length : 0);
    }, 0);
  }, [investigations]);

  // Filtered Investigations (D8-P5)
  const filteredInvestigations = useMemo(() => {
    if (!invSearchQuery.trim()) return investigations;
    const query = invSearchQuery.toLowerCase();
    return investigations.filter((inv) => {
      const titleMatch = inv.title.toLowerCase().includes(query);
      const descMatch = inv.description?.toLowerCase().includes(query);
      const repoMatch = inv.repository?.fullName.toLowerCase().includes(query);
      return titleMatch || descMatch || repoMatch;
    });
  }, [investigations, invSearchQuery]);

  return (
    <main className="page-shell workspace-page">
      <motion.div
        className="ws-container"
        initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Notification Banners */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.985 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="ws-alert ws-alert-success"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                className="ws-alert-dismiss"
                onClick={() => setSuccessMessage(null)}
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.985 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="ws-alert ws-alert-error"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              <button
                type="button"
                className="ws-alert-dismiss"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Unauthenticated State */}
        {!session ? (
          <motion.div
            className="ws-auth-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="ws-auth-header">
              <div className="ws-auth-icon-wrap">
                <FolderGit2 size={24} />
              </div>
              <h2 className="ws-auth-title">Developer Workspace</h2>
              <p className="ws-auth-subtitle">
                Save repositories, track investigations, and organize notes in your private workbench.
              </p>
            </div>

            {/* Auth Mode Tabs */}
            <div className="ws-auth-tabs">
              <button
                type="button"
                className={`ws-auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`ws-auth-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('register');
                  setAuthError(null);
                }}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="ws-auth-error">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="ws-auth-field">
                <label className="ws-auth-label">
                  Username
                </label>
                <input
                  type="text"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="e.g. octocat"
                  required
                  className="ws-auth-input"
                />
              </div>

              {authMode === 'register' && (
                <div className="ws-auth-field">
                  <label className="ws-auth-label">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="engineer@gitexplore.io"
                    className="ws-auth-input"
                  />
                </div>
              )}

              <div className="ws-auth-field">
                <label className="ws-auth-label">
                  Password
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="ws-auth-input"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="ws-auth-submit-btn"
              >
                <ShieldCheck size={16} />
                {isAuthenticating
                  ? 'Authenticating...'
                  : authMode === 'login'
                  ? 'Sign In to Workspace'
                  : 'Create Workspace Account'}
              </button>
            </form>

            <div className="ws-auth-demo-section">
              <p className="ws-auth-demo-text">
                Want to explore workspace features immediately?
              </p>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isAuthenticating}
                className="ws-auth-demo-btn"
              >
                <Sparkles size={14} style={{ color: '#d97706' }} />
                Launch Instant Demo Workspace
              </button>
            </div>
          </motion.div>
        ) : (
          /* Authenticated Workspace */
          <div>
            {/* Header */}
            <div className="ws-header">
              <div>
                <div className="ws-title-row">
                  <h1 className="ws-title">Workspace</h1>
                  <span className="ws-badge">V2 Cloud</span>
                </div>
                <p className="ws-subtitle">
                  Centralized intelligence dashboard for saved repositories, investigations, and research notes.
                </p>
              </div>

              <div className="ws-user-section">
                <div className="ws-user-badge">
                  <User size={14} style={{ color: '#245691' }} />
                  <span>@{session.user.username}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ws-logout-btn"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Overview Metrics — Asymmetric Primary & Secondary Hierarchy */}
            <div className="ws-stats-grid">
              <div className="ws-stat-card primary">
                <div className="ws-stat-header">
                  <span>Saved Repositories</span>
                  <span className="ws-stat-icon-wrap">
                    <FolderGit2 size={16} style={{ color: '#2563eb' }} />
                  </span>
                </div>
                <div className="ws-stat-value">
                  {overview?.metrics.savedReposCount ?? repositories.length}
                </div>
              </div>

              <div
                className="ws-stat-card"
                onClick={() => setActiveTab('investigations')}
                style={{ cursor: 'pointer' }}
                title="View investigations and AI history"
              >
                <div className="ws-stat-header">
                  <span>Investigations</span>
                  <span className="ws-stat-icon-wrap">
                    <Layers size={16} style={{ color: '#7c3aed' }} />
                  </span>
                </div>
                <div className="ws-stat-value">
                  {overview?.metrics.investigationsCount ?? investigations.length}
                </div>
                {totalAiAnalysesCount > 0 && (
                  <div style={{ fontSize: '0.6875rem', color: '#c084fc', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={11} />
                    <span>{totalAiAnalysesCount} AI report{totalAiAnalysesCount === 1 ? '' : 's'} linked</span>
                  </div>
                )}
              </div>

              <div className="ws-stat-card">
                <div className="ws-stat-header">
                  <span>Research Notes</span>
                  <span className="ws-stat-icon-wrap">
                    <FileCode2 size={16} style={{ color: '#059669' }} />
                  </span>
                </div>
                <div className="ws-stat-value">
                  {overview?.metrics.notesCount ?? 0}
                </div>
              </div>

              <div className="ws-stat-card">
                <div className="ws-stat-header">
                  <span>Bookmarks</span>
                  <span className="ws-stat-icon-wrap">
                    <Bookmark size={16} style={{ color: '#d97706' }} />
                  </span>
                </div>
                <div className="ws-stat-value">
                  {overview?.metrics.bookmarksCount ?? 0}
                </div>
              </div>
            </div>

            {/* Quick Add Repository Bar */}
            <div className="ws-save-card">
              <form onSubmit={handleSaveRepository} className="ws-save-form">
                <div className="ws-save-input-wrap">
                  <FolderGit2 size={16} className="ws-save-icon" />
                  <input
                    type="text"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="Save repository to workspace (e.g. facebook/react or torvalds/linux)"
                    className="ws-save-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingRepo || !repoInput.trim()}
                  className="ws-save-btn"
                >
                  <Plus size={16} />
                  {isSavingRepo ? 'Saving...' : 'Save Repository'}
                </button>
              </form>
              {saveRepoError && (
                <div className="ws-save-error">
                  {saveRepoError}
                </div>
              )}
            </div>

            {/* Tabs & Search Controls */}
            <div className="ws-toolbar">
              <div className="ws-tabs">
                <button
                  type="button"
                  className={`ws-tab-btn ${activeTab === 'repositories' ? 'active' : ''}`}
                  onClick={() => setActiveTab('repositories')}
                >
                  <FolderGit2 size={14} />
                  Repositories ({repositories.length})
                </button>
                <button
                  type="button"
                  className={`ws-tab-btn ${activeTab === 'investigations' ? 'active' : ''}`}
                  onClick={() => setActiveTab('investigations')}
                >
                  <BrainCircuit size={14} />
                  Investigations & AI History ({investigations.length})
                  {totalAiAnalysesCount > 0 && (
                    <span className="ws-tab-count-badge">{totalAiAnalysesCount} AI</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`ws-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                  onClick={() => setActiveTab('activity')}
                >
                  <Activity size={14} />
                  Recent Activity
                </button>
              </div>

              {activeTab === 'repositories' && (
                <div className="ws-search-wrap">
                  <Search size={14} className="ws-search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter saved repositories..."
                    className="ws-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="ws-search-clear-btn"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'investigations' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div className="ws-search-wrap">
                    <Search size={14} className="ws-search-icon" />
                    <input
                      type="text"
                      value={invSearchQuery}
                      onChange={(e) => setInvSearchQuery(e.target.value)}
                      placeholder="Filter investigations or AI logs..."
                      className="ws-search-input"
                    />
                    {invSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setInvSearchQuery('')}
                        className="ws-search-clear-btn"
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (repositories.length > 0 && !newInvRepoId) {
                        setNewInvRepoId(repositories[0]?.id || '');
                      }
                      setShowInvestigationModal(true);
                    }}
                    className="ws-save-btn"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem' }}
                  >
                    <Plus size={14} />
                    <span>New Investigation</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tags Strip */}
            {activeTab === 'repositories' && (
              <div className="ws-tags-strip">
                <span className="ws-tags-label">
                  Tags:
                </span>
                <button
                  type="button"
                  className={`ws-tag-pill ${selectedTagId === null ? 'active' : ''}`}
                  onClick={() => setSelectedTagId(null)}
                >
                  All ({repositories.length})
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={`ws-tag-pill ${selectedTagId === tag.id ? 'active' : ''}`}
                    onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: tag.color,
                        display: 'inline-block',
                      }}
                    />
                    <span>{tag.name}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTag(tag.id, tag.name);
                      }}
                      className="ws-tag-del"
                      title="Delete tag"
                    >
                      ×
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowTagModal(true)}
                  className="ws-tag-new-btn"
                >
                  <Plus size={12} />
                  New Tag
                </button>
              </div>
            )}

            {/* Main Content Area */}
            {isLoading && repositories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#2e4d70', fontStyle: 'italic' }}>
                Loading workspace intelligence...
              </div>
            ) : activeTab === 'repositories' ? (
              filteredRepositories.length === 0 ? (
                <div className="ws-empty-state">
                  <div className="ws-empty-icon">
                    <FolderGit2 size={24} />
                  </div>
                  <h3 className="ws-empty-title">
                    {searchQuery || selectedTagId ? 'No matching repositories' : 'No repositories saved yet'}
                  </h3>
                  <p className="ws-empty-desc">
                    {searchQuery || selectedTagId
                      ? 'Try adjusting your search query or tag filter to see saved repositories.'
                      : 'Save repositories using the input above or bookmark them directly while exploring profiles.'}
                  </p>
                </div>
              ) : (
                <div className="ws-grid">
                  {filteredRepositories.map((repo) => (
                    <motion.div
                      key={repo.id}
                      className="ws-repo-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div>
                        {/* Card Header */}
                        <div className="ws-repo-header">
                          <Link
                            to={`/profile/${repo.owner}?repo=${encodeURIComponent(repo.fullName)}`}
                            className="ws-repo-title"
                          >
                            <span>{repo.fullName}</span>
                            <ArrowUpRight size={14} />
                          </Link>
                          <div className="ws-repo-actions">
                            <a
                              href={`https://github.com/${repo.fullName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ws-icon-btn"
                              title="Open on GitHub"
                            >
                              <ExternalLink size={13} />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteRepository(repo.id, repo.fullName)}
                              className="ws-icon-btn danger"
                              title="Remove from workspace"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        {repo.description ? (
                          <p className="ws-repo-desc">{repo.description}</p>
                        ) : (
                          <p className="ws-repo-desc fallback">
                            No repository description provided.
                          </p>
                        )}

                        {/* Tags on Card */}
                        <div className="ws-repo-tags">
                          {repo.repositoryTags?.map((rt) => (
                            <span
                              key={rt.tag.id}
                              className="ws-repo-tag-pill"
                              style={{
                                background: `${rt.tag.color}15`,
                                border: `1px solid ${rt.tag.color}35`,
                                color: rt.tag.color,
                              }}
                            >
                              <span
                                className="ws-repo-tag-dot"
                                style={{ backgroundColor: rt.tag.color }}
                              />
                              {rt.tag.name}
                              <span
                                onClick={() => handleRemoveTag(repo.id, rt.tag.id)}
                                className="ws-repo-tag-del"
                                title="Remove tag from repository"
                              >
                                ×
                              </span>
                            </span>
                          ))}

                          {/* Tag Assignment Trigger */}
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => setTagAssignRepoId(tagAssignRepoId === repo.id ? null : repo.id)}
                              className="ws-repo-tag-add-btn"
                            >
                              <TagIcon size={10} />
                              Tag
                            </button>

                            {/* Tag Assign Popover Menu */}
                            {tagAssignRepoId === repo.id && (
                              <div className="ws-tag-menu">
                                {tags.length === 0 ? (
                                  <div style={{ padding: '0.35rem', fontSize: '0.6875rem', color: '#64748b' }}>
                                    No tags created yet.
                                  </div>
                                ) : (
                                  tags.map((t) => {
                                    const isAssigned = repo.repositoryTags?.some((rt) => rt.tag.id === t.id);
                                    return (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() =>
                                          isAssigned
                                            ? handleRemoveTag(repo.id, t.id)
                                            : handleAssignTag(repo.id, t.id)
                                        }
                                        className={`ws-tag-menu-item ${isAssigned ? 'assigned' : ''}`}
                                      >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                          <span
                                            className="ws-repo-tag-dot"
                                            style={{ backgroundColor: t.color }}
                                          />
                                          {t.name}
                                        </span>
                                        {isAssigned && <span style={{ color: '#245691', fontSize: '0.6875rem' }}>✓</span>}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Metadata */}
                      <div className="ws-repo-footer">
                        <div className="ws-repo-meta">
                          {repo.language && (
                            <span className="ws-repo-meta-item lang">
                              <span className="ws-repo-lang-dot" />
                              {repo.language}
                            </span>
                          )}
                          <span className="ws-repo-meta-item">
                            <Star size={12} style={{ color: '#d97706' }} />
                            {repo.stars}
                          </span>
                          <span className="ws-repo-meta-item">
                            <GitFork size={12} />
                            {repo.forks}
                          </span>
                        </div>
                        <Link
                          to={`/profile/${repo.owner}?repo=${encodeURIComponent(repo.fullName)}`}
                          className="ws-repo-explore"
                        >
                          <Compass size={12} />
                          Explore
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            ) : activeTab === 'investigations' ? (
              /* Investigations & AI History Tab (D8-P5) */
              <div>
                {filteredInvestigations.length === 0 ? (
                  <div className="ws-empty-state">
                    <div className="ws-empty-icon">
                      <BrainCircuit size={28} style={{ color: '#a855f7' }} />
                    </div>
                    <h3 className="ws-empty-title">
                      {invSearchQuery ? 'No matching investigations found' : 'No investigations tracked yet'}
                    </h3>
                    <p className="ws-empty-desc">
                      {invSearchQuery
                        ? 'Try modifying your search filter.'
                        : 'Capture architectural discoveries, document code issues, and link AI analysis reports into persistent investigation workspaces.'}
                    </p>
                    {!invSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          if (repositories.length > 0 && !newInvRepoId) {
                            setNewInvRepoId(repositories[0]?.id || '');
                          }
                          setShowInvestigationModal(true);
                        }}
                        className="ws-save-btn"
                        style={{ marginTop: '1rem' }}
                      >
                        <Plus size={16} />
                        <span>Create First Investigation</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="ws-investigations-grid">
                    {filteredInvestigations.map((inv) => {
                      const analyses = Array.isArray(inv.context?.aiAnalyses)
                        ? (inv.context.aiAnalyses as AIAnalysisRecordItem[])
                        : [];

                      return (
                        <motion.div
                          key={inv.id}
                          className="ws-inv-card"
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          {/* Card Header */}
                          <div className="ws-inv-header">
                            <div className="ws-inv-title-wrap">
                              <div className="ws-inv-repo-badge">
                                <FolderGit2 size={12} />
                                <span>{inv.repository?.fullName || 'Repository'}</span>
                              </div>
                              <h3 className="ws-inv-title">{inv.title}</h3>
                            </div>
                            <div className="ws-repo-actions">
                              <Link
                                to={`/profile/${inv.repository?.owner || ''}?repo=${encodeURIComponent(inv.repository?.fullName || '')}`}
                                className="ws-icon-btn"
                                title="Open Repository in Workbench"
                              >
                                <Compass size={13} />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDeleteInvestigation(inv.id, inv.title)}
                                className="ws-icon-btn danger"
                                title="Delete Investigation"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Description */}
                          {inv.description ? (
                            <p className="ws-inv-desc">{inv.description}</p>
                          ) : (
                            <p className="ws-inv-desc fallback">No description provided.</p>
                          )}

                          {/* Metadata row: Branch & Updated time */}
                          <div className="ws-inv-meta-row">
                            {inv.context?.branch && (
                              <span className="ws-inv-branch-pill">
                                <GitBranch size={11} />
                                <span>{String(inv.context.branch)}</span>
                              </span>
                            )}
                            <span className="ws-inv-date">
                              <Clock size={11} />
                              Updated {new Date(inv.updatedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          {/* AI Analysis History Section */}
                          <div className="ws-inv-analyses-section">
                            <div className="ws-inv-analyses-header">
                              <div className="ws-inv-analyses-title">
                                <Sparkles size={13} style={{ color: '#c084fc' }} />
                                <span>AI Analysis History ({analyses.length})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setAttachAnalysisInvId(inv.id);
                                  setAttachAnalysisTitle('');
                                  setAttachAnalysisSummary('');
                                }}
                                className="ws-inv-attach-btn"
                                title="Attach an AI Analysis report"
                              >
                                <Plus size={11} />
                                <span>Link AI Report</span>
                              </button>
                            </div>

                            {analyses.length === 0 ? (
                              <div className="ws-inv-empty-analyses">
                                <span>No AI reports linked to this investigation yet.</span>
                              </div>
                            ) : (
                              <div className="ws-inv-analyses-list">
                                {analyses.map((analysis, aIdx) => {
                                  const badge = getAnalysisTypeBadge(analysis.type);
                                  return (
                                    <div key={analysis.id || aIdx} className="ws-inv-analysis-item">
                                      <div className="ws-inv-analysis-item-top">
                                        <div
                                          className="ws-inv-type-pill"
                                          style={{
                                            color: badge.color,
                                            backgroundColor: badge.bg,
                                            borderColor: badge.border,
                                          }}
                                        >
                                          {badge.label}
                                        </div>
                                        {analysis.modelId && (
                                          <span className="ws-inv-model-pill">
                                            <Cpu size={10} />
                                            {analysis.modelId}
                                          </span>
                                        )}
                                      </div>

                                      {analysis.summary && (
                                        <p className="ws-inv-analysis-summary">
                                          {analysis.summary}
                                        </p>
                                      )}

                                      <div className="ws-inv-analysis-item-bottom">
                                        <span className="ws-inv-analysis-time">
                                          {analysis.createdAt
                                            ? new Date(analysis.createdAt).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                              })
                                            : 'Saved'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setViewAnalysisModal({
                                              analysis,
                                              invTitle: inv.title,
                                              repoFullName: inv.repository?.fullName || '',
                                            })
                                          }
                                          className="ws-inv-view-analysis-btn"
                                        >
                                          <Eye size={11} />
                                          <span>Inspect Report</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Activity Tab */
              <div className="ws-activity-card">
                {overview?.recentActivity && overview.recentActivity.length > 0 ? (
                  <div>
                    {overview.recentActivity.map((act) => (
                      <div key={act.id} className="ws-activity-item">
                        <div>
                          <div className="ws-activity-title">{act.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#436488', marginTop: '2px', textTransform: 'capitalize' }}>
                            Type: {act.type.replace('_', ' ')}
                          </div>
                        </div>
                        <div className="ws-activity-time">
                          {new Date(act.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ws-empty-state">
                    <div className="ws-empty-icon">
                      <Activity size={24} />
                    </div>
                    <h3 className="ws-empty-title">No recent workspace activity</h3>
                    <p className="ws-empty-desc">
                      Activity logs are automatically recorded as you save repositories, link tags, and run investigations.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Tag Creation Modal */}
      <AnimatePresence>
        {showTagModal && (
          <div className="ws-modal-backdrop" onClick={() => setShowTagModal(false)}>
            <motion.div
              className="ws-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 className="ws-modal-title">
                  <TagIcon size={18} style={{ color: '#245691' }} />
                  Create New Tag
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTagModal(false)}
                  className="ws-icon-btn"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateTag} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="ws-modal-label">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g. Production, Backend, Core, Fast"
                    required
                    className="ws-auth-input"
                  />
                </div>

                <div>
                  <label className="ws-modal-label">
                    Color Accent
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewTagColor(c)}
                        className={`ws-color-dot ${newTagColor === c ? 'active' : ''}`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                <div className="ws-modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowTagModal(false)}
                    className="ws-modal-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingTag || !newTagName.trim()}
                    className="ws-save-btn"
                  >
                    {isCreatingTag ? 'Creating...' : 'Create Tag'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Create Investigation Modal (D8-P5) */}
        {showInvestigationModal && (
          <div className="ws-modal-backdrop" onClick={() => setShowInvestigationModal(false)}>
            <motion.div
              className="ws-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 className="ws-modal-title">
                  <BrainCircuit size={18} style={{ color: '#7c3aed' }} />
                  New Investigation Workspace
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInvestigationModal(false)}
                  className="ws-icon-btn"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateInvestigation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="ws-modal-label">Associated Repository *</label>
                  {repositories.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: '#f87171' }}>
                      Please save at least one repository in your workspace before starting an investigation.
                    </p>
                  ) : (
                    <select
                      value={newInvRepoId}
                      onChange={(e) => setNewInvRepoId(e.target.value)}
                      required
                      className="ws-auth-input"
                      style={{ background: '#0f172a', color: '#f8fafc' }}
                    >
                      {repositories.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.fullName} ({r.defaultBranch})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="ws-modal-label">Investigation Title *</label>
                  <input
                    type="text"
                    value={newInvTitle}
                    onChange={(e) => setNewInvTitle(e.target.value)}
                    placeholder="e.g. Memory leak in cache manager or v2 architecture review"
                    required
                    className="ws-auth-input"
                  />
                </div>

                <div>
                  <label className="ws-modal-label">Description / Goal (Optional)</label>
                  <textarea
                    value={newInvDescription}
                    onChange={(e) => setNewInvDescription(e.target.value)}
                    placeholder="Summarize the core hypothesis, investigation goals, or problem statement..."
                    rows={3}
                    className="ws-auth-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label className="ws-modal-label">Target Branch (Optional)</label>
                  <input
                    type="text"
                    value={newInvBranch}
                    onChange={(e) => setNewInvBranch(e.target.value)}
                    placeholder="e.g. main, master, or feature/perf"
                    className="ws-auth-input"
                  />
                </div>

                <div className="ws-modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowInvestigationModal(false)}
                    className="ws-modal-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingInv || !newInvTitle.trim() || !newInvRepoId}
                    className="ws-save-btn"
                  >
                    {isCreatingInv ? 'Creating...' : 'Create Investigation'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Attach AI Report Modal (D8-P5) */}
        {attachAnalysisInvId && (
          <div className="ws-modal-backdrop" onClick={() => setAttachAnalysisInvId(null)}>
            <motion.div
              className="ws-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 className="ws-modal-title">
                  <Sparkles size={18} style={{ color: '#c084fc' }} />
                  Link AI Analysis Report
                </h3>
                <button
                  type="button"
                  onClick={() => setAttachAnalysisInvId(null)}
                  className="ws-icon-btn"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleAttachAIAnalysis} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="ws-modal-label">Analysis Type</label>
                  <select
                    value={attachAnalysisType}
                    onChange={(e) => setAttachAnalysisType(e.target.value)}
                    className="ws-auth-input"
                    style={{ background: '#0f172a', color: '#f8fafc' }}
                  >
                    <option value="REPOSITORY_OVERVIEW">Repository Overview</option>
                    <option value="COMMIT_EXPLANATION">Commit Explainer</option>
                    <option value="DIFF_REVIEW">Diff Review</option>
                    <option value="BRANCH_ANALYSIS">Branch Analysis</option>
                    <option value="REPOSITORY_HEALTH">Repository Health</option>
                    <option value="REPOSITORY_QA">Repository Q&A</option>
                  </select>
                </div>

                <div>
                  <label className="ws-modal-label">Report Title (Optional)</label>
                  <input
                    type="text"
                    value={attachAnalysisTitle}
                    onChange={(e) => setAttachAnalysisTitle(e.target.value)}
                    placeholder="e.g. Initial Overview Assessment"
                    className="ws-auth-input"
                  />
                </div>

                <div>
                  <label className="ws-modal-label">Key Findings & Summary *</label>
                  <textarea
                    value={attachAnalysisSummary}
                    onChange={(e) => setAttachAnalysisSummary(e.target.value)}
                    placeholder="Record key findings, architecture observations, or copy an AI summary..."
                    rows={4}
                    required
                    className="ws-auth-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="ws-modal-actions">
                  <button
                    type="button"
                    onClick={() => setAttachAnalysisInvId(null)}
                    className="ws-modal-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAttachingAnalysis || !attachAnalysisSummary.trim()}
                    className="ws-save-btn"
                  >
                    {isAttachingAnalysis ? 'Saving...' : 'Link to Investigation'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Inspect Saved AI Analysis Modal (D8-P5) */}
        {viewAnalysisModal && (
          <div className="ws-modal-backdrop" onClick={() => setViewAnalysisModal(null)}>
            <motion.div
              className="ws-modal ws-modal-lg"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} style={{ color: '#c084fc' }} />
                  <div>
                    <h3 className="ws-modal-title" style={{ margin: 0 }}>
                      {viewAnalysisModal.analysis.title || getAnalysisTypeBadge(viewAnalysisModal.analysis.type).label}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                      {viewAnalysisModal.invTitle} • {viewAnalysisModal.repoFullName}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewAnalysisModal(null)}
                  className="ws-icon-btn"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="ws-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Meta pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span
                    className="ws-inv-type-pill"
                    style={{
                      color: getAnalysisTypeBadge(viewAnalysisModal.analysis.type).color,
                      backgroundColor: getAnalysisTypeBadge(viewAnalysisModal.analysis.type).bg,
                      borderColor: getAnalysisTypeBadge(viewAnalysisModal.analysis.type).border,
                    }}
                  >
                    {getAnalysisTypeBadge(viewAnalysisModal.analysis.type).label}
                  </span>
                  {viewAnalysisModal.analysis.modelId && (
                    <span className="ws-inv-model-pill">
                      <Cpu size={11} />
                      {viewAnalysisModal.analysis.modelId}
                    </span>
                  )}
                  {viewAnalysisModal.analysis.createdAt && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} />
                      {new Date(viewAnalysisModal.analysis.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Summary */}
                {viewAnalysisModal.analysis.summary && (
                  <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 650, color: '#a78bfa', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Executive Summary
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#f1f5f9', lineHeight: 1.5 }}>
                      {viewAnalysisModal.analysis.summary}
                    </p>
                  </div>
                )}

                {/* Supporting Evidence References if available */}
                {Boolean(
                  viewAnalysisModal.analysis.data &&
                  typeof viewAnalysisModal.analysis.data === 'object' &&
                  'supportingEvidence' in (viewAnalysisModal.analysis.data as Record<string, unknown>) &&
                  Array.isArray((viewAnalysisModal.analysis.data as Record<string, unknown>).supportingEvidence)
                ) && (
                  <EvidenceList
                    evidence={(viewAnalysisModal.analysis.data as Record<string, unknown>).supportingEvidence as string[]}
                    owner={viewAnalysisModal.repoFullName.split('/')[0] || ''}
                    repo={viewAnalysisModal.repoFullName.split('/')[1] || ''}
                  />
                )}

                {/* Raw JSON inspection view */}
                <details style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '0.625rem' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: '#94a3b8', userSelect: 'none' }}>
                    View Raw Structured Payload
                  </summary>
                  <pre style={{ margin: '0.5rem 0 0', padding: '0.5rem', fontSize: '0.6875rem', color: '#cbd5e1', overflowX: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                    {JSON.stringify(viewAnalysisModal.analysis.data, null, 2)}
                  </pre>
                </details>
              </div>

              <div className="ws-modal-actions" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setViewAnalysisModal(null)}
                  className="ws-save-btn"
                  style={{ width: '100%' }}
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
