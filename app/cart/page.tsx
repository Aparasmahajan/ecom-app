'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, scoped } from '@/lib/context';
import { K, get, set, money } from '@/lib/storage';
import type { CartItem, Product } from '@/lib/types';

export default function CartPage() {
  const { user, ready, refresh, toast } = useApp();
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    setCart(get<CartItem[]>(scoped(K.CART, user.id), []));
    setProducts(get<Product[]>(K.PRODUCTS, []));
  }, [ready, user, router]);

  if (!user) return null;

  const save = (next: CartItem[]) => {
    set(scoped(K.CART, user.id), next);
    setCart(next);
    refresh();
  };

  const dec = (id: string) => {
    const next = cart.map(i => i.id === id && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i);
    save(next);
  };
  const inc = (id: string) => {
    const next = cart.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
    save(next);
  };
  const rm = (id: string) => save(cart.filter(i => i.id !== id));

  const subtotal = cart.reduce((a, i) => {
    const p = products.find(x => x.id === i.productId);
    const v = p?.variants.find(x => x.id === i.variantId);
    return a + ((p?.basePrice || 0) + (v?.priceModifier || 0)) * i.quantity;
  }, 0);

  return (
    <>
      <h2>Your Cart</h2>
      {cart.length ? (
        <>
          <div style={{ marginTop: 16 }}>
            {cart.map(item => {
              const p = products.find(x => x.id === item.productId);
              const v = p?.variants.find(x => x.id === item.variantId);
              if (!p || !v) return null;
              const unit = p.basePrice + v.priceModifier;
              return (
                <div className="list-item" key={item.id}>
                  <img src={p.images[0]} alt={p.name} />
                  <div className="info">
                    <div className="name">{p.name}</div>
                    <div className="meta">Size: {v.size} • Qty: {item.quantity} • {money(unit)} each</div>
                    {item.note && <div className="meta">Note: {item.note}</div>}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="price">{money(unit * item.quantity)}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn small secondary" onClick={() => dec(item.id)}>−</button>
                      <button className="btn small secondary" onClick={() => inc(item.id)}>+</button>
                      <button className="btn small danger" onClick={() => rm(item.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              );
            })}
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
