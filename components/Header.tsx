'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useApp } from '@/lib/context';

export default function Header() {
  const { user, cartCount, wishCount, signOut, toast } = useApp();
  const router = useRouter();
  const [q, setQ] = useState('');
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      router.push('/products?q=' + encodeURIComponent(q.trim()));
    }
  };

  const onLogoClick = (e: React.MouseEvent) => {
    clickCount.current++;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 600);
    if (clickCount.current >= 3) {
      e.preventDefault();
      clickCount.current = 0;
      router.push('/admin/login');
    }
  };

  const handleAuth = () => {
    if (user) {
      signOut();
      toast('Signed out');
      router.push('/');
    } else {
      router.push('/auth');
    }
  };

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/" className="logo" onClick={onLogoClick}>
          Custom<span>Wear</span>
        </Link>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/products">Shop</Link>
          <Link href="/wishlist">Wishlist <span className="badge">{wishCount}</span></Link>
          <Link href="/cart">Cart <span className="badge">{cartCount}</span></Link>
          <Link href="/orders">Orders</Link>
          <Link href="/profile">Profile</Link>
          <a href="#" onClick={(e) => { e.preventDefault(); handleAuth(); }}>
            {user ? 'Sign out' : 'Sign in'}
          </a>
        </nav>
        <input
          className="search"
          placeholder="Search products..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onSearchKey}
        />
      </div>
    </header>
  );
}
