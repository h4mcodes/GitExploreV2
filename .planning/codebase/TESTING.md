# Testing, CI/CD & Verification

## 1. Automated Verification Pipeline
GitExplore utilizes GitHub Actions for continuous integration.

### CI Workflow (`.github/workflows/ci.yml`)
- **Trigger**: Runs on every `push` and `pull_request` targeting `main`.
- **Environment**: `ubuntu-latest`, Node.js 20.
- **Steps**:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with `cache: 'npm'`
  3. `npm ci`
  4. `npm run build` (`tsc -b && vite build`)

## 2. Local Verification Commands
Before committing or merging any changes, run:
```bash
# 1. Strict TypeScript Compile & Bundler Build
npm run build

# 2. Local Preview Verification
npm run preview
```

## 3. Manual & Interactive Test Matrix

| Feature Area | Test Scenario | Expected Result |
| :--- | :--- | :--- |
| **Search** | Empty input / whitespace | Inline validation error ("Please enter a valid GitHub username"). |
| **Search** | Valid username (e.g. `torvalds`) | Navigates to `/profile/torvalds` and loads profile + repositories. |
| **Profile** | Non-existent user (e.g. `404user-nonexistent-12345`) | Displays 404 User Not Found banner with return to search button. |
| **Rate Limiting** | GitHub 403 API rate limit exceeded | Displays rate limit exhaustion banner with countdown timer to reset. |
| **Repository Explorer** | Filter by language / Search query | Instant client-side filtering without refetching. |
| **Repository Explorer** | "Load More" pagination | Appends next 12 repositories until all filtered items are shown. |
| **Branch Explorer** | Switch active branch | Commits list reloads for selected branch; default branch highlighted. |
| **Commit History** | Click commit SHA or relationship node | Opens Commit Inspection modal with parents and diff review. |
| **Diff Viewer** | Toggle Unified vs. Split view | Renders side-by-side or inline line numbers and highlighted diff hunks. |
| **Branch Compare** | Select Base vs. Head branches | Shows ahead/behind badge, commit delta list, and cumulative file diffs. |
| **Offline Mode** | Disable network in browser DevTools | Displays persistent amber offline warning banner. |
