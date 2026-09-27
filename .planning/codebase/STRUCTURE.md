# Directory Structure & File Map

```
gitexplore/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automated CI workflow (Node 20, tsc, vite build)
├── .planning/
│   ├── codebase/                  # Mapped codebase documentation
│   │   ├── ARCHITECTURE.md
│   │   ├── CONCERNS.md
│   │   ├── CONVENTIONS.md
│   │   ├── INTEGRATIONS.md
│   │   ├── STACK.md
│   │   ├── STRUCTURE.md
│   │   └── TESTING.md
│   ├── onboarding/
│   │   └── SUMMARY.md             # Onboarding summary and action guide
│   ├── PROJECT.md                 # Core project definition and constraints
│   ├── REQUIREMENTS.md            # Functional requirements & acceptance criteria
│   ├── ROADMAP.md                 # Product roadmap & phase statuses
│   └── STATE.md                   # Current execution status & active phase
├── public/
│   └── vite.svg                   # Static public assets
├── src/
│   ├── assets/                    # Bundled graphical assets
│   ├── components/
│   │   ├── BranchCompare.tsx      # Branch divergence & multi-file diff view
│   │   ├── BranchExplorer.tsx     # Branch selector, search, default branch pin
│   │   ├── CommitHistory.tsx      # Commit logs, DAG node graph & lineage drawer
│   │   ├── CommitInspection.tsx   # Single commit modal & patch inspection
│   │   ├── ContributionGraph.tsx  # 12-month calendar matrix & 72h event feed
│   │   ├── DiffViewer.tsx         # Unified & split side-by-side diff renderer
│   │   ├── ErrorBoundary.tsx      # React error boundary with diagnostics & reset
│   │   ├── GlassDropdown.tsx      # Accessible frosted glass custom select
│   │   ├── Navbar.tsx             # Main branding header & navigation bar
│   │   ├── NetworkStatusBanner.tsx# Real-time online/offline detector & banner
│   │   ├── ProfileCard.tsx        # Profile header & identity presenter
│   │   ├── RepoCard.tsx           # Interactive repo card (preview + active modes)
│   │   ├── SearchBar.tsx          # Clean username search form with validation
│   │   └── StatsCard.tsx          # Stat metric presentation component
│   ├── pages/
│   │   ├── Home.tsx               # Landing page, search hero, preview dashboard
│   │   └── Profile.tsx            # Full repository intelligence workbench
│   ├── services/
│   │   ├── githubApi.ts           # Unified GitHub REST API client, cache & DAG helper
│   │   └── security.ts            # URL protocol validator & input sanitizer
│   ├── types/
│   │   └── github.ts              # Strict TypeScript models & API interfaces
│   ├── App.tsx                    # Root routing container & global ErrorBoundary
│   ├── index.css                  # Global design system tokens & frosted glass CSS
│   ├── main.tsx                   # React 19 root mount & StrictMode
│   └── vite-env.d.ts              # Vite client types
├── AGENTS.md                      # Agent behavioral guidelines & project rules
├── PROJECT_HANDOFF.md             # Comprehensive handoff documentation
├── README.md                      # Public project overview & quickstart
├── skills.md                      # Skills and technical capability catalog
├── index.html                     # HTML5 single-page application entrypoint
├── package.json                   # Project dependencies and script runner
├── tsconfig.app.json              # App TypeScript configuration
├── tsconfig.json                  # Root TypeScript configuration
├── tsconfig.node.json             # Node / Vite TypeScript configuration
├── vercel.json                    # Single-page app routing rewrites for Vercel
└── vite.config.ts                 # Vite bundler configuration
```
