'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import AdminProducts from './AdminProducts';
import AdminOrders from './AdminOrders';
import AdminUsers from './AdminUsers';

function AdminDashboard() {
  const { user, ready } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get('tab') || 'products';
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== 'ADMIN') {
      router.push('/admin/login');
      return;
    }
    setChecked(true);
  }, [ready, user, router]);

  if (!checked) return null;

  const setTab = (t: string) => router.push('/admin?tab=' + t);

  return (
    <>
      <h2>Admin Panel</h2>
      <div className="admin-tabs">
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Products</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Orders</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users</button>
      </div>
      {tab === 'products' && <AdminProducts />}
      {tab === 'orders' && <AdminOrders />}
      {tab === 'users' && <AdminUsers />}
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="empty">Loading...</p>}>
      <AdminDashboard />
    </Suspense>
  );
}
