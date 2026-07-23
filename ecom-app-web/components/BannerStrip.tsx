'use client';

import Link from 'next/link';
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

/** The stack of active banners rendered at the top of the home page. */
export default function BannerStrip({ banners }: { banners: Banner[] }) {
  if (!banners.length) return null;
  return (
    <div className="banner-strip">
      {banners.map(b => <PromoBanner key={b.id} banner={b} />)}
    </div>
  );
}
