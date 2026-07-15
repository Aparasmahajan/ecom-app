'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { K, get } from '@/lib/storage';
import type { Category, Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';

export default function HomePage() {
  const { ready } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    if (!ready) return;
    setProducts(get<Product[]>(K.PRODUCTS, []));
    setCats(get<Category[]>(K.CATEGORIES, []));
  }, [ready]);

  const hot = products.filter(p => p.isHotSeller);

  return (
    <>
      <div className="hero">
        <div>
          <h1>Custom Clothing, Made For You</h1>
          <p>Hand-crafted apparel with your fit, your style.</p>
          <Link href="/products" className="btn secondary">Shop Now</Link>
        </div>
      </div>

      <div className="section-title"><h2>Shop by Category</h2></div>
      <div className="cat-grid">
        {cats.map(c => (
          <Link
            key={c.id}
            href={`/products?gender=${c.gender}&ageGroup=${c.ageGroup}`}
            className="cat-card"
          >
            <div className="emoji">{c.emoji}</div>
            <div className="name">{c.name}</div>
          </Link>
        ))}
      </div>

      <div className="section-title">
        <h2>Hot Sellers 🔥</h2>
        <Link href="/products">View all</Link>
      </div>
      {hot.length ? (
        <div className="grid">
          {hot.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <p className="empty">No hot sellers yet.</p>
      )}
    </>
  );
}
