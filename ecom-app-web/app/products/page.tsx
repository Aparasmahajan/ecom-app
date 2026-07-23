'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError, Category, Combo, Product } from '@/lib/api';
import ProductCard from '@/components/ProductCard';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

function ProductsView() {
  const { user, refresh, toast } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [combo, setCombo] = useState<Combo | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingCombo, setAddingCombo] = useState(false);

  const categoryId = params.get('categoryId') || '';
  const comboId = params.get('combo') || '';
  const q = (params.get('q') || '').toLowerCase();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ps, cs] = await Promise.all([
          api.catalog.products({ categoryId: categoryId || undefined, q: q || undefined }),
          api.catalog.categories()
        ]);
        setCats(cs);
        if (comboId) {
          const c = await api.catalog.combo(comboId);
          setCombo(c);
          setProducts(ps.filter(p => c.productIds.includes(p.id)));
        } else {
          setCombo(null);
          setProducts(ps);
        }
      } catch (e) {
        toast('Failed to load: ' + (e instanceof ApiError ? e.message : (e as Error).message));
      } finally {
        setLoading(false);
      }
    })();
  }, [categoryId, comboId, q, toast]);

  const setCat = (id: string) => router.push(id ? `/products?categoryId=${id}` : '/products');
  const currentCat = cats.find(c => c.id === categoryId);

  const addComboToCart = async () => {
    if (!user) { router.push('/auth'); return; }
    if (!combo) return;
    setAddingCombo(true);
    try {
      for (const p of products) {
        const variant = p.variants.find(v => v.stock > 0) || p.variants[0];
        if (variant) await api.cart.add(variant.id, 1, `Combo: ${combo.name}`);
      }
      await refresh();
      toast('Combo added to cart');
      router.push('/cart');
    } catch (e) {
      toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    } finally { setAddingCombo(false); }
  };

  return (
    <>
      <h2 style={{ marginBottom: 14, letterSpacing: 1 }}>
        {combo ? combo.name.toUpperCase() : currentCat ? currentCat.name.toUpperCase() : 'ALL PRODUCTS'}
      </h2>

      {combo && (
        <div className="list-item" style={{ marginBottom: 16 }}>
          <div className="info">
            <div className="name">{combo.productIds.length}-PIECE COMBO · {combo.description}</div>
            <div className="meta">Combo price <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{money(combo.comboPrice)}</span></div>
          </div>
          <button className="btn" onClick={addComboToCart} disabled={addingCombo}>
            {addingCombo ? 'Adding…' : 'Add combo to cart'}
          </button>
        </div>
      )}

      <div className="tab-chips" style={combo ? { display: 'none' } : undefined}>
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
