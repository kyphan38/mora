import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { CORNERS } from '../data/corners';
import { Stepper } from '../components/Stepper';
import type { Corner as CornerType } from '../types';
import { sceneUrl } from '../data/sceneManifest';

export default function Corner() {
  const setCorner = useStore((s) => s.setCorner);
  const setScreen = useStore((s) => s.setScreen);

  const [currentPage, setCurrentPage] = useState(0);

  const sortedCorners = useMemo(() => {
    return [...CORNERS].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(sortedCorners.length / itemsPerPage);

  const corner = useStore((s) => s.corner);

  const handleClick = (c: CornerType) => {
    setCorner(c);
  };

  const unifiedBottomBarStyle: React.CSSProperties = {
    flexShrink: 0,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid var(--line)',
    paddingTop: '16px',
  };

  return (
    <div style={wrapperStyle}>
      {/* 1. Scrollable Content Area */}
      <div style={scrollableAreaStyle}>
        <Stepper step={1} />
        <h2 style={headingStyle}>Choose a focus corner</h2>
        <p style={subtitleStyle}>Choose the space that fits today's state.</p>
        <div style={gridStyle}>
          {CORNERS.map((c) => {
            const alphabeticalIndex = sortedCorners.findIndex((x) => x.id === c.id);
            const pageIndex = Math.floor(alphabeticalIndex / itemsPerPage);
            const isVisible = pageIndex === currentPage;
            return (
              <button
                key={c.id}
                onClick={() => handleClick(c)}
                style={{
                  ...cardStyle,
                  display: isVisible ? undefined : 'none',
                  order: alphabeticalIndex,
                  borderColor: corner?.id === c.id ? 'var(--accent)' : undefined,
                  boxShadow: corner?.id === c.id ? '0 0 0 2px var(--accent-soft)' : undefined,
                }}
              >
                <div
                  style={{
                    ...thumbStyle,
                    backgroundImage: `url("${sceneUrl(c.id)}"), ${c.gradient}`,
                    backgroundSize: 'cover, cover',
                    backgroundPosition: 'center, center',
                    backgroundRepeat: 'no-repeat, no-repeat',
                  }}
                  data-testid="corner-thumb"
                />
                <div style={cardBodyStyle}>
                  <span style={cardNameStyle}>{c.name}</span>
                  <span style={cardDescStyle}>{c.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Fixed Bottom Bar Area (Never gets crushed or pushed out) */}
      <div style={unifiedBottomBarStyle}>
        {/* Left Column Spacer */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
          {/* If there is a Back/Prev button, place it here */}
        </div>

        {/* Center Column Pagination */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          {totalPages > 1 && (
            <div style={paginationContainerStyle} data-testid="corner-pagination">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="pagination-btn"
                style={{
                  opacity: currentPage === 0 ? 0.4 : 1,
                  cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                }}
                data-testid="prev-page-btn"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                className="pagination-btn"
                style={{
                  opacity: currentPage === totalPages - 1 ? 0.4 : 1,
                  cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                }}
                data-testid="next-page-btn"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Column Navigation Button */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setScreen('sound')}
            className="btn-primary"
            data-testid="sound-next-btn"
          >
            Sound →
          </button>
        </div>
      </div>
    </div>
  );
}

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  width: '100%',
  padding: '32px', /* CRITICAL: Fixed from '0 32px 32px' to prevent top clipping */
};

const scrollableAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  minHeight: 0,
  paddingBottom: '24px',
};

const headingStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 600,
  marginBottom: 4,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--ink-2)',
  marginBottom: 24,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-md)',
  overflow: 'hidden',
  cursor: 'pointer',
  textAlign: 'left',
  padding: 0,
  fontFamily: 'var(--font)',
  transition: 'box-shadow var(--dur) var(--ease)',
};

const thumbStyle: React.CSSProperties = {
  height: 108,
  width: '100%',
  borderRadius: 'var(--r-md) var(--r-md) 0 0',
};

const cardBodyStyle: React.CSSProperties = {
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const cardNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  color: 'var(--ink)',
};

const cardDescStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--ink-2)',
  lineHeight: 1.4,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const paginationContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};
