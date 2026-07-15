'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { K, get, set, money } from '@/lib/storage';
import type { Order, OrderStatus, User } from '@/lib/types';

interface OrderRow extends Order {
  userName: string;
  userEmail: string;
}

const STATUSES: OrderStatus[] = ['CREATED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function AdminOrders() {
  const { toast } = useApp();
  const [rows, setRows] = useState<OrderRow[]>([]);

  const reload = () => {
    const users = get<User[]>(K.USERS, []);
    const all: OrderRow[] = [];
    users.forEach(u => {
      const list = get<Order[]>(`${K.ORDERS}_${u.id}`, []);
      list.forEach(o => all.push({ ...o, userName: u.name, userEmail: u.email }));
    });
    all.sort((a, b) => b.createdAt - a.createdAt);
    setRows(all);
  };
  useEffect(() => { reload(); }, []);

  const changeStatus = (userId: string, orderId: string, status: OrderStatus) => {
    const key = `${K.ORDERS}_${userId}`;
    const list = get<Order[]>(key, []);
    const o = list.find(x => x.id === orderId);
    if (o) {
      o.status = status;
      set(key, list);
      toast('Status updated');
      reload();
    }
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Order</th><th>Customer</th><th>Items</th>
          <th>Total</th><th>Status</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? rows.map(o => (
          <tr key={o.id}>
            <td>
              #{o.id.slice(-6).toUpperCase()}
              <br />
              <small style={{ color: 'var(--muted)' }}>
                {new Date(o.createdAt).toLocaleString()}
              </small>
            </td>
            <td>
              {o.userName}<br />
              <small style={{ color: 'var(--muted)' }}>{o.userEmail}</small>
            </td>
            <td>{o.items.length}</td>
            <td>{money(o.total)}</td>
            <td><span className={`status-pill status-${o.status}`}>{o.status}</span></td>
            <td>
              <select
                value={o.status}
                onChange={(e) => changeStatus(o.userId, o.id, e.target.value as OrderStatus)}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </td>
          </tr>
        )) : (
          <tr><td colSpan={6}><em>No orders yet</em></td></tr>
        )}
      </tbody>
    </table>
  );
}
