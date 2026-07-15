'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { K, get } from '@/lib/storage';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';

function ProductsView() {
  const { ready } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);

  const gender = params.get('gender') || '';
  const ageGroup = params.get('ageGroup') || '';
  const q = (params.get('q') || '').toLowerCase();

  useEffect(() => {
    if (!ready) return;
    setProducts(get<Product[]>(K.PRODUCTS, []));
  }, [ready]);

  const filtered = products.filter(p =>
    (!gender || p.gender === gender || p.gender === 'UNISEX') &&
    (!ageGroup || p.ageGroup === ageGroup) &&
    (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
  );

  const update = (nextG: string, nextA: string) => {
    const qs = new URLSearchParams();
    if (nextG) qs.set('gender', nextG);
    if (nextA) qs.set('ageGroup', nextA);
    router.push('/products' + (qs.toString() ? '?' + qs.toString() : ''));
  };

  return (
    <>
      <div className="filters">
        <select value={gender} onChange={(e) => update(e.target.value, ageGroup)}>
          <option value="">All Genders</option>
          <option value="MEN">Men</option>
          <option value="WOMEN">Women</option>
          <option value="UNISEX">Unisex</option>
        </select>
        <select value={ageGroup} onChange={(e) => update(gender, e.target.value)}>
          <option value="">All Ages</option>
          <option value="KIDS">Kids</option>
          <option value="TEEN">Teens</option>
          <option value="ADULT">Adults</option>
        </select>
        {q && <span>Search: <strong>{q}</strong></span>}
        <button className="btn small secondary" onClick={() => router.push('/products')}>Clear</button>
      </div>
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
