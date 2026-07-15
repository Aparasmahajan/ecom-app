'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, scoped } from '@/lib/context';
import { K, get, money } from '@/lib/storage';
import type { Order } from '@/lib/types';

export default function OrdersPage() {
  const { user, ready } = useApp();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    setOrders(get<Order[]>(scoped(K.ORDERS, user.id), []));
  }, [ready, user, router]);

  if (!user) return null;

  return (
    <>
      <h2>Your Orders</h2>
      {orders.length ? orders.map(o => (
        <Link href={`/orders/${o.id}`} key={o.id} className="list-item" style={{ cursor: 'pointer' }}>
          <div className="info">
            <div className="name">Order #{o.id.slice(-6).toUpperCase()}</div>
            <div className="meta">
              {new Date(o.createdAt).toLocaleString()} · {o.items.length} item(s)
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="price">{money(o.total)}</div>
            <span className={`status-pill status-${o.status}`}>{o.status}</span>
          </div>
        </Link>
      )) : (
        <div className="empty"><h3>No orders yet</h3></div>
      )}
    </>
  );
}
