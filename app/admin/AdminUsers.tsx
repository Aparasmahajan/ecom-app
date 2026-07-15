'use client';

import { useEffect, useState } from 'react';
import { K, get } from '@/lib/storage';
import type { Order, User } from '@/lib/types';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const list = get<User[]>(K.USERS, []);
    setUsers(list);
    const counts: Record<string, number> = {};
    list.forEach(u => {
      counts[u.id] = get<Order[]>(`${K.ORDERS}_${u.id}`, []).length;
    });
    setOrderCounts(counts);
  }, []);

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Orders</th>
        </tr>
      </thead>
      <tbody>
        {users.map(u => (
          <tr key={u.id}>
            <td>{u.name}</td>
            <td>{u.email}</td>
            <td>{u.phone || '—'}</td>
            <td>{u.role}</td>
            <td>{orderCounts[u.id] || 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
