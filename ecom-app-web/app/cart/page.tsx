'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError, CartItem } from '@/lib/api';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export default function CartPage() {
  const { user, ready, refresh, toast } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setItems(await api.cart.list());
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    load();
  }, [ready, user, router, load]);

  if (!user) return null;

  const change = async (item: CartItem, delta: number) => {
    const next = Math.max(1, item.quantity + delta);
    try {
      await api.cart.update(item.id, next, item.note);
      await load();
      await refresh();
    } catch { toast('Update failed'); }
  };
  const rm = async (item: CartItem) => {
    try {
      await api.cart.remove(item.id);
      await load();
      await refresh();
    } catch { toast('Remove failed'); }
  };

  const subtotal = items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);

  return (
    <>
      <h2>Your Cart</h2>
      {loading ? <p className="empty">Loading…</p> :
       items.length ? (
        <>
          <div style={{ marginTop: 16 }}>
            {items.map(item => (
              <div className="list-item" key={item.id}>
                <img src={item.productImages[0]} alt={item.productName} />
                <div className="info">
                  <div className="name">{item.productName}</div>
                  <div className="meta">
                    Size: {item.size} • Qty: {item.quantity} • {money(item.unitPrice)} each
                  </div>
                  {item.note && <div className="meta">{item.note}</div>}
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="price">{money(item.unitPrice * item.quantity)}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn small secondary" onClick={() => change(item, -1)}>−</button>
                    <button className="btn small secondary" onClick={() => change(item, +1)}>+</button>
                    <button className="btn small danger" onClick={() => rm(item)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="summary">
            <div className="summary-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="summary-row"><span>Shipping</span><span>Free</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>{money(subtotal)}</span></div>
            <div style={{ marginTop: 16 }}>
              <Link href="/checkout" className="btn">Proceed to Checkout</Link>
            </div>
          </div>
        </>
       ) : (
        <div className="empty">
          <h3>Cart is empty</h3>
          <p>Add some items to get started</p>
          <Link href="/products" className="btn" style={{ marginTop: 12 }}>Shop Now</Link>
        </div>
       )}
    </>
  );
}
