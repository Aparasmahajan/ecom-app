'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, scoped } from '@/lib/context';
import { K, get, set, uid, money } from '@/lib/storage';
import type { Address, CartItem, Order, Product } from '@/lib/types';

export default function CheckoutPage() {
  const { user, ready, toast, refresh } = useApp();
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [selAddr, setSelAddr] = useState<string>('');

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    const c = get<CartItem[]>(scoped(K.CART, user.id), []);
    if (!c.length) { router.push('/cart'); return; }
    setCart(c);
    setProducts(get<Product[]>(K.PRODUCTS, []));
    const a = get<Address[]>(scoped(K.ADDRS, user.id), []);
    setAddrs(a);
    setSelAddr((a.find(x => x.isDefault) || a[0])?.id || '');
  }, [ready, user, router]);

  if (!user) return null;

  const subtotal = cart.reduce((a, i) => {
    const p = products.find(x => x.id === i.productId);
    const v = p?.variants.find(x => x.id === i.variantId);
    return a + ((p?.basePrice || 0) + (v?.priceModifier || 0)) * i.quantity;
  }, 0);

  const pay = () => {
    if (!selAddr) { toast('Choose an address first'); return; }
    const order: Order = {
      id: uid(),
      userId: user.id,
      addressId: selAddr,
      addressSnapshot: addrs.find(a => a.id === selAddr),
      items: cart.map(i => {
        const p = products.find(x => x.id === i.productId)!;
        const v = p.variants.find(x => x.id === i.variantId)!;
        return {
          productId: p.id, productNameSnapshot: p.name,
          variantId: v.id, size: v.size,
          quantity: i.quantity, unitPrice: p.basePrice + v.priceModifier,
          note: i.note, image: p.images[0]
        };
      }),
      subtotal, total: subtotal,
      status: 'PAID', paymentStatus: 'PAID',
      razorpayOrderId: 'mock_' + uid(),
      razorpayPaymentId: 'pay_' + uid(),
      createdAt: Date.now()
    };
    const orders = get<Order[]>(scoped(K.ORDERS, user.id), []);
    orders.unshift(order);
    set(scoped(K.ORDERS, user.id), orders);
    set(scoped(K.CART, user.id), []);
    refresh();
    toast('Payment successful!');
    router.push(`/orders/${order.id}`);
  };

  return (
    <>
      <h2>Checkout</h2>
      <div className="section-title">
        <h3 style={{ fontSize: 16 }}>Shipping Address</h3>
        <a href="/profile">Manage</a>
      </div>
      {addrs.length ? (
        <div>
          {addrs.map(a => (
            <label className="list-item" style={{ cursor: 'pointer' }} key={a.id}>
              <input
                type="radio"
                name="addr"
                value={a.id}
                checked={a.id === selAddr}
                onChange={(e) => setSelAddr(e.target.value)}
              />
              <div className="info">
                <div className="name">{a.fullName} · {a.phone}</div>
                <div className="meta">
                  {a.line1}{a.line2 ? ', ' + a.line2 : ''}, {a.city}, {a.state} - {a.pincode}
                </div>
              </div>
            </label>
          ))}
        </div>
      ) : (
        <p className="empty">No addresses. <a href="/profile">Add one</a></p>
      )}

      <div className="section-title"><h3 style={{ fontSize: 16 }}>Order Summary</h3></div>
      {cart.map(i => {
        const p = products.find(x => x.id === i.productId);
        const v = p?.variants.find(x => x.id === i.variantId);
        if (!p || !v) return null;
        const unit = p.basePrice + v.priceModifier;
        return (
          <div className="list-item" key={i.id}>
            <img src={p.images[0]} alt={p.name} />
            <div className="info">
              <div className="name">{p.name}</div>
              <div className="meta">Size: {v.size} • Qty: {i.quantity}{i.note ? ' • ' + i.note : ''}</div>
            </div>
            <div className="price">{money(unit * i.quantity)}</div>
          </div>
        );
      })}

      <div className="summary">
        <div className="summary-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="summary-row"><span>Shipping</span><span>Free</span></div>
        <div className="summary-row summary-total"><span>Total</span><span>{money(subtotal)}</span></div>
        <div style={{ marginTop: 16 }}>
          <button className="btn" onClick={pay} disabled={!selAddr}>
            Pay {money(subtotal)} (Mock)
          </button>
        </div>
      </div>
    </>
  );
}
