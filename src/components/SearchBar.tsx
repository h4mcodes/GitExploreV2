import { ArrowUpRight, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { sanitizeUsername } from '../services/security';

export function SearchBar() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = sanitizeUsername(username.trim());
    if (!cleanUsername) {
      setError('Please enter a valid GitHub username.');
      return;
    }
    setError('');
    navigate(`/profile/${encodeURIComponent(cleanUsername)}`);
  }

  return (
    <motion.form
      className={`search-card${error ? ' has-error' : ''}`}
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.58, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
    >
      <Search className="search-icon" size={20} />
      <input
        aria-label="GitHub username"
        value={username}
        onChange={(event) => { setUsername(event.target.value); if (error) setError(''); }}
        placeholder="Search GitHub username..."
      />
      <motion.button
        type="submit"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      >
        Explore <ArrowUpRight size={16} />
      </motion.button>
      {error && <span className="search-error" role="alert">{error}</span>}
    </motion.form>

  );
}
