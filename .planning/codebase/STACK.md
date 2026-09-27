# Tech Stack & Dependencies

## Core Environment & Runtime
- **Runtime / Library**: React 19.x (`react`, `react-dom`)
- **Language**: TypeScript 5.x (`typescript`, `@types/react`, `@types/react-dom`)
- **Build Tool / Bundler**: Vite 6.x (`vite`, `@vitejs/plugin-react`)
- **Module System**: ESM (`"type": "module"`)
- **Routing**: React Router DOM 7.x (`react-router-dom`)
- **Animation**: Framer Motion (`framer-motion`)
- **Icons**: Lucide React (`lucide-react`)

## Architecture & State Philosophy
- **Client-Side SPA**: Zero backend server, zero database, fully client-side static deployment ready (e.g. Vercel, Cloudflare Pages, GitHub Pages).
- **State Management**: Local React hooks (`useState`, `useMemo`, `useCallback`, `useEffect`). No external state manager (Redux, Zustand, Recoil) required or permitted.
- **Data Fetching**: Browser-native Fetch API only (Axios not used or permitted).
- **Styling**: Single global CSS design system with CSS custom properties (`src/index.css`). No Tailwind, no CSS modules, no Sass.

## Scripts & Tooling
| Command | Action | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts the local development HMR server (default port: 5173). |
| `npm run build` | `tsc -b && vite build` | Type-checks all TS/TSX files strictly and compiles production assets into `dist/`. |
| `npm run preview` | `vite preview` | Serves the production build locally for verification. |

## Dependencies Manifest (`package.json`)
```json
{
  "name": "gitexplore",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "framer-motion": "latest",
    "lucide-react": "latest",
    "react": "latest",
    "react-dom": "latest",
    "react-router-dom": "latest"
  },
  "devDependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "typescript": "latest",
    "vite": "latest"
  }
}
```
