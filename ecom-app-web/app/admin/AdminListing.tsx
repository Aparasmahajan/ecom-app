'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/context';
import { api, ApiError, ListingRow } from '@/lib/api';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

/**
 * Listing tab — the "storefront" side of the two management views.
 *
 * Inventory (separate tab) = internal, real stock per variant.
 * Listing (this tab)       = what customers actually see on the site:
 *   • Listed on/off toggle — hide a product without deleting it.
 *   • List quantity — how many units the admin wants to advertise, kept
 *     independent of real inventory so items can be listed "outside inventory".
 */
export default function AdminListing() {
  const { toast } = useApp();
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LISTED' | 'HIDDEN'>('ALL');
  const [drafts, setDrafts] = useState<Record<string, string>>({}); // productId -> in-flight list qty

  const load = async () => {
    setLoading(true);
    try { setRows(await api.admin.listing.list()); }
    catch (e) { toast('Failed to load: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    all: rows.length,
    listed: rows.filter(r => r.listed).length,
    hidden: rows.filter(r => !r.listed).length
  }), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(r => {
      if (filter === 'LISTED' && !r.listed) return false;
      if (filter === 'HIDDEN' && r.listed) return false;
      if (!term) return true;
      return r.productName.toLowerCase().includes(term)
          || r.categoryId.toLowerCase().includes(term);
    });
  }, [rows, q, filter]);

  const toggleListed = async (r: ListingRow) => {
    try {
      const updated = await api.admin.listing.setListed(r.productId, !r.listed);
      setRows(prev => prev.map(x => x.productId === r.productId ? updated : x));
      toast(updated.listed ? 'Now listed on site' : 'Hidden from site');
    } catch (e) { toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  const saveQty = async (productId: string) => {
    const raw = drafts[productId];
    if (raw === undefined) return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return toast('List quantity must be ≥ 0');
    try {
      const updated = await api.admin.listing.setListQuantity(productId, Math.floor(n));
      setRows(prev => prev.map(x => x.productId === productId ? updated : x));
      setDrafts(prev => { const cp = { ...prev }; delete cp[productId]; return cp; });
      toast('List quantity saved');
    } catch (e) { toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  return (
    <>
      <div className="ao-toolbar">
        <input
          className="ao-search"
          placeholder="Search product / category…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="ao-status-row">
        <button className={`ao-status-chip ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
          All<span className="count">{counts.all}</span>
        </button>
        <button className={`ao-status-chip ${filter === 'LISTED' ? 'active' : ''}`} onClick={() => setFilter('LISTED')}>
          Listed<span className="count">{counts.listed}</span>
        </button>
        <button className={`ao-status-chip ${filter === 'HIDDEN' ? 'active' : ''}`} onClick={() => setFilter('HIDDEN')}>
          Hidden<span className="count">{counts.hidden}</span>
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Listing controls what shoppers see. Real stock lives in the <strong style={{ color: 'var(--text)' }}>Inventory</strong> tab —
        list quantity is the number you advertise and can differ from actual stock.
      </p>

      {loading ? <p className="empty">Loading listings…</p> : filtered.length === 0 ? (
        <div className="ao-empty">
          <h3>Nothing matches</h3>
          <p style={{ marginTop: 6 }}>Try clearing the search or filter.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th><th>Category</th><th>Price</th>
                <th>Real Stock</th><th>Listed</th><th>List Qty</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const draft = drafts[r.productId];
                const dirty = draft !== undefined && Number(draft) !== r.listQuantity;
                return (
                  <tr key={r.productId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.productImage && <img src={r.productImage} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />}
                        <div style={{ fontWeight: 600 }}>{r.productName}</div>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{r.categoryId}</td>
                    <td>{money(r.basePrice)}</td>
                    <td>
                      <span className={`status-pill ${r.totalStock === 0 ? 'status-CANCELLED' : r.totalStock <= 5 ? 'status-PROCESSING' : 'status-DELIVERED'}`}>
                        {r.totalStock} in stock
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn small ${r.listed ? '' : 'secondary'}`}
                        onClick={() => toggleListed(r)}
                      >
                        {r.listed ? 'Listed' : 'Hidden'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input
                          type="number" min={0}
                          value={draft ?? String(r.listQuantity)}
                          onChange={(e) => setDrafts(d => ({ ...d, [r.productId]: e.target.value }))}
                          style={{ width: 72, padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
                        />
                        <button
                          className="btn small"
                          onClick={() => saveQty(r.productId)}
                          disabled={!dirty}
                          style={{ opacity: dirty ? 1 : 0.4 }}
                        >
                          Save
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
