import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';

export function Home() {
  return (
    <main className="page-shell home-page">
      {/* Focused Centered Hero & Search Section */}
      <section className="hero-section" aria-labelledby="hero-title">
        <motion.div
          className="hero-header-box"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 id="hero-title" className="hero-headline">
            Deep Git Intelligence.
            <span className="hero-subheadline">Built for Serious Developers.</span>
          </h1>

          <p className="hero-description">
            Deconstruct commit DAGs, trace ahead/behind branch divergence, detect codebase churn hotspots, and review code diffs with context-grounded AI intelligence.
          </p>

          <div className="hero-search-wrapper">
            <SearchBar />
          </div>
        </motion.div>
      </section>

      {/* Quiet Minimal Anchored Footer */}
      <footer className="home-minimal-footer" aria-label="Site Footer">
        <div className="footer-brand font-mono">
          <div className="brand-dot" />
          <span className="brand-title">GitExplore v2.0</span>
          <span className="brand-divider">/</span>
          <span className="brand-tagline">Repository Intelligence Platform</span>
        </div>

        <div className="footer-meta font-mono">
          <span className="status-indicator-green" />
          <span className="status-text">440 Tests Passing</span>
          <span className="meta-sep">·</span>
          <Link to="/workspace" className="footer-link">Workspace</Link>
          <span className="meta-sep">·</span>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-link">
            GitHub API
          </a>
          <span className="meta-sep">·</span>
          <span className="footer-mit">MIT</span>
        </div>
      </footer>
    </main>
  );
}
