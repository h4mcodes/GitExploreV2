# Project Specification — GitExplore

## 1. Product Identity & Purpose
- **Project Name**: GitExplore
- **Identity**: Git Repository Intelligence & Management Platform
- **Vision**: A high-density developer workbench for exploring, analyzing, investigating, and managing Git repositories. GitExplore eliminates fragmented navigation by combining commit histories, bidirectional DAG relationships, branch comparisons, code diffs, and contribution heatmaps into a single cohesive, high-performance interface.

## 2. Core Value Proposition
- **Understand Repo Evolution**: Trace how a codebase developed across branches and releases.
- **Divergence & Lineage**: Identify where branches diverged and inspect parent/child commit trees.
- **Frictionless Inspection**: View code diffs in split/unified modes, inspect commit metadata, and review file changes without cloning or switching tabs.
- **High Performance & Privacy**: Pure client-side execution, zero tracking, zero third-party telemetry, zero server storage.

## 3. Tech Stack & Non-Negotiables
- **Core**: React 19 + TypeScript 5 (Strict) + Vite 6 + React Router DOM 7
- **Styling**: Handcrafted CSS Design System (`src/index.css`) with light frosted material theme.
- **Animation & Icons**: Framer Motion + Lucide React
- **API**: Native Fetch API + GitHub REST API v3
- **Constraints**:
  - Zero external state management libraries (no Redux, Zustand).
  - Zero Tailwind or auxiliary CSS frameworks.
  - Zero backend/database.
  - Strict TypeScript with zero `any` or suppressions.
  - All public links sanitized against XSS.
