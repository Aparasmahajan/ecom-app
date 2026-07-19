'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/context';

const items = [
  { href: '/',           label: 'Home',       icon: '🏠' },
  { href: '/categories', label: 'Categories', icon: '📦' },
  { href: '/wishlist',   label: 'Wishlist',   icon: '❤',  badge: 'wish' as const },
  { href: '/cart',       label: 'Cart',       icon: '🛒', badge: 'cart' as const },
  { href: '/profile',    label: 'Profile',    icon: '👤' }
];

export default function BottomNav() {
  const pathname = usePathname();
  const { cartCount, wishCount } = useApp();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav className="bottom-nav">
      {items.map(item => {
        const badgeVal = item.badge === 'cart' ? cartCount : item.badge === 'wish' ? wishCount : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? 'active' : ''}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && badgeVal > 0 && (
              <span className="nav-badge">{badgeVal}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
