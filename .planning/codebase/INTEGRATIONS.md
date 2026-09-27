# Integrations & External APIs

## 1. GitHub REST API v3
GitExplore interacts with the public unauthenticated GitHub REST API (`https://api.github.com`).

### Endpoints Used
| Endpoint | Method | Purpose | Consuming Service/Component |
| :--- | :--- | :--- | :--- |
| `GET /users/:username` | GET | Fetches profile metadata, avatar, stats, bio, website | `fetchGithubUser` -> `Profile.tsx` |
| `GET /users/:username/repos` | GET | Fetches first 100 repositories (`per_page=100&sort=updated`) | `fetchGithubRepositories` -> `Profile.tsx` |
| `GET /repos/:owner/:repo/branches` | GET | Fetches repository branch list (`per_page=100`) | `fetchGithubBranches` -> `BranchExplorer.tsx` |
| `GET /repos/:owner/:repo/commits` | GET | Fetches branch commit logs (`per_page=50&sha=:branch`) | `fetchGithubCommits` -> `CommitHistory.tsx` |
| `GET /repos/:owner/:repo/commits/:ref` | GET | Fetches single commit details, parent SHAs, patch files | `fetchGithubCommitDetail` -> `CommitInspection.tsx` |
| `GET /repos/:owner/:repo/compare/:base...:head` | GET | Compares branches/commits (divergence, ahead/behind, diffs) | `compareGithubBranches` -> `BranchCompare.tsx` |
| `GET /users/:username/events/public` | GET | Fetches recent public activity stream (`per_page=50`) | `fetchGithubUserEvents` -> `ContributionGraph.tsx` |

## 2. GitHub Contribution Calendar API
- **Endpoint**: `https://github-contributions-api.jogruber.de/v4/:username?y=last`
- **Fallback**: Static 365-day synthesized matrix when external service is degraded or blocked.
- **Purpose**: Generates accurate 12-month calendar activity matrix with 5 intensity color bands.

## 3. Caching & Performance Architecture
Located in `src/services/githubApi.ts`:
- **In-Memory Cache Map**: Keys formatted as `<resource_type>:<identifier>`.
- **Configured TTLs**:
  - Profiles (`fetchGithubUser`): 5 minutes
  - Repositories (`fetchGithubRepositories`): 3 minutes
  - Branches (`fetchGithubBranches`): 3 minutes
  - Commits (`fetchGithubCommits`): 5 minutes
  - Single Commits (`fetchGithubCommitDetail`): 15 minutes (immutable refs)
  - Branch Comparisons (`compareGithubBranches`): 5 minutes
  - User Events & Contributions: 5 minutes
- **In-Flight Request Deduplication**: Pending promises are tracked in `inFlightRequests` Map to prevent duplicate concurrent network requests.

## 4. Rate Limiting & Resilience
- **Rate Limit Tracker**: `getRateLimitState()` tracks `limit`, `remaining`, and `resetTime` from response headers (`x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`).
- **Degraded State Alerts**: Shows UI banners when rate limits are exhausted with exact countdown to reset time.
- **Network Status**: `NetworkStatusBanner.tsx` monitors `window.addEventListener('online'/'offline')` to inform users when offline.

## 5. Security & Sanitization
Located in `src/services/security.ts`:
- `sanitizeExternalUrl()`: Enforces strict URL scheme checking (`http:`, `https:`). Rejects `javascript:`, `data:`, `vbscript:`, and relative protocol exploits.
- `sanitizeSearchQuery()`: Strips control characters, normalizes whitespace, trims query strings.
