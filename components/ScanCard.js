'use client';

import Link from 'next/link';

export default function ScanCard({ scan, index, showBloomImage }) {
  const { _id, imageUrl, status, result, createdAt } = scan;

  const date = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isAnalyzing = status === 'analyzing' || status === 'pending';
  const displayImage = (showBloomImage && result?.flowerImageUrl) ? result.flowerImageUrl : imageUrl;

  return (
    <Link
      href={`/library/${_id}`}
      className="scan-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', overflow: 'hidden' }}>
        <img
          src={displayImage}
          alt={result?.commonName || 'Seed scan'}
          className="scan-card-image"
          style={{ width: '100%', height: '100%', objectFit: 'cover', margin: 0 }}
          loading="lazy"
        />
        <span 
          className={`status-badge ${status}`}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 10,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            background: 'rgba(15, 23, 42, 0.45)',
            border: status === 'complete' ? '1px solid rgba(34, 197, 94, 0.35)' 
                  : status === 'failed' ? '1px solid rgba(239, 68, 68, 0.35)' 
                  : status === 'analyzing' ? '1px solid rgba(245, 158, 11, 0.35)'
                  : '1px solid rgba(156, 163, 175, 0.35)',
            color: status === 'complete' ? '#4ade80'
                 : status === 'failed' ? '#f87171'
                 : status === 'analyzing' ? '#fbbf24'
                 : '#d1d5db',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
        >
          <span className={`status-dot ${status}`} />
          {status === 'analyzing' && 'Analyzing'}
          {status === 'pending' && 'Pending'}
          {status === 'complete' && 'Done'}
          {status === 'failed' && 'Failed'}
        </span>
      </div>

      <div className="scan-card-body">
        <div className="scan-card-header">
          <div className="scan-card-info">
            {isAnalyzing ? (
              <>
                <div className="skeleton skeleton-text" style={{ width: '140px' }} />
                <div className="skeleton skeleton-text" style={{ width: '100px' }} />
              </>
            ) : (
              <>
                <div className="scan-card-name">
                  {result?.commonName || 'Unknown Seed'}
                </div>
                {result?.scientificName && (
                  <div className="scan-card-scientific">
                    {result.scientificName}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="scan-card-meta">
          {status === 'complete' && result?.difficulty && (
            <span className="tag">
              {result.difficulty === 'Easy' && '🟢'}
              {result.difficulty === 'Moderate' && '🟡'}
              {result.difficulty === 'Hard' && '🔴'}
              {result.difficulty}
            </span>
          )}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>{date}</span>
        </div>
      </div>
    </Link>
  );
}
