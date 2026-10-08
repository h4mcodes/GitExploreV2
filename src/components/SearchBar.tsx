import { ArrowUpRight, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { sanitizeUsername } from '../services/security';

interface SearchBarProps {
  onSelectPreset?: (username: string) => void;
}

export function SearchBar({ onSelectPreset: _ }: SearchBarProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = sanitizeUsername(username.trim());
    if (!cleanUsername) {
      setError('Please enter a valid GitHub username.');
      inputRef.current?.focus();
      return;
    }
    setError('');
    navigate(`/profile/${encodeURIComponent(cleanUsername)}`);
  }

  function handleClear() {
    setUsername('');
    setError('');
    inputRef.current?.focus();
  }

  return (
    <motion.form
      className={`search-card${error ? ' has-error' : ''}${isFocused ? ' focused' : ''}`}
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <Search className="search-icon" size={18} />
      <input
        ref={inputRef}
        aria-label="GitHub username"
        value={username}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => {
          setUsername(event.target.value);
          if (error) setError('');
        }}
        placeholder="Search GitHub username or organization (e.g. torvalds, antfu, shadcn)..."
      />

      {!username && !isFocused && (
        <span className="search-kbd-hint font-mono" title="Press / to search">
          <kbd>/</kbd>
        </span>
      )}

      <AnimatePresence>
        {username && (
          <motion.button
            type="button"
            onClick={handleClear}
            className="search-clear-btn"
            aria-label="Clear search input"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.75 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <X size={13} strokeWidth={2.4} />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        className="search-submit-btn"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      >
        <span>Analyze</span>
        <ArrowUpRight size={15} />
      </motion.button>

      {error && <span className="search-error" role="alert">{error}</span>}
    </motion.form>
  );
}
