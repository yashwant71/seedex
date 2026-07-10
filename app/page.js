'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Scanner from '../components/Scanner';

export default function Home() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const checkAdminPassword = () => {
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

  const handleCapture = async (imageData) => {
    if (!checkAdminPassword()) return;
    setIsUploading(true);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        throw new Error('Failed to create scan');
      }

      const data = await response.json();
      showToast('Seed uploaded! AI is analyzing...', 'success');

      // Redirect to library after a short delay
      setTimeout(() => {
        router.push('/library');
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      showToast('Failed to upload. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main>
        <section className="hero">
          <div className="hero-badge">
            🤖 AI-Powered Analysis
          </div>
          <h1>
            Identify Any <span className="gradient-text">Seed</span> Instantly
          </h1>
          <p>
            Scan a seed with your camera and get detailed planting guides,
            care instructions, and discover the beautiful plant it will grow into.
          </p>
        </section>

        <Scanner onCapture={handleCapture} isUploading={isUploading} />
      </main>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </>
  );
}
