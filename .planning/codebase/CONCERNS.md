# Technical Concerns, Debt & Constraints

## 1. GitHub API Rate Limits
- **Unauthenticated Rate Limit**: GitHub imposes a strict limit of **60 requests per hour per IP address** for unauthenticated REST calls.
- **Impact**: Heavy exploration of deep commit histories or large comparison diffs across multiple repositories can consume this quota quickly.
- **Mitigation Implemented**:
  - In-memory caching with tuned TTLs (3m - 15m) and in-flight request deduplication.
  - Rate limit tracking with countdown banners.
- **Future Improvement**: Optional user-provided Personal Access Token (PAT) stored exclusively in `sessionStorage` (never persisted to disk or sent to external servers) to unlock 5,000 req/hr.

## 2. 100-Repository Fetch Boundary
- **Current Limitation**: GitHub API returns max 100 repositories per page. GitExplore currently requests `per_page=100&sort=updated`.
- **Impact**: Users with >100 public repositories only see their 100 most recently active repositories.
- **Mitigation Implemented**: UI explicitly labels stats as "Loaded Repositories" and "Loaded Stars/Forks".
- **Future Improvement**: Multi-page pagination or streaming repository loader.

## 3. GitHub Contributions CORS & Third-Party Fallback
- **Detail**: GitHub does not expose the raw SVG contribution calendar through its public REST API v3 without GraphQL authentication.
- **Current Solution**: Uses the community proxy API (`github-contributions-api.jogruber.de`) with a local synthetic fallback algorithm if the proxy is unavailable.
- **Future Improvement**: Add local event aggregation fallback directly from `/users/:username/events/public`.

## 4. Large Diff Parsing & Memory
- **Detail**: Massive commits (e.g. 50+ changed files or thousand-line lockfiles) can strain DOM rendering.
- **Mitigation Implemented**: File-by-file collapsed accordions, memoized diff parsing, chunked line rendering.
