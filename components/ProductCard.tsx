'use client';

import Link from 'next/link';
import { useEffect, useState, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { K, get, set, money } from '@/lib/storage';
import { useApp, scoped } from '@/lib/context';

export default function ProductCard({ product }: { product: Product }) {
  const { user, refresh, toast, ready } = useApp();
  const router = useRouter();
  const [inWish, setInWish] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const wish = get<string[]>(scoped(K.WISH, user?.id), []);
    setInWish(wish.includes(product.id));
  }, [ready, user?.id, product.id]);

  const toggleWish = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast('Please sign in first');
      router.push('/auth');
      return;
    }
    const key = scoped(K.WISH, user.id);
    const wish = get<string[]>(key, []);
    const i = wish.indexOf(product.id);
    if (i >= 0) {
      wish.splice(i, 1);
      toast('Removed from wishlist');
    } else {
      wish.push(product.id);
      toast('Added to wishlist');
    }
    set(key, wish);
    setInWish(!inWish);
    refresh();
  };

  return (
    <Link href={`/products/${product.id}`} className="card">
      <div className="card-img-wrap">
        <img src={product.images[0]} alt={product.name} loading="lazy" />
        <button
          className={`heart ${inWish ? 'active' : ''}`}
          onClick={toggleWish}
          aria-label={inWish ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {inWish ? '♥' : '♡'}
        </button>
      </div>
      <div className="card-body">
        <div className="card-title">{product.name}</div>
        <div className="card-meta">
          <span className="price">{money(product.basePrice)}</span>
          {product.isHotSeller && <span className="tag">HOT</span>}
        </div>
      </div>
    </Link>
  );
}
