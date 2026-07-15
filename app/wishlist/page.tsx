'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, scoped } from '@/lib/context';
import { K, get } from '@/lib/storage';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';

export default function WishlistPage() {
  const { user, ready } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    const ids = get<string[]>(scoped(K.WISH, user.id), []);
    setItems(get<Product[]>(K.PRODUCTS, []).filter(p => ids.includes(p.id)));
  }, [ready, user, router]);

  if (!user) return null;

  return (
    <>
      <h2>Your Wishlist</h2>
      {items.length ? (
        <div className="grid" style={{ marginTop: 16 }}>
          {items.map(p => <ProductCard key={p.id} product={p} />)}
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
