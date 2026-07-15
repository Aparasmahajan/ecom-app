'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';

export default function Footer() {
  const router = useRouter();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = () => {
    pressTimer.current = setTimeout(() => router.push('/admin/login'), 1500);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <footer className="footer">
      <div className="container">
        <span>© CustomWear</span>
        <span
          className="version"
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
          title="Hidden admin: long-press"
        >
          v1.0.0
        </span>
      </div>
    </footer>
  );
}
