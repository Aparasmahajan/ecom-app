'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError, Product, Review } from '@/lib/api';

const COLORS = [
  { name: 'Black', hex: '#111' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Brown', hex: '#8b5a2b' },
  { name: 'Olive', hex: '#6b7047' }
];

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, toast, refresh } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [inWishlist, setInWishlist] = useState(false);
  const [variantId, setVariantId] = useState('');
  const [color, setColor] = useState('Black');
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, rs] = await Promise.all([
        api.catalog.product(id),
        api.reviews.list(id)
      ]);
      setProduct(p);
      setReviews(rs);
      if (!variantId && p.variants[0]) setVariantId(p.variants[0].id);
      if (user) {
        const wish = await api.wishlist.list();
        setInWishlist(wish.some(w => w.id === id));
      } else {
        setInWishlist(false);
      }
    } catch (e) {
      toast('Failed to load product');
    }
  }, [id, user, toast, variantId]);

  useEffect(() => { load(); }, [load]);

  if (!product) return <p className="empty">Loading product…</p>;

  const requireAuth = () => {
    if (!user) { toast('Please sign in first'); router.push('/auth'); return false; }
    return true;
  };

  const addToCart = async (): Promise<boolean> => {
    if (!requireAuth()) return false;
    const noteWithColor = `Color: ${color}${note ? ' · ' + note : ''}`;
    setBusy(true);
    try {
      await api.cart.add(variantId, qty, noteWithColor);
      await refresh();
      return true;
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Failed to add');
      return false;
    } finally { setBusy(false); }
  };

  const onAddCart = async () => { if (await addToCart()) toast('Added to cart'); };
  const onBuyNow  = async () => { if (await addToCart()) router.push('/checkout'); };

  const toggleWish = async () => {
    if (!requireAuth()) return;
    try {
      if (inWishlist) { await api.wishlist.remove(product.id); toast('Removed from wishlist'); }
      else            { await api.wishlist.add(product.id);    toast('Added to wishlist');   }
      setInWishlist(!inWishlist);
      await refresh();
    } catch (e) {
      toast('Failed');
    }
  };

  const submitReview = async () => {
    if (!user) return;
    if (!reviewText.trim()) { toast('Comment required'); return; }
    try {
      await api.reviews.create(product.id, reviewStars, reviewText.trim());
      setReviewText('');
      toast('Review added');
      await load();
    } catch (e) {
      toast('Failed to submit review');
    }
  };

  const currentSize = product.variants.find(v => v.id === variantId)?.size;
  const rating = product.effectiveRating || 0;

  return (
    <>
      <div className="pd">
        <div className="pd-gallery">
          <img src={product.images[imgIdx]} alt={product.name} />
          <div className="pd-thumbs">
            {product.images.map((im, i) => (
              <img key={i} src={im} alt="" className={i === imgIdx ? 'active' : ''} onClick={() => setImgIdx(i)} />
            ))}
          </div>
        </div>
        <div>
          {product.hotSeller && <span className="tag">HOT SELLER</span>}
          <h1 style={{ marginTop: 8 }}>{product.name}</h1>
          <div className="rating">
            {rating ? `★ ${rating} (${reviews.length} reviews)` : 'No reviews yet'}
          </div>
          <div className="price-big">{money(product.basePrice)}</div>

          <div className="selector-label">Color: <strong>{color}</strong></div>
          <div className="color-row">
            {COLORS.map(c => (
              <button
                key={c.name}
                className={`color-swatch ${color === c.name ? 'active' : ''}`}
                style={{ background: c.hex }}
                onClick={() => setColor(c.name)}
                aria-label={c.name}
              />
            ))}
          </div>

          <div className="selector-label">Size: <strong>{currentSize || 'Select Size'}</strong></div>
          <div className="size-row">
            {product.variants.map(v => (
              <button
                key={v.id}
                className={`size-btn ${v.id === variantId ? 'active' : ''}`}
                disabled={v.stock === 0}
                onClick={() => setVariantId(v.id)}
              >
                {v.size}
              </button>
            ))}
          </div>

          <div className="selector-label">Quantity</div>
          <div className="qty-row">
            <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)}>+</button>
          </div>

          <div className="selector-label">Order note (optional)</div>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any special instructions…"
            style={{ width: '100%', padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-2)', color: 'var(--text)', fontFamily: 'inherit' }}
          />

          <div className="pd-actions">
            <button className="btn dark" onClick={onAddCart} disabled={busy}>ADD TO CART</button>
            <button className="btn"      onClick={onBuyNow}  disabled={busy}>BUY NOW</button>
          </div>

          <button
            onClick={toggleWish}
            style={{
              marginTop: 12, background: 'none', border: 'none',
              color: inWishlist ? 'var(--danger)' : 'var(--muted)',
              cursor: 'pointer', fontSize: 14, fontFamily: 'inherit'
            }}
          >
            {inWishlist ? '♥ In Wishlist' : '♡ Add to Wishlist'}
          </button>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Product Details</div>
            <div className="desc">{product.description}</div>
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
            {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
          </select>
          <label>Comment</label>
          <textarea rows={2} value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
          <div className="form-actions">
            <button className="btn" onClick={submitReview}>Submit Review</button>
          </div>
        </div>
      )}
    </>
  );
}
