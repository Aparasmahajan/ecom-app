'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/context';
import { api, ApiError, InventoryRow } from '@/lib/api';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

const LOW_STOCK_THRESHOLD = 5;

/**
 * Inventory management tab. Flat list of every variant × product,
 * with in-place stock editing. Search across product / size / color,
 * quick filter for low-stock and out-of-stock.
 *
 * Backend equivalent: PUT /admin/variants/{id} — we call
 * api.admin.inventory.updateStock which wraps it in the localStorage impl.
 */
export default function AdminInventory() {
  const { toast } = useApp();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [drafts, setDrafts] = useState<Record<string, string>>({}); // variantId -> in-flight stock value

  const load = async () => {
    setLoading(true);
    try { setRows(await api.admin.inventory.list()); }
    catch (e) { toast('Failed to load: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(r => {
      if (filter === 'LOW' && r.stock > LOW_STOCK_THRESHOLD) return false;
      if (filter === 'OUT' && r.stock !== 0) return false;
      if (!term) return true;
      return r.productName.toLowerCase().includes(term)
          || r.size.toLowerCase().includes(term)
          || r.color.toLowerCase().includes(term);
    });
  }, [rows, q, filter]);

  const counts = useMemo(() => ({
    all: rows.length,
    low: rows.filter(r => r.stock > 0 && r.stock <= LOW_STOCK_THRESHOLD).length,
    out: rows.filter(r => r.stock === 0).length
  }), [rows]);

  const save = async (variantId: string) => {
    const raw = drafts[variantId];
    if (raw === undefined) return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return toast('Stock must be a non-negative number');
    try {
      const updated = await api.admin.inventory.updateStock(variantId, Math.floor(n));
      setRows(prev => prev.map(r => r.variantId === variantId ? updated : r));
      setDrafts(prev => { const cp = { ...prev }; delete cp[variantId]; return cp; });
      toast('Stock updated');
    } catch (e) {
      toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    }
  };

  const adjust = (variantId: string, current: number, delta: number) => {
    const next = Math.max(0, current + delta);
    setDrafts(d => ({ ...d, [variantId]: String(next) }));
  };

  const stockClass = (n: number) =>
    n === 0 ? 'status-CANCELLED' :
    n <= LOW_STOCK_THRESHOLD ? 'status-PROCESSING' : 'status-DELIVERED';

  return (
    <>
      <div className="ao-toolbar">
        <input
          className="ao-search"
          placeholder="Search product / size / color…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="ao-status-row">
        <button className={`ao-status-chip ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
          All<span className="count">{counts.all}</span>
        </button>
        <button className={`ao-status-chip ${filter === 'LOW' ? 'active' : ''}`} onClick={() => setFilter('LOW')}>
          Low stock<span className="count">{counts.low}</span>
        </button>
        <button className={`ao-status-chip ${filter === 'OUT' ? 'active' : ''}`} onClick={() => setFilter('OUT')}>
          Out of stock<span className="count">{counts.out}</span>
        </button>
      </div>

      {loading ? <p className="empty">Loading inventory…</p> : filtered.length === 0 ? (
        <div className="ao-empty">
          <h3>Nothing matches</h3>
          <p style={{ marginTop: 6 }}>Try clearing the search or filter.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Size</th><th>Color</th><th>Price</th><th>Stock</th><th>Update</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const draft = drafts[r.variantId];
              const dirty = draft !== undefined && Number(draft) !== r.stock;
              return (
                <tr key={r.variantId}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {r.productImage && <img src={r.productImage} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />}
                      <div style={{ fontWeight: 600 }}>{r.productName}</div>
                    </div>
                  </td>
                  <td>{r.size}</td>
                  <td>{r.color}</td>
                  <td>{money(r.basePrice)}</td>
                  <td>
                    <span className={`status-pill ${stockClass(r.stock)}`}>{r.stock} in stock</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button className="btn small secondary" onClick={() => adjust(r.variantId, draft !== undefined ? Number(draft) : r.stock, -1)}>−</button>
                      <input
                        type="number" min={0}
                        value={draft ?? String(r.stock)}
                        onChange={(e) => setDrafts(d => ({ ...d, [r.variantId]: e.target.value }))}
                        style={{ width: 64, padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
                      />
                      <button className="btn small secondary" onClick={() => adjust(r.variantId, draft !== undefined ? Number(draft) : r.stock, +1)}>+</button>
                      <button
                        className="btn small"
                        onClick={() => save(r.variantId)}
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
      )}
    </>
  );
}
