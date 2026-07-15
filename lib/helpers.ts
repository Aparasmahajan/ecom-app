import { K, get } from './storage';
import type { Product, Review } from './types';

export function productRating(productId: string): number | string {
  const p = get<Product[]>(K.PRODUCTS, []).find(x => x.id === productId);
  if (p?.adminRatingOverride != null) return p.adminRatingOverride;
  const reviews = get<Review[]>(K.REVIEWS, []).filter(r => r.productId === productId);
  if (!reviews.length) return 0;
  return +(reviews.reduce((a, r) => a + r.stars, 0) / reviews.length).toFixed(1);
}
