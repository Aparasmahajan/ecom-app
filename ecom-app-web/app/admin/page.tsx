'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import AdminProducts from './AdminProducts';
import AdminOrders from './AdminOrders';
import AdminAdmins from './AdminAdmins';
import AdminCombos from './AdminCombos';
import AdminInventory from './AdminInventory';
import AdminListing from './AdminListing';
import AdminBanners from './AdminBanners';

function AdminDashboard() {
  const { user, ready } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get('tab') || 'orders';
  const [checked, setChecked] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuper = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!ready) return;
    if (!isAdmin) {
      router.push('/admin/login');
      return;
    }
    setChecked(true);
  }, [ready, isAdmin, router]);

  if (!checked) return null;

  const setTab = (t: string) => router.push('/admin?tab=' + t);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2>Admin Panel</h2>
        <span className="tag" style={{ background: 'rgba(245,200,66,.15)', color: 'var(--accent)' }}>
          {user?.role} · {user?.email}
        </span>
      </div>
      <div className="admin-tabs">
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Orders</button>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Products</button>
        <button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>Inventory</button>
        <button className={tab === 'listing' ? 'active' : ''} onClick={() => setTab('listing')}>Listing</button>
        <button className={tab === 'combos' ? 'active' : ''} onClick={() => setTab('combos')}>Combos</button>
        <button className={tab === 'banners' ? 'active' : ''} onClick={() => setTab('banners')}>Banners</button>
        {isSuper && (
          <button className={`super ${tab === 'admins' ? 'active' : ''}`} onClick={() => setTab('admins')}>Admins</button>
        )}
      </div>
      {tab === 'orders' && <AdminOrders />}
      {tab === 'products' && <AdminProducts />}
      {tab === 'inventory' && <AdminInventory />}
      {tab === 'listing' && <AdminListing />}
      {tab === 'combos' && <AdminCombos />}
      {tab === 'banners' && <AdminBanners />}
      {tab === 'admins' && isSuper && <AdminAdmins />}
      {tab === 'admins' && !isSuper && (
        <div className="empty">
          <h3>Super admins only</h3>
          <p>Only the super admin can manage other admin accounts.</p>
        </div>
      )}
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
