'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError, Category, Product } from '@/lib/api';
import ProductCard from '@/components/ProductCard';

function ProductsView() {
  const { toast } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryId = params.get('categoryId') || '';
  const q = (params.get('q') || '').toLowerCase();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ps, cs] = await Promise.all([
          api.catalog.products({ categoryId: categoryId || undefined, q: q || undefined }),
          api.catalog.categories()
        ]);
        setProducts(ps);
        setCats(cs);
      } catch (e) {
        toast('Failed to load: ' + (e instanceof ApiError ? e.message : (e as Error).message));
      } finally {
        setLoading(false);
      }
    })();
  }, [categoryId, q, toast]);

  const setCat = (id: string) => router.push(id ? `/products?categoryId=${id}` : '/products');
  const currentCat = cats.find(c => c.id === categoryId);

  return (
    <>
      <h2 style={{ marginBottom: 14, letterSpacing: 1 }}>
        {currentCat ? currentCat.name.toUpperCase() : 'ALL PRODUCTS'}
      </h2>

      <div className="tab-chips">
        <button className={`tab-chip ${!categoryId ? 'active' : ''}`} onClick={() => setCat('')}>All</button>
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

      {loading ? (
        <p className="empty">Loading products…</p>
      ) : products.length ? (
        <div className="grid">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
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
