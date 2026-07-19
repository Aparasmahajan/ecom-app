'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { api, ApiError, Combo, Product } from '@/lib/api';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

/**
 * Combos admin tab. A combo is a curated bundle of products sold at a
 * discounted total price. Combos are shown on Home + Categories footer
 * ("Curated Combos" section). Only ADMIN / SUPER_ADMIN can CRUD.
 */
export default function AdminCombos() {
  const { toast } = useApp();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Combo | null | undefined>(undefined);

  const reload = async () => {
    setLoading(true);
    try {
      const [cs, ps] = await Promise.all([api.admin.combos.list(), api.catalog.products({})]);
      setCombos(cs);
      setProducts(ps);
    } catch (e) {
      toast('Failed to load: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (c: Combo) => {
    if (!confirm(`Delete combo "${c.name}"?`)) return;
    try { await api.admin.combos.remove(c.id); toast('Combo deleted'); await reload(); }
    catch (e) { toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  const toggleActive = async (c: Combo) => {
    try {
      await api.admin.combos.update(c.id, { isActive: !c.isActive });
      toast(!c.isActive ? 'Combo activated' : 'Combo hidden');
      await reload();
    } catch (e) { toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Combos</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{combos.length}</div>
        </div>
        <button className="btn" onClick={() => setEditing(null)}>+ Add Combo</button>
      </div>

      {loading ? <p className="empty">Loading combos…</p> : combos.length === 0 ? (
        <div className="ao-empty">
          <h3>No combos yet</h3>
          <p style={{ marginTop: 6 }}>Bundle products together and offer a discounted total.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Combo</th><th>Products</th><th>Combo Price</th><th>Saves</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {combos.map(c => {
              const items = c.productIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
              const listPrice = items.reduce((a, p) => a + p.basePrice, 0);
              const saves = Math.max(0, listPrice - c.comboPrice);
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{c.description}</div>
                  </td>
                  <td>
                    {items.map(p => (
                      <div key={p.id} style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {p.name} · {money(p.basePrice)}
                      </div>
                    ))}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{money(c.comboPrice)}</td>
                  <td>{saves > 0 ? money(saves) : '—'}</td>
                  <td>
                    <span className={`status-pill ${c.isActive ? 'status-DELIVERED' : 'status-CANCELLED'}`}>
                      {c.isActive ? 'Live' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <button className="btn small secondary" onClick={() => toggleActive(c)}>
                      {c.isActive ? 'Hide' : 'Show'}
                    </button>{' '}
                    <button className="btn small secondary" onClick={() => setEditing(c)}>Edit</button>{' '}
                    <button className="btn small danger" onClick={() => remove(c)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editing !== undefined && (
        <ComboModal
          initial={editing}
          products={products}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); reload(); }}
          toast={toast}
        />
      )}
    </>
  );
}

function ComboModal({
  initial, products, onClose, onSaved, toast
}: {
  initial: Combo | null;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
  toast: (m: string) => void;
}) {
  const isNew = initial === null;
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [image, setImage] = useState(initial?.image || '');
  const [productIds, setProductIds] = useState<string[]>(initial?.productIds || []);
  const [comboPrice, setComboPrice] = useState<number>(initial?.comboPrice || 1999);
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);
  const [busy, setBusy] = useState(false);

  const listPrice = productIds.reduce((sum, id) => sum + (products.find(p => p.id === id)?.basePrice || 0), 0);
  const saves = Math.max(0, listPrice - comboPrice);

  const toggleProduct = (id: string) => {
    setProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submit = async () => {
    if (!name.trim()) return toast('Name is required');
    if (productIds.length < 2) return toast('Pick at least 2 products');
    if (!image.trim()) return toast('Image URL is required');
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        image: image.trim(),
        productIds,
        comboPrice: Number(comboPrice),
        isActive
      };
      if (isNew) await api.admin.combos.create(body);
      else       await api.admin.combos.update(initial!.id, body);
      toast('Combo saved');
      onSaved();
    } catch (e) {
      toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? 'Add' : 'Edit'} Combo</h3>

        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="full-input" />

        <label style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, display: 'block' }}>Description</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="full-input" />

        <label style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, display: 'block' }}>Cover image URL</label>
        <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" className="full-input" />

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Combo price (₹)</label>
            <input type="number" min={0} value={comboPrice} onChange={(e) => setComboPrice(Number(e.target.value))} className="full-input" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>List total</label>
            <div style={{ padding: 10, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)' }}>
              {money(listPrice)}{saves > 0 && <span style={{ color: 'var(--accent)', marginLeft: 8 }}>save {money(saves)}</span>}
            </div>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13 }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: 'auto' }} />
          Show on storefront
        </label>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            Products in combo ({productIds.length})
          </div>
          <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            {products.map(p => {
              const on = productIds.includes(p.id);
              return (
                <label key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: 8,
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: on ? 'rgba(245,200,66,0.06)' : 'transparent'
                }}>
                  <input type="checkbox" checked={on} onChange={() => toggleProduct(p.id)} style={{ width: 'auto' }} />
                  <img src={p.images[0]} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{money(p.basePrice)}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-actions">
          <button className="btn" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          <button className="btn secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
