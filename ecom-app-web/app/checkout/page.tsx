'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError, Address, CartItem } from '@/lib/api';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export default function CheckoutPage() {
  const { user, ready, refresh, toast } = useApp();
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [selAddr, setSelAddr] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    (async () => {
      try {
        const [c, a] = await Promise.all([api.cart.list(), api.me.addresses.list()]);
        if (!c.length) { router.push('/cart'); return; }
        setCart(c);
        setAddrs(a);
        const def = a.find(x => x.isDefault) || a[0];
        setSelAddr(def?.id || '');
      } catch (e) {
        toast('Failed to load: ' + (e instanceof ApiError ? e.message : (e as Error).message));
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, user, router, toast]);

  if (!user) return null;

  const subtotal = cart.reduce((a, i) => a + i.unitPrice * i.quantity, 0);

  const pay = async () => {
    if (!selAddr) { toast('Choose an address first'); return; }
    setPaying(true);
    try {
      // 1) Create order — backend also creates a (mock in dev) Razorpay order id.
      const order = await api.orders.create({ addressId: selAddr, fromCart: true });
      // 2) In dev / no Razorpay key, the server accepts any signature so this
      //    round-trip just flips the order to PAID.
      const verified = await api.payment.verify({
        razorpayOrderId: order.razorpayOrderId || '',
        razorpayPaymentId: 'pay_web_' + Date.now(),
        signature: 'dev'
      });
      toast('Payment successful!');
      await refresh();
      router.push(`/orders/${verified.id}`);
    } catch (e) {
      toast('Payment failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <p className="empty">Loading…</p>;

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
      {cart.map(i => (
        <div className="list-item" key={i.id}>
          <img src={i.productImages[0]} alt={i.productName} />
          <div className="info">
            <div className="name">{i.productName}</div>
            <div className="meta">Size: {i.size} • Qty: {i.quantity}{i.note ? ' • ' + i.note : ''}</div>
          </div>
          <div className="price">{money(i.unitPrice * i.quantity)}</div>
        </div>
      ))}

      <div className="summary">
        <div className="summary-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="summary-row"><span>Shipping</span><span>Free</span></div>
        <div className="summary-row summary-total"><span>Total</span><span>{money(subtotal)}</span></div>
        <div style={{ marginTop: 16 }}>
          <button className="btn" onClick={pay} disabled={!selAddr || paying}>
            {paying ? 'Processing…' : `Pay ${money(subtotal)} (Mock)`}
          </button>
        </div>
      </div>
    </>
  );
}
