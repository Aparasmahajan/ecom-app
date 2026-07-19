'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { api, ApiError, Order } from '@/lib/api';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export default function OrdersPage() {
  const { user, ready, toast } = useApp();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/auth'); return; }
    (async () => {
      try { setOrders(await api.orders.list()); }
      catch (e) { toast('Failed to load orders: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
      finally { setLoading(false); }
    })();
  }, [ready, user, router, toast]);

  if (!user) return null;

  return (
    <>
      <h2>Your Orders</h2>
      {loading ? <p className="empty">Loading…</p> :
       orders.length ? orders.map(o => (
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
