'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp, scoped } from '@/lib/context';
import { K, get, money } from '@/lib/storage';
import type { Order } from '@/lib/types';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, ready } = useApp();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    const o = get<Order[]>(scoped(K.ORDERS, user.id), []).find(x => x.id === id) || null;
    setOrder(o);
  }, [ready, user, router, id]);

  if (!user) return null;
  if (!order) return <div className="empty"><h3>Order not found</h3></div>;

  const a = order.addressSnapshot;

  return (
    <>
      <h2>Order #{order.id.slice(-6).toUpperCase()}</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
        Placed {new Date(order.createdAt).toLocaleString()} ·{' '}
        <span className={`status-pill status-${order.status}`}>{order.status}</span>
      </p>
      {order.items.map((i, idx) => (
        <div className="list-item" key={idx}>
          <img src={i.image} alt={i.productNameSnapshot} />
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
        <div className="summary-row"><span>{a?.fullName} · {a?.phone}</span></div>
        <div className="summary-row">
          <span>{a?.line1}, {a?.city}, {a?.state} - {a?.pincode}</span>
        </div>
        <div className="summary-row summary-total">
          <span>Total Paid</span><span>{money(order.total)}</span>
        </div>
        <div className="summary-row" style={{ color: 'var(--muted)', fontSize: 12 }}>
          Payment ID: {order.razorpayPaymentId}
        </div>
      </div>
    </>
  );
}
