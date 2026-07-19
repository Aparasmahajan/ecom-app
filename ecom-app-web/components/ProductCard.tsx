'use client';

import Link from 'next/link';
import { useEffect, useState, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, Product } from '@/lib/api';
import { useApp } from '@/lib/context';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

/**
 * Wishlist state is derived from the AppProvider's `wishCount` refresh —
 * we don't re-fetch per card. Instead we accept an optional `inWishlist`
 * prop from the parent list (which knows the whole set) OR fall back to
 * a per-card check if not provided.
 */
export default function ProductCard({
  product,
  inWishlist
}: {
  product: Product;
  inWishlist?: boolean;
}) {
  const { user, refresh, toast } = useApp();
  const router = useRouter();
  const [wished, setWished] = useState<boolean>(!!inWishlist);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setWished(!!inWishlist); }, [inWishlist]);

  const toggleWish = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast('Please sign in first');
      router.push('/auth');
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !wished;
    setWished(next);
    try {
      if (next) await api.wishlist.add(product.id);
      else      await api.wishlist.remove(product.id);
      toast(next ? 'Added to wishlist' : 'Removed from wishlist');
      await refresh();
    } catch {
      setWished(!next);
      toast('Failed to update wishlist');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link href={`/products/${product.id}`} className="card">
      <div className="card-img-wrap">
        <img src={product.images[0]} alt={product.name} loading="lazy" />
        <button
          className={`heart ${wished ? 'active' : ''}`}
          onClick={toggleWish}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {wished ? '♥' : '♡'}
        </button>
      </div>
      <div className="card-body">
        <div className="card-title">{product.name}</div>
        <div className="card-meta">
          <span className="price">{money(product.basePrice)}</span>
          {product.hotSeller && <span className="tag">HOT</span>}
        </div>
      </div>
    </Link>
  );
}
