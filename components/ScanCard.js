'use client';

import Link from 'next/link';

export default function ScanCard({ scan, index }) {
  const { _id, imageUrl, status, result, createdAt } = scan;

  const date = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isAnalyzing = status === 'analyzing' || status === 'pending';

  return (
    <Link
      href={`/library/${_id}`}
      className="scan-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <img
        src={imageUrl}
        alt={result?.commonName || 'Seed scan'}
        className="scan-card-image"
        loading="lazy"
      />

      <div className="scan-card-body">
        <div className="scan-card-header">
          <div>
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
          <span className={`status-badge ${status}`}>
            <span className={`status-dot ${status}`} />
            {status === 'analyzing' && 'Analyzing'}
            {status === 'pending' && 'Pending'}
            {status === 'complete' && 'Done'}
            {status === 'failed' && 'Failed'}
          </span>
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
          <span>{date}</span>
        </div>
      </div>
    </Link>
  );
}
