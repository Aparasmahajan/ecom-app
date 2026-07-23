'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Banner } from '@/lib/api';

/**
 * A single landing-page banner. The look is driven by `banner.template`
 * (hero / sale / split / minimal) via the `.pbanner.tpl-*` CSS in globals.css.
 * Reused by the storefront <BannerStrip/> and the admin banner-manager preview.
 */
export function PromoBanner({ banner, preview = false }: { banner: Banner; preview?: boolean }) {
  const inner = (
    <>
      {banner.template !== 'minimal' && (
        <div className="pb-img" style={{ backgroundImage: `url(${banner.imageUrl})` }} />
      )}
      <div className="pb-overlay" />
      <div className="pb-content">
        <div className="pb-title">{banner.title}</div>
        {banner.subtitle && <div className="pb-sub">{banner.subtitle}</div>}
        {banner.price && <div className="pb-price">{banner.price}</div>}
        {banner.ctaText && (
          <div className="pb-cta">
            <span className="btn">{banner.ctaText}</span>
          </div>
        )}
      </div>
    </>
  );

  const cls = `pbanner tpl-${banner.template}`;

  // In preview mode (admin) we don't navigate on click.
  if (preview) return <div className={cls}>{inner}</div>;

  return (
    <Link href={banner.ctaHref || '/products'} className={cls}>
      {inner}
    </Link>
  );
}

/**
 * Auto-rotating banner carousel at the top of the home page. One banner shows
 * at a time and advances every few seconds; dots let the visitor jump around.
 */
export default function BannerStrip({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const n = banners.length;

  // Keep the index valid if the banner list shrinks.
  useEffect(() => { if (index >= n) setIndex(0); }, [n, index]);

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % n), 4500);
    return () => clearInterval(t);
  }, [n]);

  if (!n) return null;

  return (
    <div className="banner-carousel">
      <div className="banner-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {banners.map(b => (
          <div className="banner-slide" key={b.id}><PromoBanner banner={b} /></div>
        ))}
      </div>
      {n > 1 && (
        <div className="banner-dots">
          {banners.map((b, i) => (
            <button
              key={b.id}
              className={i === index ? 'active' : ''}
              aria-label={`Go to banner ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
