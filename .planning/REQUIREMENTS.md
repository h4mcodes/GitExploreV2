# Requirements & Acceptance Criteria

## 1. Functional Requirements Matrix

### Phase 1: Foundation & Shell [COMPLETE]
- [x] **REQ-1.1**: Responsive app shell with navigation, branded hero, and footer.
- [x] **REQ-1.2**: Frosted glass material aesthetic with CSS design system tokens in `src/index.css`.
- [x] **REQ-1.3**: Accessible keyboard navigation and visible focus rings on all interactive elements.

### Phase 2: Profile Intelligence [COMPLETE]
- [x] **REQ-2.1**: GitHub username search with validation and form submission handling.
- [x] **REQ-2.2**: Direct route navigation to `/profile/:username`.
- [x] **REQ-2.3**: Real GitHub user profile data display (avatar, handle, bio, company, location, blog, stats, join date).
- [x] **REQ-2.4**: Loading skeletons, 404 user-not-found states, and retryable network error banners.

### Phase 3: Repository Intelligence [COMPLETE]
- [x] **REQ-3.1**: Fetch and display public repositories up to 100 entries per user.
- [x] **REQ-3.2**: Real-time client-side search across name, description, and language.
- [x] **REQ-3.3**: Dynamic language dropdown and multi-criteria sorting (Recently updated, Stars, Forks, Newest, Name).
- [x] **REQ-3.4**: Client-side incremental pagination (12 cards per batch with "Load More").
- [x] **REQ-3.5**: Real-time aggregate statistics for loaded repositories, stars, and forks.

### Phase 4: Git History & DAG Intelligence [COMPLETE]
- [x] **REQ-4.1**: Branch explorer with branch switcher, default branch pinning, and protected branch badges.
- [x] **REQ-4.2**: Commit history explorer with commit SHA links, author avatars, messages, and relative dates.
- [x] **REQ-4.3**: Bidirectional DAG relationship graph modeling identifying merge commits, root origins, and children.
- [x] **REQ-4.4**: 12-Month contribution calendar matrix and rolling 72-hour categorized event activity feed.

### Phase 5: Change Investigation & Diffs [COMPLETE]
- [x] **REQ-5.1**: Single commit inspection modal with parent hashes, file stats, and commit metadata.
- [x] **REQ-5.2**: Syntax-highlighted code diff viewer supporting both Unified (Inline) and Split (Side-by-Side) modes.
- [x] **REQ-5.3**: Branch-to-branch comparison showing ahead/behind counts, commit deltas, and multi-file diff trees.

### Phase 6: Reliability & Engineering Hardening [COMPLETE]
- [x] **REQ-6.1**: In-memory caching with resource TTLs and in-flight request deduplication.
- [x] **REQ-6.2**: Rate-limit header tracking with reset countdown alerts.
- [x] **REQ-6.3**: React Error Boundaries providing diagnostic traces and recovery resets.
- [x] **REQ-6.4**: Offline network detection banner with auto-reconnection notification.
- [x] **REQ-6.5**: URL security sanitization blocking `javascript:` and dangerous URI schemes.

### Phase 7: Production Readiness [COMPLETE]
- [x] **REQ-7.1**: Automated GitHub Actions CI pipeline executing typecheck and build validation.
- [x] **REQ-7.2**: Zero TypeScript compilation errors (`tsc -b`).
- [x] **REQ-7.3**: Synchronized project documentation (`README.md`, `AGENTS.md`, `skills.md`, `PROJECT_HANDOFF.md`).
