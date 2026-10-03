import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Compass, LayoutGrid } from 'lucide-react';

interface NavbarProps {
  showLabel?: boolean;
}

export function Navbar({ showLabel = true }: NavbarProps) {
  const location = useLocation();
  const isWorkspace = location.pathname.startsWith('/workspace');

  return (
    <motion.header
      className="nav-shell"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', color: 'inherit' }}>
        <div className="brand-mark" aria-label="GitHub"><svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.39v-1.51c-2.24.49-2.71-1.08-2.71-1.08-.36-.93-.87-1.18-.87-1.18-.71-.49.05-.48.05-.48.78.06 1.19.8 1.19.8.7 1.19 1.84.85 2.29.65.07-.51.27-.85.5-1.05-1.79-.2-3.67-.9-3.67-4A3.14 3.14 0 0 1 3.64 5.2c-.08-.2-.35-1 .08-2.07 0 0 .67-.21 2.2.8A7.63 7.63 0 0 1 8 3.64a7.7 7.7 0 0 1 2.08.29c1.53-1.01 2.2-.8 2.2-.8.43 1.07.16 1.87.08 2.07a3.14 3.14 0 0 1 .84 2.18c0 3.11-1.89 3.8-3.69 4 .28.24.53.72.53 1.45v2.17c0 .22.14.46.55.38A8 8 0 0 0 8 0Z" /></svg></div>
        <span className="brand-name">Git<span>Explore</span></span>
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: 'auto', marginRight: '1rem' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            textDecoration: 'none',
            color: !isWorkspace ? '#f8fafc' : '#94a3b8',
            background: !isWorkspace ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            border: !isWorkspace ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <Compass size={14} />
          Explore
        </Link>
        <Link
          to="/workspace"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            textDecoration: 'none',
            color: isWorkspace ? '#f8fafc' : '#94a3b8',
            background: isWorkspace ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            border: isWorkspace ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <LayoutGrid size={14} />
          Workspace
        </Link>
      </nav>

      {showLabel && (
        <div className="product-label">
          <span className="product-title">GitHub Developer Intelligence</span>
          <span className="product-author">- By H4MCODES</span>
        </div>
      )}
    </motion.header>
  );
}
