'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import PlantingInfo from '../../../components/PlantingInfo';

export default function ScanDetail({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [rescanning, setRescanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchScan = useCallback(async () => {
    try {
      const response = await fetch(`/api/scan/${id}`);
      if (response.ok) {
        const data = await response.json();
        setScan(data);
      } else if (response.status === 404) {
        router.push('/library');
      }
    } catch (error) {
      console.error('Failed to fetch scan:', error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchScan();
  }, [fetchScan]);

  // Auto-refresh while analyzing
  useEffect(() => {
    if (scan?.status === 'analyzing' || scan?.status === 'pending') {
      const interval = setInterval(fetchScan, 2500);
      return () => clearInterval(interval);
    }
  }, [scan?.status, fetchScan]);

  const handleRescan = async () => {
    setRescanning(true);
    try {
      const response = await fetch(`/api/scan/${id}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        showToast('Re-analyzing seed...', 'success');
        fetchScan();
      } else {
        throw new Error('Rescan failed');
      }
    } catch (error) {
      showToast('Failed to rescan. Try again.', 'error');
    } finally {
      setRescanning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this scan? This cannot be undone.')) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/scan/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Scan deleted', 'success');
        setTimeout(() => router.push('/library'), 800);
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      showToast('Failed to delete. Try again.', 'error');
      setDeleting(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/scan/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (response.ok) {
        showToast('Analysis cancelled', 'success');
        fetchScan();
      } else {
        throw new Error('Cancel failed');
      }
    } catch (error) {
      showToast('Failed to cancel analysis. Try again.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main>
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading scan details...</p>
          </div>
        </main>
      </>
    );
  }

  if (!scan) {
    return (
      <>
        <Navbar />
        <main>
          <div className="loading-container">
            <p>Scan not found</p>
            <Link href="/library" className="btn btn-primary">
              ← Back to Library
            </Link>
          </div>
        </main>
      </>
    );
  }

  const isAnalyzing = scan.status === 'analyzing' || scan.status === 'pending';

  // Build a list of all images for the carousel
  const carouselImages = [];
  if (scan?.imageUrl) {
    carouselImages.push({ url: scan.imageUrl, label: '📷 Scanned Seed' });
  }
  if (scan?.status === 'complete' && scan.result) {
    if (scan.result.flowerImageUrl) {
      carouselImages.push({ url: scan.result.flowerImageUrl, label: '🌸 Grown Plant' });
    }
    // Reference seed images from the web
    if (scan.result.seedImageUrls && Array.isArray(scan.result.seedImageUrls)) {
      scan.result.seedImageUrls.slice(0, 3).forEach((url) => {
        if (url !== scan.imageUrl) {
          carouselImages.push({ url, label: '🌱 Seed Reference' });
        }
      });
    }
    // Other plant/flower images
    if (scan.result.flowerImageUrls && Array.isArray(scan.result.flowerImageUrls)) {
      scan.result.flowerImageUrls.forEach((url) => {
        // Skip duplicate of main flower or seed image
        if (
          url !== scan.result.flowerImageUrl && 
          url !== scan.imageUrl && 
          (!scan.result.seedImageUrls || !scan.result.seedImageUrls.includes(url))
        ) {
          carouselImages.push({ url, label: '🌸 Plant Photo' });
        }
      });
    }
  }

  return (
    <>
      <Navbar />
      <main>
        <div className="detail-container">
          
          {/* Header Actions Row */}
          <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <Link href="/library" className="detail-back" style={{ margin: 0 }}>
              ← Back to Library
            </Link>
            <div style={{ display: 'flex', gap: '10px' }}>
              {isAnalyzing ? (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={cancelling}
                    style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  >
                    🚫 {cancelling ? 'Cancelling...' : 'Cancel'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleRescan}
                    disabled={rescanning}
                  >
                    🔄 {rescanning ? 'Rescanning...' : 'Force Rescan'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={handleRescan}
                    disabled={rescanning}
                  >
                    🔄 {rescanning ? 'Rescanning...' : 'Rescan'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    🗑️ Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 1. Horizontal Scroll Carousel (Topmost) */}
          <div className="detail-carousel">
            {carouselImages.map((imgObj, i) => (
              <div 
                key={i} 
                className="detail-carousel-item"
                onClick={() => setZoomImage(imgObj)}
              >
                <img src={imgObj.url} alt={imgObj.label} />
                <span className="detail-image-label">{imgObj.label}</span>
              </div>
            ))}
            {isAnalyzing && (
              <div className="detail-carousel-item">
                <div className="loading-container" style={{ height: '100%', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                  <div className="spinner" style={{ width: '24px', height: '24px' }} />
                </div>
                <span className="detail-image-label">🌸 Analyzing...</span>
              </div>
            )}
          </div>

          {/* 2. Plant Identity Information (Name, Description) */}
          <div style={{ marginBottom: '32px' }}>
            {isAnalyzing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="skeleton skeleton-text" style={{ width: '240px', height: '32px' }} />
                <div className="skeleton skeleton-text" style={{ width: '160px', height: '18px' }} />
                <div className="status-badge analyzing" style={{ width: 'fit-content' }}>
                  <span className="status-dot analyzing" />
                  AI is analyzing your seed...
                </div>
                <div className="skeleton skeleton-text" style={{ width: '100%', height: '14px', marginTop: '12px' }} />
                <div className="skeleton skeleton-text" style={{ width: '90%', height: '14px' }} />
              </div>
            ) : scan.status === 'failed' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800 }}>Analysis Failed</h1>
                <p className="description" style={{ color: 'var(--danger)', fontSize: '0.95rem' }}>
                  {scan.error || 'Something went wrong during analysis.'}
                </p>
                <button
                  className="btn btn-primary"
                  onClick={handleRescan}
                  disabled={rescanning}
                  style={{ width: 'fit-content', marginTop: '8px' }}
                >
                  🔄 {rescanning ? 'Rescanning...' : 'Try Again'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: '1.1' }}>
                      {scan.result?.commonName || 'Unknown Seed'}
                    </h1>
                    {scan.result?.scientificName && (
                      <p className="scientific" style={{ fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {scan.result.scientificName}
                      </p>
                    )}
                  </div>
                  {scan.result?.family && scan.result.family !== 'Unknown' && (
                    <span className="family-badge" style={{ margin: 0 }}>
                      🌿 {scan.result.family}
                    </span>
                  )}
                </div>

                {scan.result?.description && (
                  <p className="description" style={{ fontSize: '0.98rem', color: 'var(--text-secondary)', lineHeight: '1.7', marginTop: '8px', maxWidth: '800px' }}>
                    {scan.result.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Google Images Backup Link */}
          {scan.status === 'complete' && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '24px 0 32px' }}>
              <a
                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(scan.result?.flowerSearchQuery || scan.result?.commonName || 'flower')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                🔎 Search Google Images for More Photos
              </a>
            </div>
          )}

          {/* 3. Planting Guide Section */}
          {scan.status === 'complete' && scan.result && (
            <PlantingInfo result={scan.result} />
          )}

        </div>
      </main>

      {/* Lightbox Zoom Overlay */}
      {zoomImage && (
        <div className="lightbox-overlay" onClick={() => setZoomImage(null)}>
          <div className="lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setZoomImage(null)}>✕</button>
            <img src={zoomImage.url} alt="Zoomed view" className="lightbox-image" />
            <div className="lightbox-caption">{zoomImage.label}</div>
            <div className="lightbox-actions">
              {zoomImage.label !== '📷 Scanned Seed' && (
                <a
                  href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(zoomImage.url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  🔍 Search Image on Google Lens
                </a>
              )}
              <a
                href={zoomImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                🔗 Open Original Image
              </a>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </>
  );
}
