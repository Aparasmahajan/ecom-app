'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/context';
import { api, AdminOrder, ApiError } from '@/lib/api';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

type SortKey = 'newest' | 'oldest' | 'high' | 'low';
type StatusFilter = 'ALL' | 'CREATED' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

const STATUS_TABS: StatusFilter[] = ['ALL', 'CREATED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const STATUS_LABEL: Record<StatusFilter, string> = {
  ALL: 'All',
  CREATED: 'New',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded'
};

export default function AdminOrders() {
  const { toast } = useApp();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');

  const reload = async () => {
    setLoading(true);
    try {
      const list = await api.admin.orders.list();
      setOrders(list);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      toast('Failed to load orders: ' + msg);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: orders.length };
    orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = orders.filter(o =>
      (status === 'ALL' || o.status === status) &&
      (!term
        || o.id.toLowerCase().includes(term)
        || (o.customer?.name || '').toLowerCase().includes(term)
        || (o.customer?.email || '').toLowerCase().includes(term)
        || (o.trackingNumber || '').toLowerCase().includes(term))
    );
    switch (sort) {
      case 'oldest': list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
      case 'high':   list.sort((a, b) => b.total - a.total); break;
      case 'low':    list.sort((a, b) => a.total - b.total); break;
      default:       list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return list;
  }, [orders, status, q, sort]);

  const patchLocal = (updated: AdminOrder) => {
    setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
    setSelected(updated);
  };

  return (
    <>
      <div className="ao-toolbar">
        <input
          className="ao-search"
          placeholder="Search order id, customer, tracking…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="ao-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="high">Highest total</option>
          <option value="low">Lowest total</option>
        </select>
      </div>

      <div className="ao-status-row">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            className={`ao-status-chip ${status === s ? 'active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {STATUS_LABEL[s]}<span className="count">{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ao-empty">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="ao-empty">
          <h3>No orders match</h3>
          <p style={{ marginTop: 6 }}>Try clearing the filter or search.</p>
        </div>
      ) : (
        <>
          <div className="ao-table-wrap">
            <table className="ao-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} onClick={() => setSelected(o)}>
                    <td>
                      <div className="ao-order-id">#{o.id.slice(-6).toUpperCase()}</div>
                      {o.trackingNumber && (
                        <div className="ao-sub">📦 {o.trackingNumber}</div>
                      )}
                    </td>
                    <td>
                      <div>{o.customer?.name || '—'}</div>
                      <div className="ao-sub">{o.customer?.email || ''}</div>
                    </td>
                    <td>{o.items.length}</td>
                    <td>{money(o.total)}</td>
                    <td><span className={`status-pill status-${o.status}`}>{o.status}</span></td>
                    <td>{o.paymentStatus}</td>
                    <td>{new Date(o.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ao-card-list">
            {filtered.map(o => (
              <div key={o.id} className="ao-card" onClick={() => setSelected(o)}>
                <div className="ao-card-row">
                  <span className="ao-card-id">#{o.id.slice(-6).toUpperCase()}</span>
                  <span className="ao-card-total">{money(o.total)}</span>
                </div>
                <div className="ao-card-row">
                  <span className="ao-card-customer">
                    {o.customer?.name || '—'}{o.customer?.email ? ` · ${o.customer.email}` : ''}
                  </span>
                  <span className={`status-pill status-${o.status}`}>{o.status}</span>
                </div>
                <div className="ao-card-meta">
                  <span>{o.items.length} item{o.items.length === 1 ? '' : 's'}</span>
                  <span>{new Date(o.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onUpdated={patchLocal}
          toast={toast}
        />
      )}
    </>
  );
}

/* -------------------- Detail modal -------------------- */

function OrderDetailModal({
  order, onClose, onUpdated, toast
}: {
  order: AdminOrder;
  onClose: () => void;
  onUpdated: (o: AdminOrder) => void;
  toast: (m: string) => void;
}) {
  const [tracking, setTracking] = useState(order.trackingNumber || '');
  const [notes, setNotes] = useState(order.adminNotes || '');
  const [cancelReason, setCancelReason] = useState('');
  const [saving, setSaving] = useState(false);

  const run = async (fn: () => Promise<AdminOrder>, msg = 'Saved') => {
    setSaving(true);
    try {
      const updated = await fn();
      onUpdated(updated);
      toast(msg);
    } catch (e) {
      toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = (status: string) => run(() => api.admin.orders.setStatus(order.id, status), `Status → ${status}`);
  const saveTracking = () => run(() => api.admin.orders.setTracking(order.id, tracking.trim()), 'Tracking saved');
  const saveNotes = () => run(() => api.admin.orders.setNotes(order.id, notes), 'Notes saved');
  const cancel = () => {
    if (!cancelReason.trim()) return toast('Enter a cancel reason first');
    run(() => api.admin.orders.cancel(order.id, cancelReason.trim()), 'Order cancelled');
  };
  const refund = () => {
    if (!cancelReason.trim()) return toast('Enter a refund reason first');
    run(() => api.admin.orders.refund(order.id, cancelReason.trim()), 'Order refunded');
  };

  const advanceTo: Record<string, string> = {
    CREATED:    'PAID',
    PAID:       'PROCESSING',
    PROCESSING: 'SHIPPED',
    SHIPPED:    'DELIVERED'
  };
  const nextStatus = advanceTo[order.status];

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="ao-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ao-modal-head">
          <div className="h">
            <h3>Order #{order.id.slice(-6).toUpperCase()}</h3>
            <span className="sub">Placed {new Date(order.createdAt).toLocaleString()}</span>
          </div>
          <button className="ao-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ao-modal-body">
          <div className="ao-modal-section">
            <h4>Status</h4>
            <div className="btn-row" style={{ marginBottom: 10 }}>
              <span className={`status-pill status-${order.status}`}>{order.status}</span>
              <span className="status-pill" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--muted)' }}>
                Payment: {order.paymentStatus}
              </span>
            </div>
            <div className="btn-row">
              {nextStatus && (
                <button className="btn small" onClick={() => setStatus(nextStatus)} disabled={saving}>
                  Mark {nextStatus}
                </button>
              )}
              {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && order.status !== 'DELIVERED' && (
                <button className="btn small danger" onClick={cancel} disabled={saving}>
                  Cancel order
                </button>
              )}
              {order.paymentStatus === 'PAID' && order.status !== 'REFUNDED' && (
                <button className="btn small secondary" onClick={refund} disabled={saving}>
                  Refund
                </button>
              )}
            </div>
            {(order.status === 'CANCELLED' || order.status === 'REFUNDED') && order.cancelReason && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                Reason: {order.cancelReason}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <select
                className="full-input"
                value={order.status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={saving}
              >
                {['CREATED','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="ao-modal-section">
            <h4>Customer</h4>
            {order.customer ? (
              <>
                <div className="ao-kv"><span className="k">Name</span><span>{order.customer.name}</span></div>
                <div className="ao-kv"><span className="k">Email</span><span>{order.customer.email}</span></div>
                <div className="ao-kv"><span className="k">Phone</span><span>{order.customer.phone || '—'}</span></div>
              </>
            ) : <div style={{ color: 'var(--muted)' }}>Customer record not found</div>}
          </div>

          <div className="ao-modal-section">
            <h4>Shipping address</h4>
            <div className="ao-kv"><span className="k">Ship to</span><span>{order.shipping.fullName}</span></div>
            <div className="ao-kv"><span className="k">Phone</span><span>{order.shipping.phone}</span></div>
            <div className="ao-kv">
              <span className="k">Address</span>
              <span style={{ textAlign: 'right', maxWidth: '65%' }}>
                {order.shipping.line1}{order.shipping.line2 ? ', ' + order.shipping.line2 : ''}, {order.shipping.city}, {order.shipping.state} - {order.shipping.pincode}
              </span>
            </div>
          </div>

          <div className="ao-modal-section">
            <h4>Tracking number</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="full-input"
                placeholder="e.g. IN0092312312"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
              />
              <button className="btn small" onClick={saveTracking} disabled={saving}>Save</button>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
              Tip: adding a tracking number while Processing auto-advances the order to Shipped.
            </div>
          </div>

          <div className="ao-modal-section">
            <h4>Cancel / refund reason</h4>
            <input
              className="full-input"
              placeholder="Only used when you cancel or refund below…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>

          <div className="ao-modal-section">
            <h4>Items ({order.items.length})</h4>
            {order.items.map((it, i) => (
              <div key={i} className="list-item" style={{ padding: 10, marginBottom: 6 }}>
                {it.image && <img src={it.image} alt={it.productNameSnapshot} />}
                <div className="info">
                  <div className="name">{it.productNameSnapshot}</div>
                  <div className="meta">
                    Size: {it.size} · Qty: {it.quantity} · {money(it.unitPrice)} each{it.note ? ` · ${it.note}` : ''}
                  </div>
                </div>
                <div className="price">{money(it.unitPrice * it.quantity)}</div>
              </div>
            ))}
            <div className="ao-kv summary-total" style={{ marginTop: 10 }}>
              <span>Total</span><span>{money(order.total)}</span>
            </div>
          </div>

          <div className="ao-modal-section">
            <h4>Payment</h4>
            <div className="ao-kv"><span className="k">Razorpay order</span><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{order.razorpayOrderId || '—'}</span></div>
            <div className="ao-kv"><span className="k">Razorpay payment</span><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{order.razorpayPaymentId || '—'}</span></div>
          </div>

          <div className="ao-modal-section">
            <h4>Admin notes (private)</h4>
            <textarea
              className="full-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes visible to admins only…"
            />
            <div style={{ marginTop: 8 }}>
              <button className="btn small" onClick={saveNotes} disabled={saving}>Save notes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
