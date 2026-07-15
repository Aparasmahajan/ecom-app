'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp, scoped } from '@/lib/context';
import { K, get, set, uid, money } from '@/lib/storage';
import type { Product, Review, CartItem } from '@/lib/types';
import { productRating } from '@/lib/helpers';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, toast, refresh, ready } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [inWishlist, setInWishlist] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedImg, setSelectedImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const load = () => {
    const p = get<Product[]>(K.PRODUCTS, []).find(x => x.id === id) || null;
    setProduct(p);
    if (p && !selectedVariant) setSelectedVariant(p.variants[0]?.id || '');
    setReviews(get<Review[]>(K.REVIEWS, []).filter(r => r.productId === id));
    const wish = get<string[]>(scoped(K.WISH, user?.id), []);
    setInWishlist(wish.includes(id));
  };

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready, id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!product) {
    return <p className="empty">Loading product...</p>;
  }

  const requireAuth = () => {
    if (!user) { toast('Please sign in first'); router.push('/auth'); return false; }
    return true;
  };

  const addToCart = () => {
    if (!requireAuth()) return;
    const key = scoped(K.CART, user!.id);
    const cart = get<CartItem[]>(key, []);
    const existing = cart.find(c => c.variantId === selectedVariant && c.productId === product.id && c.note === note);
    if (existing) existing.quantity += qty;
    else cart.push({ id: uid(), productId: product.id, variantId: selectedVariant, quantity: qty, note });
    set(key, cart);
    refresh();
    toast('Added to cart');
  };

  const toggleWish = () => {
    if (!requireAuth()) return;
    const key = scoped(K.WISH, user!.id);
    const wish = get<string[]>(key, []);
    const i = wish.indexOf(product.id);
    if (i >= 0) { wish.splice(i, 1); toast('Removed from wishlist'); }
    else { wish.push(product.id); toast('Added to wishlist'); }
    set(key, wish);
    refresh();
    setInWishlist(!inWishlist);
  };

  const submitReview = () => {
    if (!user) return;
    if (!reviewText.trim()) { toast('Comment required'); return; }
    const list = get<Review[]>(K.REVIEWS, []);
    list.push({
      id: uid(), userId: user.id, userName: user.name,
      productId: product.id, stars: reviewStars,
      comment: reviewText.trim(), createdAt: Date.now()
    });
    set(K.REVIEWS, list);
    setReviewText('');
    toast('Review added');
    load();
  };

  const rating = productRating(product.id);

  return (
    <>
      <div className="pd">
        <div className="pd-gallery">
          <img src={product.images[selectedImg]} alt={product.name} />
          <div className="pd-thumbs">
            {product.images.map((im, i) => (
              <img
                key={i}
                src={im}
                alt=""
                className={i === selectedImg ? 'active' : ''}
                onClick={() => setSelectedImg(i)}
              />
            ))}
          </div>
        </div>
        <div>
          {product.isHotSeller && <span className="tag">HOT SELLER</span>}
          <h1>{product.name}</h1>
          <div className="rating">
            {rating ? `★ ${rating} (${reviews.length} reviews)` : 'No reviews yet'}
          </div>
          <div className="price-big">{money(product.basePrice)}</div>
          <div className="desc">{product.description}</div>

          <label style={{ fontSize: 13, color: 'var(--muted)' }}>Size</label>
          <div className="size-row">
            {product.variants.map(v => (
              <button
                key={v.id}
                className={`size-btn ${v.id === selectedVariant ? 'active' : ''}`}
                disabled={v.stock === 0}
                onClick={() => setSelectedVariant(v.id)}
              >
                {v.size}{v.stock === 0 ? ' (out)' : ''}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 13, color: 'var(--muted)' }}>Quantity</label>
          <div className="qty-row">
            <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)}>+</button>
          </div>

          <label style={{ fontSize: 13, color: 'var(--muted)' }}>Order note (optional)</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any special instructions for the tailor..."
            style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'inherit' }}
          />

          <div className="form-actions">
            <button className="btn" onClick={addToCart}>Add to Cart</button>
            <button className="btn secondary" onClick={toggleWish}>
              {inWishlist ? '♥ In Wishlist' : '♡ Wishlist'}
            </button>
          </div>
        </div>
      </div>

      <div className="section-title"><h2>Reviews</h2></div>
      {reviews.length ? reviews.map(r => (
        <div className="list-item" key={r.id}>
          <div className="info">
            <div className="name">{r.userName} <span className="rating">★ {r.stars}</span></div>
            <div className="meta">{r.comment}</div>
          </div>
        </div>
      )) : <p className="empty">No reviews yet. Be the first!</p>}

      {user && (
        <div className="form" style={{ marginTop: 16 }}>
          <h3>Add a Review</h3>
          <label>Stars</label>
          <select value={reviewStars} onChange={(e) => setReviewStars(+e.target.value)}>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
          </select>
          <label>Comment</label>
          <textarea rows={2} value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
          <div className="form-actions">
            <button className="btn" onClick={submitReview}>Submit</button>
          </div>
        </div>
      )}
    </>
  );
}
