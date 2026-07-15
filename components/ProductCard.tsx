'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types';
import { money } from '@/lib/storage';
import { productRating } from '@/lib/helpers';

export default function ProductCard({ product }: { product: Product }) {
  const rating = productRating(product.id);
  return (
    <Link href={`/products/${product.id}`} className="card">
      <img src={product.images[0]} alt={product.name} loading="lazy" />
      <div className="card-body">
        <div className="card-title">{product.name}</div>
        <div className="card-meta">
          <span className="price">{money(product.basePrice)}</span>
          <span className="rating">{rating ? '★ ' + rating : 'New'}</span>
        </div>
        {product.isHotSeller && (
          <div className="card-meta"><span className="tag">HOT</span></div>
        )}
      </div>
    </Link>
  );
}
