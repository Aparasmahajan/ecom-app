'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { api, ApiError, Category, Product } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { HERO_IMAGE, chipImage } from '@/lib/images';

export default function HomePage() {
  const { toast } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ps, cs] = await Promise.all([api.catalog.products({}), api.catalog.categories()]);
        setProducts(ps);
        setCats(cs);
      } catch (e) {
        toast('Failed to load: ' + (e instanceof ApiError ? e.message : (e as Error).message));
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const hot = products.filter(p => p.hotSeller).slice(0, 6);
  const arrivals = products.slice().reverse().slice(0, 8);

  return (
    <>
      <div className="hero">
        <div className="hero-img" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
        <div className="hero-content">
          <h1>NEW<br />SEASON<br />COLLECTION</h1>
          <p>Elevate Your Style</p>
          <Link href="/products" className="btn">SHOP NOW</Link>
        </div>
      </div>

      <div className="chip-row">
        {cats.map(c => (
          <Link key={c.id} href={`/products?categoryId=${c.id}`} className="chip">
            <div className="chip-img">
              <img src={chipImage(c.id)} alt={c.name} />
            </div>
            <div className="chip-name">{c.name}</div>
          </Link>
        ))}
      </div>

      <div className="section-title">
        <h2>Trending Now</h2>
        <Link href="/products">View All</Link>
      </div>
      {loading ? <p className="empty">Loading…</p> :
        hot.length
          ? <div className="grid">{hot.map(p => <ProductCard key={p.id} product={p} />)}</div>
          : <p className="empty">No trending items yet.</p>}

      <div className="section-title">
        <h2>New Arrivals</h2>
        <Link href="/products">View All</Link>
      </div>
      {loading ? null : arrivals.length
        ? <div className="grid">{arrivals.map(p => <ProductCard key={p.id} product={p} />)}</div>
        : <p className="empty">No arrivals yet.</p>}
    </>
  );
}
