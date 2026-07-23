'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { api, ApiError, Category, Combo } from '@/lib/api';
import ComboCard from '@/components/ComboCard';
import { bannerImage } from '@/lib/images';

export default function CategoriesPage() {
  const { toast } = useApp();
  const [cats, setCats] = useState<Category[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cs, kb] = await Promise.all([api.catalog.categories(), api.catalog.combos()]);
        setCats(cs);
        setCombos(kb);
      }
      catch (e) { toast('Failed to load: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
      finally { setLoading(false); }
    })();
  }, [toast]);

  return (
    <>
      <h2 style={{ marginBottom: 16, letterSpacing: 1 }}>CATEGORIES</h2>
      {loading ? (
        <p className="empty">Loading…</p>
      ) : (
        <div className="big-cat-list">
          {cats.map(c => (
            <Link key={c.id} href={`/products?categoryId=${c.id}`} className="big-cat">
              <div className="bc-img" style={{ backgroundImage: `url(${bannerImage(c.id)})` }} />
              <div className="bc-content">
                <div className="bc-name">{c.name}</div>
                <div className="bc-sub">Explore Now →</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Combos footer section — admin-curated bundles */}
      {combos.length > 0 && (
        <>
          <div className="section-title">
            <h2>Curated Combos 🎁</h2>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Bundle & save</span>
          </div>
          <div className="combo-grid">
            {combos.map(c => <ComboCard key={c.id} combo={c} />)}
          </div>
        </>
      )}
    </>
  );
}
