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

  return (
    <div style={wrapperStyle}>
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
                  backgroundImage: `url("${sceneUrl(c.name)}"), ${c.gradient}`,
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

      <div style={bottomBarStyle}>
        {totalPages > 1 && (
          <div style={paginationContainerStyle} data-testid="corner-pagination">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              style={{
                ...paginationBtnStyle,
                opacity: currentPage === 0 ? 0.4 : 1,
                cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              }}
              data-testid="prev-page-btn"
            >
              Prev
            </button>
            <span style={pageIndicatorStyle}>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              style={{
                ...paginationBtnStyle,
                opacity: currentPage === totalPages - 1 ? 0.4 : 1,
                cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
              }}
              data-testid="next-page-btn"
            >
              Next
            </button>
          </div>
        )}
        <button onClick={() => setScreen('sound')} style={nextBtnStyle}>
          Sound →
        </button>
      </div>
    </div>
  );
}

const wrapperStyle: React.CSSProperties = {
  padding: '0 32px 32px',
  flex: 1,
  overflow: 'auto',
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



const bottomBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 24,
};

const nextBtnStyle: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#ffffff',
  border: '1px solid var(--accent)',
  borderRadius: 'var(--r-pill)',
  padding: '8px 22px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  marginLeft: 'auto',
};

const paginationContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
};

const paginationBtnStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-pill)',
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--ink-2)',
  fontFamily: 'var(--font)',
  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
};

const pageIndicatorStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--ink-3)',
};
