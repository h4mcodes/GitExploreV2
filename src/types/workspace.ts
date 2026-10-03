export interface AuthUser {
  readonly id: string;
  readonly username: string;
  readonly email?: string | null;
  readonly avatarUrl?: string | null;
  readonly githubId?: string | null;
}

export interface AuthSession {
  readonly user: AuthUser;
  readonly token: string;
}

export interface TagItem {
  readonly id: string;
  readonly userId?: string;
  readonly name: string;
  readonly color: string;
  readonly createdAt?: string;
}

export interface RepositoryTagRelation {
  readonly tag: TagItem;
}

export interface SavedRepositoryItem {
  readonly id: string;
  readonly userId: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly description?: string | null;
  readonly language?: string | null;
  readonly stars: number;
  readonly forks: number;
  readonly defaultBranch: string;
  readonly savedAt: string;
  readonly updatedAt: string;
  readonly repositoryTags?: readonly RepositoryTagRelation[];
}

export interface InvestigationItem {
  readonly id: string;
  readonly userId: string;
  readonly repositoryId: string;
  readonly title: string;
  readonly description?: string | null;
  readonly context: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly repository?: {
    readonly id: string;
    readonly owner: string;
    readonly name: string;
    readonly fullName: string;
    readonly language?: string | null;
  };
}

export interface NoteItem {
  readonly id: string;
  readonly userId: string;
  readonly repositoryId?: string | null;
  readonly investigationId?: string | null;
  readonly targetType: 'COMMIT' | 'BRANCH' | 'DIFF' | 'REPOSITORY' | 'FILE' | 'COMPARISON';
  readonly targetRef: string;
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly repository?: {
    readonly id: string;
    readonly owner: string;
    readonly name: string;
    readonly fullName: string;
  };
  readonly investigation?: {
    readonly id: string;
    readonly title: string;
  };
}

export interface BookmarkItem {
  readonly id: string;
  readonly userId: string;
  readonly repositoryId: string;
  readonly targetType: 'COMMIT' | 'BRANCH' | 'DIFF' | 'REPOSITORY' | 'FILE' | 'COMPARISON';
  readonly targetRef: string;
  readonly label: string;
  readonly createdAt: string;
  readonly repository?: {
    readonly id: string;
    readonly owner: string;
    readonly name: string;
    readonly fullName: string;
  };
}

export interface WorkspaceOverview {
  readonly metrics: {
    readonly savedReposCount: number;
    readonly investigationsCount: number;
    readonly notesCount: number;
    readonly bookmarksCount: number;
  };
  readonly recentSavedRepositories: readonly SavedRepositoryItem[];
  readonly recentActivity: readonly {
    readonly type: 'repository_saved' | 'investigation_updated' | 'note_created';
    readonly id: string;
    readonly title: string;
    readonly timestamp: string;
  }[];
}
