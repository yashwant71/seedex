'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">
        <div className="logo-icon">🌱</div>
        Seedex
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
