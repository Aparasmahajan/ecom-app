'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError, Order } from '@/lib/api';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, ready, toast } = useApp();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    (async () => {
      try { setOrder(await api.orders.get(id)); }
      catch (e) {
        toast('Failed to load order: ' + (e instanceof ApiError ? e.message : (e as Error).message));
      } finally { setLoading(false); }
    })();
  }, [ready, user, router, id, toast]);

  if (!user) return null;
  if (loading) return <p className="empty">Loading…</p>;
  if (!order) return <div className="empty"><h3>Order not found</h3></div>;

  const a = order.shipping;

  return (
    <>
      <h2>Order #{order.id.slice(-6).toUpperCase()}</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
        Placed {new Date(order.createdAt).toLocaleString()} ·{' '}
        <span className={`status-pill status-${order.status}`}>{order.status}</span>
      </p>
      {order.items.map((i, idx) => (
        <div className="list-item" key={idx}>
          {i.image && <img src={i.image} alt={i.productNameSnapshot} />}
          <div className="info">
            <div className="name">{i.productNameSnapshot}</div>
            <div className="meta">
              Size: {i.size} · Qty: {i.quantity}{i.note ? ' · ' + i.note : ''}
            </div>
          </div>
          <div className="price">{money(i.unitPrice * i.quantity)}</div>
        </div>
      ))}
      <div className="summary">
        <div className="summary-row"><strong>Ship to</strong></div>
        <div className="summary-row"><span>{a.fullName} · {a.phone}</span></div>
        <div className="summary-row">
          <span>{a.line1}{a.line2 ? ', ' + a.line2 : ''}, {a.city}, {a.state} - {a.pincode}</span>
        </div>
        <div className="summary-row summary-total">
          <span>Total Paid</span><span>{money(order.total)}</span>
        </div>
        <div className="summary-row" style={{ color: 'var(--muted)', fontSize: 12 }}>
          Payment ID: {order.razorpayPaymentId || '—'}
        </div>
      </div>
    </>
  );
}
