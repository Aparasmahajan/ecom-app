'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';

const features = [
  { icon: '💎', title: 'PREMIUM QUALITY', sub: 'Top Notch Fabrics' },
  { icon: '⭐', title: 'TRENDY DESIGNS', sub: 'Stay Ahead in Fashion' },
  { icon: '↩️', title: 'EASY RETURNS', sub: '7 Days Return Policy' },
  { icon: '🔒', title: 'SECURE PAYMENT', sub: '100% Safe & Secure' },
  { icon: '🚚', title: 'FAST DELIVERY', sub: 'Quick & Reliable' }
];

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
    <>
      <div className="feature-strip">
        <div className="feature-strip-inner">
          {features.map(f => (
            <div className="feature" key={f.title}>
              <div className="fi">{f.icon}</div>
              <div>
                <div className="ft-title">{f.title}</div>
                <div className="ft-sub">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        className="footer-brand"
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
      >
        <div className="fb-main">KAPOOR</div>
        <div className="fb-sub">BOY GARMENTS</div>
      </div>
    </>
  );
}
