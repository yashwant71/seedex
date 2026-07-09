'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import ScanCard from '../../components/ScanCard';

export default function Library() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <Navbar />
      <main>
        <div className="library-container">
          <div className="library-header">
            <h1>
              📚 Scan Library{' '}
              <span className="count">({scans.length})</span>
            </h1>
            <Link href="/" className="btn btn-primary">
              📷 New Scan
            </Link>
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
          ) : (
            <div className="library-grid">
              {scans.map((scan, index) => (
                <ScanCard key={scan._id} scan={scan} index={index} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
