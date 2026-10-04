import { motion } from 'framer-motion';
import { ArrowDownRight } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { SearchBar } from '../components/SearchBar';

export function Home() {
  return (
    <main className="page-shell home-page">
      <div className="ambient ambient-blue" />
      <div className="ambient ambient-purple" />
      <div className="ambient ambient-green" />
      <Navbar showLabel={false} />
      <section className="hero">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.68, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="glass-badge">
            <div className="liquid-capsule-refract" aria-hidden="true" />
            <div className="liquid-capsule-surface" aria-hidden="true" />
            <div className="liquid-capsule-content">
              <span className="badge-pulse" />
              <span>Explore GitHub developers</span>
              <ArrowDownRight size={14} className="liquid-capsule-arrow" />
            </div>
          </div>
          <GlassFilter />
          <h1>
            Understand the <span>&lt;code&gt;</span>
            <br />
            behind developers.
          </h1>
          <p>Explore the people, projects, and patterns shaping the open-source world.</p>
          <SearchBar />
          <div className="trust-note">
            <span className="trust-dot" />Built for curious minds <span className="note-divider" /> Private by design
          </div>
        </motion.div>

      </section>
      <footer>
        <span>GitExplore <b>·</b> Developer intelligence, made clear.</span>
      </footer>
    </main>
  );
}

function GlassFilter() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <filter
          id="container-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          {/* Generate turbulent noise for distortion */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />

          {/* Blur the turbulence pattern slightly */}
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />

          {/* Displace the source graphic with the noise */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />

          {/* Apply overall blur on the final result */}
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />

          {/* Output the result */}
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}
