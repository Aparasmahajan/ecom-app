'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { K, get } from '@/lib/storage';
import type { Category, Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';

function ProductsView() {
  const { ready } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);

  const categoryId = params.get('categoryId') || '';
  const q = (params.get('q') || '').toLowerCase();

  useEffect(() => {
    if (!ready) return;
    setProducts(get<Product[]>(K.PRODUCTS, []));
    setCats(get<Category[]>(K.CATEGORIES, []));
  }, [ready]);

  const filtered = products.filter(p =>
    (!categoryId || p.categoryId === categoryId) &&
    (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
  );

  const setCat = (id: string) => {
    router.push(id ? `/products?categoryId=${id}` : '/products');
  };

  const currentCat = cats.find(c => c.id === categoryId);

  return (
    <>
      <h2 style={{ marginBottom: 14, letterSpacing: 1 }}>
        {currentCat ? currentCat.name.toUpperCase() : 'ALL PRODUCTS'}
      </h2>

      <div className="tab-chips">
        <button
          className={`tab-chip ${!categoryId ? 'active' : ''}`}
          onClick={() => setCat('')}
        >
          All
        </button>
        {cats.map(c => (
          <button
            key={c.id}
            className={`tab-chip ${categoryId === c.id ? 'active' : ''}`}
            onClick={() => setCat(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {q && (
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
          Search: <strong style={{ color: 'var(--text)' }}>{q}</strong>
        </div>
      )}

      {filtered.length ? (
        <div className="grid">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <p className="empty">No products match your filters.</p>
      )}
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<p className="empty">Loading...</p>}>
      <ProductsView />
    </Suspense>
  );
}
