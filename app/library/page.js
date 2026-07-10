'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import ScanCard from '../../components/ScanCard';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Library() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showBloom, setShowBloom] = useState(false);

  const fetchScans = useCallback(async () => {
    try {
      const response = await fetch('/api/scans');
      if (response.ok) {
        const data = await response.json();
        setScans(data);
      }
    } catch (error) {
      console.error('Failed to fetch scans:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  // Auto-refresh if any scans are still analyzing
  useEffect(() => {
    const hasAnalyzing = scans.some(
      (s) => s.status === 'analyzing' || s.status === 'pending'
    );

    if (hasAnalyzing) {
      const interval = setInterval(fetchScans, 3000);
      return () => clearInterval(interval);
    }
  }, [scans, fetchScans]);

  // Filter scans based on search query and month
  const filteredScans = scans.filter((scan) => {
    const term = searchQuery.toLowerCase();
    const commonName = scan.result?.commonName || '';
    const scientificName = scan.result?.scientificName || '';
    
    const matchesSearch = 
      commonName.toLowerCase().includes(term) ||
      scientificName.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (selectedMonth !== 'all') {
      if (scan.status !== 'complete' || !scan.result) return false;
      const spectrum = scan.result.planting?.monthlyPlantingSpectrum || [];
      const monthData = spectrum.find(
        (m) => m.month?.toLowerCase() === selectedMonth.toLowerCase()
      );
      if (!monthData) return false;
      
      const rating = monthData.rating?.toLowerCase();
      if (rating === 'avoid') return false;
    }

    return true;
  });

  return (
    <>
      <Navbar />
      <main>
        <div className="library-container" style={{ paddingTop: '24px' }}>
          
          {/* Library Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'baseline', 
            marginBottom: '20px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '12px'
          }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Botanical Library
            </h1>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {filteredScans.length} {filteredScans.length === 1 ? 'plant' : 'plants'}
              {scans.length !== filteredScans.length && ` (from ${scans.length} total)`}
            </span>
          </div>

          {/* Library Controls Toolbar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            gap: '16px', 
            marginBottom: '32px',
            flexWrap: 'wrap'
          }}>
            {/* Search and Month Filter Container */}
            <div style={{ display: 'flex', gap: '12px', flex: '1 1 450px', flexWrap: 'wrap' }}>
              {/* Search Input */}
              <div style={{ position: 'relative', flex: '1 1 250px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search scans by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="search-input"
                />
              </div>

              {/* Month Dropdown Filter */}
              <div style={{ position: 'relative', flex: '0 1 200px' }}>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 32px 10px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    appearance: 'none',
                    WebkitAppearance: 'none'
                  }}
                  className="select-filter"
                >
                  <option value="all">📅 All Planting Months</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m.toLowerCase()}>
                      🌱 Plant in {m}
                    </option>
                  ))}
                </select>
                <div style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)'
                }}>
                  ▼
                </div>
              </div>
            </div>

            {/* Controls Right Grid/List + New Scan */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Bloom Toggle */}
              <button
                onClick={() => setShowBloom(!showBloom)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border)',
                  background: showBloom ? 'var(--accent-glow)' : 'var(--bg-card)',
                  borderColor: showBloom ? 'var(--border-accent)' : 'var(--border)',
                  color: showBloom ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {showBloom ? '🌸 Showing Bloom' : '🌱 Show Bloom Photos'}
              </button>

              {/* Grid/List Toggle */}
              <div style={{ 
                display: 'flex', 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border)', 
                padding: '3px', 
                borderRadius: 'var(--radius-lg)' 
              }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'calc(var(--radius-lg) - 2px)',
                    border: 'none',
                    background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'calc(var(--radius-lg) - 2px)',
                    border: 'none',
                    background: viewMode === 'list' ? 'var(--bg-card)' : 'transparent',
                    color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  List
                </button>
              </div>

              {/* New Scan */}
              <Link href="/" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                📷 New Scan
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Loading your scans...</p>
            </div>
          ) : scans.length === 0 ? (
            <div className="library-empty">
              <div className="icon">🌿</div>
              <h2>No scans yet</h2>
              <p>Scan your first seed to start building your botanical library</p>
              <Link href="/" className="btn btn-primary">
                📷 Scan a Seed
              </Link>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="library-empty" style={{ padding: '40px 0' }}>
              <div className="icon" style={{ fontSize: '2rem' }}>🔍</div>
              <h2>No matching scans</h2>
              <p>No results found for "{searchQuery}"</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="library-grid">
              {filteredScans.map((scan, index) => (
                <ScanCard 
                  key={scan._id} 
                  scan={scan} 
                  index={index} 
                  showBloomImage={showBloom} 
                />
              ))}
            </div>
          ) : (
            <div className="library-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredScans.map((scan) => {
                const listImage = (showBloom && scan.result?.flowerImageUrl) ? scan.result.flowerImageUrl : scan.imageUrl;
                return (
                  <Link 
                    href={`/library/${scan._id}`} 
                    key={scan._id} 
                    className="scan-list-item"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img 
                        src={listImage} 
                        alt={scan.result?.commonName} 
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} 
                      />
                      <div>
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                          {scan.result?.commonName || 'Unknown Seed'}
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                          {scan.result?.scientificName || 'Not identified'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {scan.result?.family && scan.result.family !== 'Unknown' && (
                        <span style={{ fontSize: '0.72rem', background: 'var(--bg-glass)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '20px', color: 'var(--text-secondary)' }}>
                          🌿 {scan.result.family}
                        </span>
                      )}
                      <span className={`status-badge ${scan.status}`}>
                        {scan.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
