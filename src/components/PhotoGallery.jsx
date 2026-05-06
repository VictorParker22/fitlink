import { useState } from 'react';
import { IconX, IconTrash, IconChevronRight } from './Icons';

const CATEGORY_LABELS = {
  front: '🧍 Front',
  side: '🧍‍♂️ Side',
  back: '🔄 Back',
  other: '📷 Other',
};

export default function PhotoGallery({ photos, onDelete, canDelete = true }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState([]);
  const [deleting, setDeleting] = useState(null);

  if (!photos || photos.length === 0) return null;

  // Group photos by month
  const grouped = {};
  photos.forEach((p) => {
    const d = new Date(p.taken_at);
    const key = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  const handleCompareToggle = (photo) => {
    if (!compareMode) return;
    setComparePhotos((prev) => {
      if (prev.find((p) => p.id === photo.id)) {
        return prev.filter((p) => p.id !== photo.id);
      }
      if (prev.length >= 2) return [prev[1], photo];
      return [...prev, photo];
    });
  };

  const handleDelete = async (photo) => {
    if (!onDelete) return;
    setDeleting(photo.id);
    try {
      await onDelete(photo);
    } finally {
      setDeleting(null);
      setSelectedPhoto(null);
    }
  };

  return (
    <div className="photo-gallery">
      {/* Compare toggle */}
      <div className="flex-row flex-between mb-base">
        <p className="text-small" style={{ color: 'var(--text-tertiary)' }}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
        <button
          className={`btn btn-sm ${compareMode ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setCompareMode(!compareMode);
            setComparePhotos([]);
          }}
        >
          {compareMode ? 'Done' : 'Compare'}
        </button>
      </div>

      {/* Compare viewer */}
      {compareMode && comparePhotos.length === 2 && (
        <div className="compare-viewer mb-lg">
          <div className="compare-side">
            <img src={comparePhotos[0].photo_url} alt="Before" />
            <span className="compare-label">
              {new Date(comparePhotos[0].taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div className="compare-divider">
            <IconChevronRight size={16} color="var(--text-tertiary)" />
          </div>
          <div className="compare-side">
            <img src={comparePhotos[1].photo_url} alt="After" />
            <span className="compare-label">
              {new Date(comparePhotos[1].taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      )}

      {compareMode && comparePhotos.length < 2 && (
        <div className="compare-hint mb-base">
          <p className="text-small">Select {2 - comparePhotos.length} photo{comparePhotos.length === 0 ? 's' : ''} to compare</p>
        </div>
      )}

      {/* Photo grid grouped by month */}
      {Object.entries(grouped).map(([month, monthPhotos]) => (
        <div key={month} className="mb-lg">
          <p className="text-small mb-sm" style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{month}</p>
          <div className="photo-grid">
            {monthPhotos.map((photo) => {
              const isSelected = comparePhotos.find((p) => p.id === photo.id);
              return (
                <div
                  key={photo.id}
                  className={`photo-thumb ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    if (compareMode) {
                      handleCompareToggle(photo);
                    } else {
                      setSelectedPhoto(photo);
                    }
                  }}
                >
                  <img src={photo.photo_url} alt={`${photo.category} - ${photo.taken_at}`} loading="lazy" />
                  <span className="photo-cat-badge">{CATEGORY_LABELS[photo.category] || photo.category}</span>
                  {isSelected && (
                    <div className="photo-check-overlay">
                      <span className="photo-check-num">{comparePhotos.indexOf(photo) + 1}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Full-screen viewer */}
      {selectedPhoto && (
        <div className="photo-viewer-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="photo-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="flex-row flex-between mb-base">
              <div>
                <p style={{ fontWeight: 600 }}>{CATEGORY_LABELS[selectedPhoto.category]}</p>
                <p className="text-small" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(selectedPhoto.taken_at).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex-row gap-sm">
                {canDelete && (
                  <button
                    className="btn btn-icon"
                    onClick={() => handleDelete(selectedPhoto)}
                    disabled={deleting === selectedPhoto.id}
                    style={{ color: 'var(--red)' }}
                  >
                    {deleting === selectedPhoto.id
                      ? <span className="btn-spinner" style={{ width: 16, height: 16 }} />
                      : <IconTrash size={18} />
                    }
                  </button>
                )}
                <button className="btn btn-icon" onClick={() => setSelectedPhoto(null)}>
                  <IconX size={20} />
                </button>
              </div>
            </div>
            <img
              src={selectedPhoto.photo_url}
              alt={selectedPhoto.category}
              className="photo-viewer-img"
            />
            {selectedPhoto.notes && (
              <p className="text-small mt-base" style={{ color: 'var(--text-secondary)' }}>{selectedPhoto.notes}</p>
            )}
          </div>
        </div>
      )}

      <style>{`
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-sm);
        }
        .photo-thumb {
          position: relative;
          aspect-ratio: 3/4;
          border-radius: var(--radius-md);
          overflow: hidden;
          cursor: pointer;
          border: 2px solid transparent;
          transition: border-color var(--transition-fast), transform var(--transition-fast);
        }
        .photo-thumb:active { transform: scale(0.96); }
        .photo-thumb.selected { border-color: var(--accent); }
        .photo-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-cat-badge {
          position: absolute;
          bottom: 4px;
          left: 4px;
          font-size: 9px;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px);
          padding: 2px 6px;
          border-radius: var(--radius-xs);
          color: white;
        }
        .photo-check-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255,95,59,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .photo-check-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--accent);
          color: white;
          font-weight: 700;
          font-size: var(--fs-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .compare-viewer {
          display: flex;
          gap: var(--space-sm);
          align-items: stretch;
          background: var(--bg-card);
          border: var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-base);
          overflow: hidden;
        }
        .compare-side {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-sm);
        }
        .compare-side img {
          width: 100%;
          aspect-ratio: 3/4;
          object-fit: cover;
          border-radius: var(--radius-md);
        }
        .compare-label {
          font-size: var(--fs-xs);
          color: var(--text-tertiary);
          font-weight: 600;
        }
        .compare-divider {
          display: flex;
          align-items: center;
          padding: 0 2px;
        }
        .compare-hint {
          background: var(--bg-card);
          border: var(--border);
          border-radius: var(--radius-md);
          padding: var(--space-base);
          text-align: center;
        }
        .photo-viewer-overlay {
          position: fixed;
          inset: 0;
          z-index: 1500;
          background: rgba(0,0,0,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-lg);
        }
        .photo-viewer {
          width: 100%;
          max-width: 430px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .photo-viewer-img {
          width: 100%;
          border-radius: var(--radius-lg);
        }
      `}</style>
    </div>
  );
}
