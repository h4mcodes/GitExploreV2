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
  GitBranch,
  Clock,
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
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#64748b', // Slate
];

export function Workspace() {
  const [session, setSession] = useState<AuthSession | null>(() => apiClient.getStoredAuth());
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [repositories, setRepositories] = useState<SavedRepositoryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'repositories' | 'activity'>('repositories');

  // Loading & Error states
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

  // Tag Creation Modal / Inline
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0] || '#3b82f6');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Tag Assignment Dropdown
  const [tagAssignRepoId, setTagAssignRepoId] = useState<string | null>(null);

  // Auto-dismiss notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load workspace data when session changes
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
        setError('Your session has expired. Please log in again.');
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
      const demoUser = `demo_engineer_${Math.floor(1000 + Math.random() * 9000)}`;
      const authSession = await apiClient.register({
        username: demoUser,
        password: 'Password123!',
        email: `${demoUser}@gitexplore.io`,
      });
      setSession(authSession);
      setSuccessMessage(`Logged into demo workspace as @${demoUser}!`);
    } catch {
      // If user exists, login
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
    setSuccessMessage('Successfully logged out.');
  };

  // Handle Saving New Repository
  const handleSaveRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = repoInput.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '');
    if (!input || !input.includes('/')) {
      setSaveRepoError('Please provide a repository in format owner/name (e.g. facebook/react)');
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
      setSuccessMessage(`Saved ${saved.fullName} to your workspace!`);
      // Refresh overview stats
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
      setSuccessMessage(`Tag '${created.name}' created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Handle Deleting Tag
  const handleDeleteTag = async (id: string, name: string) => {
    if (!confirm(`Delete tag '${name}'? This removes it from all assigned repositories.`)) {
      return;
    }

    try {
      await apiClient.deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      if (selectedTagId === id) setSelectedTagId(null);
      // Reload repositories to reflect unlinked tags
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

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', width: '100%' }}>
        {/* Notification Banner */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.75rem 1.25rem',
                marginBottom: '1.5rem',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              <CheckCircle2 size={16} />
              {successMessage}
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.625rem',
                padding: '0.75rem 1.25rem',
                marginBottom: '1.5rem',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <AlertCircle size={16} />
                {error}
              </div>
              <button
                onClick={() => setError(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                }}
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unauthenticated State */}
        {!session ? (
          <div style={{ maxWidth: '480px', margin: '3rem auto 0 auto' }}>
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                padding: '2.5rem 2rem',
                borderRadius: '20px',
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#60a5fa',
                    marginBottom: '1rem',
                  }}
                >
                  <FolderGit2 size={24} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
                  Developer Workspace
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  Save repositories, run investigations, and organize notes in your private engineering dashboard.
                </p>
              </div>

              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '0.25rem',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: authMode === 'login' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: authMode === 'login' ? '#f8fafc' : '#64748b',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: authMode === 'register' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: authMode === 'register' ? '#f8fafc' : '#64748b',
                    transition: 'all 0.2s ease',
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
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '0.8125rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.375rem', letterSpacing: '0.05em' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="e.g. octocat"
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>

                {authMode === 'register' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.375rem', letterSpacing: '0.05em' }}>
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="developer@company.com"
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.875rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f8fafc',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.375rem', letterSpacing: '0.05em' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: isAuthenticating ? 0.7 : 1,
                  }}
                >
                  <ShieldCheck size={16} />
                  {isAuthenticating ? 'Authenticating...' : authMode === 'login' ? 'Sign In to Workspace' : 'Create Workspace Account'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  Want to explore workspace features immediately?
                </p>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isAuthenticating}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#e2e8f0',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                >
                  <Sparkles size={14} style={{ color: '#fbbf24' }} />
                  Launch Instant Demo Workspace
                </button>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Authenticated Workspace */
          <div>
            {/* Top Workspace Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '2rem',
                paddingBottom: '1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Workspace
                  </h1>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    V2 Cloud
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
                  Centralized intelligence dashboard for saved repositories, investigations, and annotations.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.875rem',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.8125rem',
                    color: '#e2e8f0',
                  }}
                >
                  <User size={14} style={{ color: '#60a5fa' }} />
                  <span>@{session.user.username}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.4rem 0.875rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Overview Metrics Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Saved Repositories</span>
                  <FolderGit2 size={16} style={{ color: '#3b82f6' }} />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>
                  {overview?.metrics.savedReposCount ?? repositories.length}
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Investigations</span>
                  <Layers size={16} style={{ color: '#8b5cf6' }} />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>
                  {overview?.metrics.investigationsCount ?? 0}
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Research Notes</span>
                  <FileCode2 size={16} style={{ color: '#10b981' }} />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>
                  {overview?.metrics.notesCount ?? 0}
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Bookmarks</span>
                  <Bookmark size={16} style={{ color: '#f59e0b' }} />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>
                  {overview?.metrics.bookmarksCount ?? 0}
                </div>
              </div>
            </div>

            {/* Quick Add Repository Bar */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '2rem',
              }}
            >
              <form onSubmit={handleSaveRepository} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                  <input
                    type="text"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="Save repository to workspace (e.g. facebook/react or torvalds/linux)"
                    style={{
                      width: '100%',
                      padding: '0.625rem 1rem 0.625rem 2.25rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                  <FolderGit2
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingRepo || !repoInput.trim()}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: isSavingRepo || !repoInput.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    opacity: isSavingRepo || !repoInput.trim() ? 0.6 : 1,
                  }}
                >
                  <Plus size={16} />
                  {isSavingRepo ? 'Saving...' : 'Save Repository'}
                </button>
              </form>
              {saveRepoError && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#f87171' }}>
                  {saveRepoError}
                </div>
              )}
            </div>

            {/* View Switcher & Tags Filter Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              {/* Tab Selector */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('repositories')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.45rem 0.875rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: activeTab === 'repositories' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: activeTab === 'repositories' ? '#f8fafc' : '#94a3b8',
                  }}
                >
                  <FolderGit2 size={14} />
                  Saved Repositories ({repositories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('activity')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.45rem 0.875rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: activeTab === 'activity' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: activeTab === 'activity' ? '#f8fafc' : '#94a3b8',
                  }}
                >
                  <Activity size={14} />
                  Recent Activity
                </button>
              </div>

              {/* Tag Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search saved repos..."
                    style={{
                      padding: '0.375rem 0.75rem 0.375rem 2rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      width: '180px',
                    }}
                  />
                  <Search
                    size={13}
                    style={{
                      position: 'absolute',
                      left: '0.625rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowTagModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#e2e8f0',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={13} />
                  New Tag
                </button>
              </div>
            </div>

            {/* Tag Pills Filter Bar */}
            {tags.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  marginBottom: '1.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginRight: '0.25rem' }}>
                  Tags:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTagId(null)}
                  style={{
                    padding: '0.25rem 0.625rem',
                    borderRadius: '9999px',
                    border: selectedTagId === null ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: selectedTagId === null ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: selectedTagId === null ? '#93c5fd' : '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  All ({repositories.length})
                </button>
                {tags.map((tag) => {
                  const count = repositories.filter((r) =>
                    r.repositoryTags?.some((rt) => rt.tag.id === tag.id)
                  ).length;
                  const isSelected = selectedTagId === tag.id;

                  return (
                    <div
                      key={tag.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        border: isSelected ? `1px solid ${tag.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isSelected ? `${tag.color}22` : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#f8fafc' : '#cbd5e1',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedTagId(isSelected ? null : tag.id)}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: tag.color,
                        }}
                      />
                      <span>{tag.name}</span>
                      <span style={{ opacity: 0.6, fontSize: '0.6875rem' }}>({count})</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTag(tag.id, tag.name);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginLeft: '0.25rem',
                        }}
                        title="Delete tag"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Main Content View */}
            {activeTab === 'repositories' ? (
              <div>
                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Loading workspace repositories...
                  </div>
                ) : filteredRepositories.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '4rem 2rem',
                      borderRadius: '16px',
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px dashed rgba(255, 255, 255, 0.12)',
                    }}
                  >
                    <FolderGit2 size={36} style={{ color: '#64748b', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
                      {repositories.length === 0 ? 'No repositories saved yet' : 'No matching repositories'}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#94a3b8', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                      {repositories.length === 0
                        ? 'Add open-source repositories to your workspace to track commit DAGs, branch comparisons, and code annotations.'
                        : 'Try adjusting your search query or selected tag filter.'}
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                      gap: '1.25rem',
                    }}
                  >
                    {filteredRepositories.map((repo) => (
                      <motion.div
                        key={repo.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        style={{
                          borderRadius: '16px',
                          background: 'rgba(15, 23, 42, 0.65)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          backdropFilter: 'blur(12px)',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '1rem',
                        }}
                      >
                        <div>
                          {/* Repo Title and Action Links */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <Link
                              to={`/profile/${repo.owner}`}
                              style={{
                                color: '#60a5fa',
                                fontWeight: 700,
                                fontSize: '1.0625rem',
                                textDecoration: 'none',
                                wordBreak: 'break-word',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                              }}
                            >
                              {repo.fullName}
                              <ArrowUpRight size={14} style={{ opacity: 0.7 }} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDeleteRepository(repo.id, repo.fullName)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                borderRadius: '4px',
                                transition: 'color 0.2s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                              title="Remove repository"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {repo.description && (
                            <p
                              style={{
                                fontSize: '0.8125rem',
                                color: '#94a3b8',
                                margin: '0 0 0.875rem 0',
                                lineClamp: 2,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {repo.description}
                            </p>
                          )}

                          {/* Tags assigned to this repo */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.875rem' }}>
                            {repo.repositoryTags?.map(({ tag }) => (
                              <span
                                key={tag.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '6px',
                                  background: `${tag.color}20`,
                                  border: `1px solid ${tag.color}40`,
                                  color: '#f1f5f9',
                                  fontSize: '0.6875rem',
                                  fontWeight: 500,
                                }}
                              >
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: tag.color }} />
                                {tag.name}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(repo.id, tag.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontSize: '0.75rem',
                                    marginLeft: '0.125rem',
                                  }}
                                  title="Unlink tag"
                                >
                                  ×
                                </button>
                              </span>
                            ))}

                            {/* Add Tag Dropdown / Trigger */}
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                onClick={() => setTagAssignRepoId(tagAssignRepoId === repo.id ? null : repo.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: '#94a3b8',
                                  fontSize: '0.6875rem',
                                  cursor: 'pointer',
                                }}
                              >
                                <TagIcon size={10} />
                                + Tag
                              </button>

                              {tagAssignRepoId === repo.id && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    marginTop: '0.25rem',
                                    zIndex: 20,
                                    background: '#0f172a',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                    minWidth: '140px',
                                  }}
                                >
                                  {tags.length === 0 ? (
                                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                      No tags created yet.
                                    </div>
                                  ) : (
                                    tags.map((t) => {
                                      const isAlreadyAssigned = repo.repositoryTags?.some((rt) => rt.tag.id === t.id);
                                      if (isAlreadyAssigned) return null;
                                      return (
                                        <button
                                          key={t.id}
                                          type="button"
                                          onClick={() => handleAssignTag(repo.id, t.id)}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            width: '100%',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#e2e8f0',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                          }}
                                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        >
                                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.color }} />
                                          {t.name}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Footer Metrics */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {repo.language && (
                              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{repo.language}</span>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Star size={12} style={{ color: '#fbbf24' }} />
                              {repo.stars.toLocaleString()}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <GitFork size={12} />
                              {repo.forks.toLocaleString()}
                            </span>
                          </div>

                          <a
                            href={`https://github.com/${repo.fullName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#94a3b8',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              textDecoration: 'none',
                            }}
                          >
                            <ExternalLink size={12} />
                            GitHub
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Recent Activity Feed */
              <div
                style={{
                  borderRadius: '16px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  padding: '1.5rem',
                }}
              >
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1rem' }}>
                  Chronological Workspace Activity
                </h3>
                {!overview?.recentActivity || overview.recentActivity.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '0.875rem' }}>No recent workspace events recorded.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {overview.recentActivity.map((act, index) => (
                      <div
                        key={`${act.id}-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div
                          style={{
                            padding: '0.4rem',
                            borderRadius: '8px',
                            background:
                              act.type === 'repository_saved'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : act.type === 'investigation_updated'
                                ? 'rgba(139, 92, 246, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)',
                            color:
                              act.type === 'repository_saved'
                                ? '#60a5fa'
                                : act.type === 'investigation_updated'
                                ? '#a78bfa'
                                : '#34d399',
                          }}
                        >
                          {act.type === 'repository_saved' && <FolderGit2 size={16} />}
                          {act.type === 'investigation_updated' && <Layers size={16} />}
                          {act.type === 'note_created' && <FileCode2 size={16} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
                            {act.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {act.type === 'repository_saved'
                              ? 'Saved repository'
                              : act.type === 'investigation_updated'
                              ? 'Investigation update'
                              : 'Annotation created'}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} />
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
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Tag Modal */}
      <AnimatePresence>
        {showTagModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              padding: '1rem',
            }}
            onClick={() => setShowTagModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '400px',
                borderRadius: '16px',
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              }}
            >
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
                Create Workspace Tag
              </h3>
              <form onSubmit={handleCreateTag} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.375rem' }}>
                    Tag Name
                  </label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g. Critical, Architecture, Frontend"
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.375rem' }}>
                    Badge Color
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewTagColor(c)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: c,
                          border: newTagColor === c ? '2px solid #ffffff' : '2px solid transparent',
                          cursor: 'pointer',
                          boxShadow: newTagColor === c ? '0 0 10px ' + c : 'none',
                        }}
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
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingTag || !newTagName.trim()}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: isCreatingTag || !newTagName.trim() ? 'not-allowed' : 'pointer',
                    }}
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
