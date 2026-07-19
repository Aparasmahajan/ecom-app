'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError, Product } from '@/lib/api';
import ProductCard from '@/components/ProductCard';

export default function WishlistPage() {
  const { user, ready, toast } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    (async () => {
      try { setItems(await api.wishlist.list()); }
      catch (e) { toast(e instanceof ApiError ? e.message : 'Failed to load wishlist'); }
      finally { setLoading(false); }
    })();
  }, [ready, user, router, toast]);

  if (!user) return null;

  return (
    <>
      <h2>Your Wishlist</h2>
      {loading ? <p className="empty">Loading…</p> :
       items.length ? (
        <div className="grid" style={{ marginTop: 16 }}>
          {items.map(p => <ProductCard key={p.id} product={p} inWishlist />)}
        </div>
       ) : (
        <div className="empty">
          <h3>Wishlist is empty</h3>
          <p>Save items you love for later.</p>
        </div>
       )}
    </>
  );
}
