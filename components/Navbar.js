'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">
        <div className="logo-icon">🌱</div>
        <span>Seedex</span>
        {pathname.startsWith('/library') && (
          <>
            <span style={{ margin: '0 8px', opacity: 0.4, fontSize: '0.9rem', fontWeight: 300 }}>&gt;</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Library</span>
          </>
        )}
      </Link>

      <div className="navbar-links">
        <Link
          href="/"
          className={`navbar-link ${pathname === '/' ? 'active' : ''}`}
        >
          📷 <span>Scan</span>
        </Link>
        <Link
          href="/library"
          className={`navbar-link ${pathname.startsWith('/library') ? 'active' : ''}`}
        >
          📚 <span>Library</span>
        </Link>
      </div>
    </nav>
  );
}
