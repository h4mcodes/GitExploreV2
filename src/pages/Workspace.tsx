import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { apiClient, BackendApiError } from '../services/api';
import type {
  AuthSession,
  SavedRepositoryItem,
  TagItem,
  WorkspaceOverview,
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
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'repositories' | 'activity'>('repositories');

  // Loading & Notification states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Load workspace data when session is active
  const loadWorkspaceData = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, reposData, tagsData] = await Promise.all([
        apiClient.getWorkspaceOverview(),
        apiClient.getSavedRepositories(),
        apiClient.getTags(),
      ]);
      setOverview(overviewData);
      setRepositories(reposData);
      setTags(tagsData);
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
    setSuccessMessage('Successfully signed out.');
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

  return (
    <main className="page-shell workspace-page" style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      <div className="ambient ambient-blue" />
      <div className="ambient ambient-purple" />
      <div className="ambient ambient-green" />

      <Navbar showLabel={false} />

      <div className="ws-container">
        {/* Notification Banners */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#b91c1c',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '1.25rem',
                }}
              >
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#2e4d70',
                    textTransform: 'uppercase',
                    marginBottom: '0.375rem',
                    letterSpacing: '0.04em',
                  }}
                >
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
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#2e4d70',
                      textTransform: 'uppercase',
                      marginBottom: '0.375rem',
                      letterSpacing: '0.04em',
                    }}
                  >
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

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#2e4d70',
                    textTransform: 'uppercase',
                    marginBottom: '0.375rem',
                    letterSpacing: '0.04em',
                  }}
                >
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

            <div
              style={{
                textAlign: 'center',
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(35, 70, 108, 0.1)',
              }}
            >
              <p style={{ fontSize: '0.75rem', color: '#436488', marginBottom: '0.75rem', fontWeight: 500 }}>
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

            {/* Overview Metrics */}
            <div className="ws-stats-grid">
              <div className="ws-stat-card">
                <div className="ws-stat-header">
                  <span>Saved Repositories</span>
                  <FolderGit2 size={16} style={{ color: '#2563eb' }} />
                </div>
                <div className="ws-stat-value">
                  {overview?.metrics.savedReposCount ?? repositories.length}
                </div>
              </div>

              <div className="ws-stat-card">
                <div className="ws-stat-header">
                  <span>Investigations</span>
                  <Layers size={16} style={{ color: '#7c3aed' }} />
                </div>
                <div className="ws-stat-value">
                  {overview?.metrics.investigationsCount ?? 0}
                </div>
              </div>

              <div className="ws-stat-card">
                <div className="ws-stat-header">
                  <span>Research Notes</span>
                  <FileCode2 size={16} style={{ color: '#059669' }} />
                </div>
                <div className="ws-stat-value">
                  {overview?.metrics.notesCount ?? 0}
                </div>
              </div>

              <div className="ws-stat-card">
                <div className="ws-stat-header">
                  <span>Bookmarks</span>
                  <Bookmark size={16} style={{ color: '#d97706' }} />
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
                  <FolderGit2
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#436488',
                    }}
                  />
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
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600 }}>
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
                  className={`ws-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                  onClick={() => setActiveTab('activity')}
                >
                  <Activity size={14} />
                  Recent Activity
                </button>
              </div>

              {activeTab === 'repositories' && (
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#436488',
                    }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter saved repositories..."
                    style={{
                      padding: '0.45rem 0.75rem 0.45rem 2rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.8)',
                      color: '#183350',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Tags Strip */}
            {activeTab === 'repositories' && (
              <div className="ws-tags-strip">
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2e4d70', marginRight: '0.25rem' }}>
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
                      style={{ marginLeft: '4px', opacity: 0.7, cursor: 'pointer' }}
                      title="Delete tag"
                    >
                      ×
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowTagModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    border: '1px dashed rgba(35, 70, 108, 0.3)',
                    background: 'transparent',
                    color: '#245691',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
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
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Link
                            to={`/profile/${repo.owner}?repo=${encodeURIComponent(repo.fullName)}`}
                            className="ws-repo-title"
                          >
                            <span>{repo.fullName}</span>
                            <ArrowUpRight size={14} style={{ opacity: 0.6 }} />
                          </Link>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                          <p className="ws-repo-desc" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                            No repository description provided.
                          </p>
                        )}

                        {/* Tags on Card */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.875rem' }}>
                          {repo.repositoryTags?.map((rt) => (
                            <span
                              key={rt.tag.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '9999px',
                                background: `${rt.tag.color}15`,
                                border: `1px solid ${rt.tag.color}35`,
                                color: rt.tag.color,
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: rt.tag.color,
                                }}
                              />
                              {rt.tag.name}
                              <span
                                onClick={() => handleRemoveTag(repo.id, rt.tag.id)}
                                style={{ cursor: 'pointer', marginLeft: '2px', opacity: 0.8 }}
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
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '9999px',
                                border: '1px dashed rgba(35, 70, 108, 0.25)',
                                background: 'transparent',
                                color: '#436488',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <TagIcon size={10} />
                              Tag
                            </button>

                            {/* Tag Assign Popover Menu */}
                            {tagAssignRepoId === repo.id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  marginTop: '4px',
                                  zIndex: 100,
                                  minWidth: '150px',
                                  padding: '0.35rem',
                                  borderRadius: '8px',
                                  background: 'rgba(255, 255, 255, 0.96)',
                                  border: '1px solid rgba(35, 70, 108, 0.2)',
                                  boxShadow: '0 8px 20px rgba(25, 45, 70, 0.15)',
                                  backdropFilter: 'blur(10px)',
                                }}
                              >
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
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          width: '100%',
                                          padding: '0.3rem 0.5rem',
                                          borderRadius: '4px',
                                          border: 'none',
                                          background: isAssigned ? 'rgba(36, 86, 145, 0.1)' : 'transparent',
                                          color: '#183350',
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          textAlign: 'left',
                                        }}
                                      >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                          <span
                                            style={{
                                              width: '6px',
                                              height: '6px',
                                              borderRadius: '50%',
                                              backgroundColor: t.color,
                                            }}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {repo.language && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, color: '#183350' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#245691' }} />
                              {repo.language}
                            </span>
                          )}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Star size={12} style={{ color: '#d97706' }} />
                            {repo.stars}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <GitFork size={12} />
                            {repo.forks}
                          </span>
                        </div>
                        <Link
                          to={`/profile/${repo.owner}?repo=${encodeURIComponent(repo.fullName)}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: '#245691',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <Compass size={12} />
                          Explore
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
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
      </div>

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
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#2e4d70',
                      textTransform: 'uppercase',
                      marginBottom: '0.375rem',
                    }}
                  >
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
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#2e4d70',
                      textTransform: 'uppercase',
                      marginBottom: '0.375rem',
                    }}
                  >
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowTagModal(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: '1px solid rgba(35, 70, 108, 0.2)',
                      color: '#436488',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
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
      </AnimatePresence>
    </main>
  );
}
