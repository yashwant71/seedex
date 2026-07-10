'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import PlantingInfo from '../../../components/PlantingInfo';

function getImageNameFromUrl(url) {
  if (!url) return '';
  try {
    const decoded = decodeURIComponent(url);
    const fileName = decoded.substring(decoded.lastIndexOf('/') + 1);
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    
    // Replace underscores, hyphens, and multiple spaces
    let clean = nameWithoutExt.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Remove "File:" prefix if present
    if (clean.toLowerCase().startsWith('file:')) {
      clean = clean.substring(5).trim();
    }
    
    // If it's a very long string, truncate it
    if (clean.length > 28) {
      clean = clean.substring(0, 26) + '...';
    }
    
    // Capitalize first letter of each word
    return clean.replace(/\b\w/g, c => c.toUpperCase());
  } catch (e) {
    return '';
  }
}

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
  const [fetchingImages, setFetchingImages] = useState(null);

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

  const checkAdminPassword = () => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_password');
      if (saved === 'Yash123@') {
        return true;
      }
    }

    const input = prompt('Enter admin password to proceed:');
    if (input === 'Yash123@') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_password', 'Yash123@');
      }
      return true;
    } else {
      alert('Incorrect password. Access denied.');
      return false;
    }
  };

  const handleRescan = async () => {
    if (!checkAdminPassword()) return;
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

  const handleManualRescan = async () => {
    if (!checkAdminPassword()) return;
    
    const manualName = prompt('Enter the correct plant name to identify this seed (e.g. Lavender, Rose, Sunflower):');
    if (!manualName || !manualName.trim()) return;

    setRescanning(true);
    try {
      showToast(`Starting analysis for: "${manualName.trim()}"...`, 'success');
      const response = await fetch(`/api/scan/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualName: manualName.trim() }),
      });

      if (response.ok) {
        showToast('Seed identification updated. AI is re-analyzing...', 'success');
        fetchScan();
      } else {
        throw new Error('Rescan failed');
      }
    } catch (error) {
      showToast('Failed to identify plant. Try again.', 'error');
    } finally {
      setRescanning(false);
    }
  };

  const handleDelete = async () => {
    if (!checkAdminPassword()) return;
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

  const handleFetchImages = async (mode, type) => {
    if (!checkAdminPassword()) return;
    setFetchingImages(`${mode}-${type}`);
    try {
      const typeLabel = type === 'seed' ? 'seed reference images' : 'plant images';
      showToast(mode === 'more' ? `Finding more ${typeLabel}...` : `Refetching all ${typeLabel}...`, 'success');
      const response = await fetch(`/api/scan/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetchImages', mode, type }),
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.count || 0;
        const typeLabel = type === 'seed' ? 'seed' : 'plant';
        showToast(mode === 'more' ? `Found and added ${count} new ${typeLabel} images!` : `Found and reset to ${count} ${typeLabel} images!`, 'success');
        fetchScan();
      } else {
        throw new Error('Failed to fetch images');
      }
    } catch (error) {
      showToast('Failed to fetch images. Try again.', 'error');
    } finally {
      setFetchingImages(null);
    }
  };

  const handleImageAction = async (actionType, url, type = 'flower') => {
    if (!checkAdminPassword()) return;

    try {
      showToast(actionType === 'flag' ? 'Finding alternative image...' : 'Removing image...', 'success');
      
      const response = await fetch(`/api/scan/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType === 'flag' ? 'flagImage' : 'removeImage',
          imageUrl: url,
          type: type
        })
      });

      if (response.ok) {
        showToast(actionType === 'flag' ? 'Image replaced!' : 'Image removed!', 'success');
        setZoomImage(null);
        fetchScan();
      } else {
        throw new Error('Image action failed');
      }
    } catch (error) {
      showToast('Failed to modify image. Try again.', 'error');
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

  // Build a list of all images for the carousel (without arbitrary limits, showing all fetched/stored images)
  const carouselImages = [];
  const addedUrls = new Set();

  if (scan?.imageUrl) {
    carouselImages.push({ url: scan.imageUrl, label: '📷 Scanned Seed', type: 'scanned' });
    addedUrls.add(scan.imageUrl);
  }

  if (scan?.status === 'complete' && scan.result) {
    if (scan.result.flowerImageUrl && !addedUrls.has(scan.result.flowerImageUrl)) {
      carouselImages.push({ url: scan.result.flowerImageUrl, label: '🌸 Grown Plant', type: 'flower' });
      addedUrls.add(scan.result.flowerImageUrl);
    }

    // Reference seed images from the web
    if (scan.result.seedImageUrls && Array.isArray(scan.result.seedImageUrls)) {
      scan.result.seedImageUrls.forEach((url) => {
        if (!addedUrls.has(url)) {
          carouselImages.push({ url, label: '🌱 Seed Reference', type: 'seed' });
          addedUrls.add(url);
        }
      });
    }

    // Other plant/flower images
    if (scan.result.flowerImageUrls && Array.isArray(scan.result.flowerImageUrls)) {
      scan.result.flowerImageUrls.forEach((url) => {
        if (!addedUrls.has(url)) {
          carouselImages.push({ url, label: '🌸 Plant Photo', type: 'flower' });
          addedUrls.add(url);
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
                    onClick={handleManualRescan}
                    disabled={rescanning}
                  >
                    ✏️ Identify Manually
                  </button>
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
                {imgObj.type !== 'scanned' && getImageNameFromUrl(imgObj.url) && (
                  <span 
                    className="detail-image-sublabel"
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'var(--bg-glass-strong)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      fontSize: '0.65rem',
                      fontWeight: '500',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      pointerEvents: 'none',
                      maxWidth: '80%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {getImageNameFromUrl(imgObj.url)}
                  </span>
                )}
              </div>
            ))}
            {scan?.status === 'complete' && (scan?.result?.scientificName || scan?.result?.commonName) && (
              <div 
                className="detail-carousel-item"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'stretch', 
                  border: '2px dashed var(--border)',
                  padding: '12px 16px',
                  boxSizing: 'border-box',
                  gap: '8px',
                  cursor: 'default',
                  transform: 'none',
                  boxShadow: 'none'
                }}
              >
                {/* Plant Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    🌸 Plant Photos
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleFetchImages('more', 'flower')}
                      disabled={!!fetchingImages}
                      style={{ fontSize: '0.72rem', padding: '6px 8px', flex: 1 }}
                    >
                      {fetchingImages === 'more-flower' ? '...' : '➕ More'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleFetchImages('again', 'flower')}
                      disabled={!!fetchingImages}
                      style={{ fontSize: '0.72rem', padding: '6px 8px', flex: 1, color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    >
                      {fetchingImages === 'again-flower' ? '...' : '🔄 Refetch'}
                    </button>
                  </div>
                </div>

                {/* Seed Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    🌱 Seed Reference
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleFetchImages('more', 'seed')}
                      disabled={!!fetchingImages}
                      style={{ fontSize: '0.72rem', padding: '6px 8px', flex: 1 }}
                    >
                      {fetchingImages === 'more-seed' ? '...' : '➕ More'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleFetchImages('again', 'seed')}
                      disabled={!!fetchingImages}
                      style={{ fontSize: '0.72rem', padding: '6px 8px', flex: 1, color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    >
                      {fetchingImages === 'again-seed' ? '...' : '🔄 Refetch'}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleRescan}
                    disabled={rescanning}
                    style={{ width: 'fit-content' }}
                  >
                    🔄 {rescanning ? 'Rescanning...' : 'Try Again'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleManualRescan}
                    disabled={rescanning}
                    style={{ width: 'fit-content', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  >
                    ✏️ Identify Manually
                  </button>
                </div>
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
            <div className="lightbox-caption">
              {zoomImage.label}
              {zoomImage.type !== 'scanned' && getImageNameFromUrl(zoomImage.url) && (
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                  ({getImageNameFromUrl(zoomImage.url)})
                </span>
              )}
            </div>
            <div className="lightbox-actions">
              {zoomImage.type !== 'scanned' && (
                <button
                  onClick={() => handleImageAction('flag', zoomImage.url, zoomImage.type)}
                  className="btn btn-secondary"
                  style={{ color: '#fb923c', borderColor: 'rgba(251, 146, 60, 0.2)' }}
                >
                  ⚠️ Flag Wrong Image
                </button>
              )}
              {zoomImage.type !== 'scanned' && (
                <button
                  onClick={() => handleImageAction('remove', zoomImage.url)}
                  className="btn btn-danger"
                >
                  🗑️ Remove Image
                </button>
              )}
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
