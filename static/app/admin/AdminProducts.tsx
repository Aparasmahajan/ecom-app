'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { api, ApiError, Category, Product, Variant } from '@/lib/api';
import { productImages } from '@/lib/images';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export default function AdminProducts() {
  const { toast } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined); // undefined = closed, null = new
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const [ps, cs] = await Promise.all([api.catalog.products({}), api.catalog.categories()]);
      setProducts(ps);
      setCats(cs);
    } catch (e) {
      toast('Load failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<unknown>, msg = 'Saved') => {
    try {
      await fn();
      toast(msg);
      await reload();
    } catch (e) {
      toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    }
  };

  const toggleHot     = (id: string, checked: boolean) => run(() => api.admin.products.setHotSeller(id, checked), 'Hot seller updated');
  const setOverride   = (id: string, val: string) => {
    const parsed = val === '' ? null : Math.max(0, Math.min(5, Number(val)));
    return run(() => api.admin.products.setRatingOverride(id, parsed as number), 'Rating override saved');
  };
  const delProduct    = (id: string) => {
    if (!confirm('Delete this product?')) return;
    run(() => api.admin.products.remove(id), 'Product deleted');
  };

  const saveProduct = async (form: Partial<Product>, id?: string) => {
    try {
      if (id) await api.admin.products.update(id, form);
      else    await api.admin.products.create(form);
      setEditing(undefined);
      toast('Product saved');
      await reload();
    } catch (e) {
      toast('Save failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    }
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <button className="btn" onClick={() => setEditing(null)}>+ Add Product</button>
      </div>
      {loading ? <p className="empty">Loading products…</p> : (
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Category</th><th>Price</th>
              <th>Hot</th><th>Rating</th><th>Variants</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{cats.find(c => c.id === p.categoryId)?.name || '—'}</td>
                <td>{money(p.basePrice)}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={p.hotSeller}
                    onChange={(e) => toggleHot(p.id, e.target.checked)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0" max="5" step="0.1"
                    defaultValue={p.adminRatingOverride ?? ''}
                    placeholder={String(p.effectiveRating || '—')}
                    style={{ width: 70, padding: 4 }}
                    onBlur={(e) => setOverride(p.id, e.target.value)}
                  />
                </td>
                <td>{p.variants.length}</td>
                <td>
                  <button className="btn small secondary" onClick={() => setEditing(p)}>Edit</button>{' '}
                  <button className="btn small danger" onClick={() => delProduct(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing !== undefined && (
        <ProductModal
          initial={editing}
          cats={cats}
          onSave={saveProduct}
          onCancel={() => setEditing(undefined)}
          toast={toast}
        />
      )}
    </>
  );
}

function ProductModal({
  initial, cats, onSave, onCancel, toast
}: {
  initial: Product | null;
  cats: Category[];
  onSave: (form: Partial<Product>, id?: string) => Promise<void>;
  onCancel: () => void;
  toast: (m: string) => void;
}) {
  const isNew = initial === null;
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId || cats[0]?.id || '');
  const [basePrice, setBasePrice] = useState<number>(initial?.basePrice || 999);
  const [imagesStr, setImagesStr] = useState((initial?.images || []).join(', '));
  const [hotSeller, setHotSeller] = useState(initial?.hotSeller || false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast('Name required'); return; }
    const images = imagesStr.trim()
      ? imagesStr.split(',').map(s => s.trim()).filter(Boolean)
      : productImages(categoryId, Math.floor(Math.random() * 5));
    setBusy(true);
    await onSave({
      name: name.trim(),
      description: description.trim(),
      categoryId,
      basePrice: Number(basePrice),
      images,
      hotSeller
    }, initial?.id);
    setBusy(false);
  };

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? 'Add' : 'Edit'} Product</h3>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 8 }} />

        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Description</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 8, fontFamily: 'inherit' }} />

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Price (₹)</label>
            <input type="number" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }} />
          </div>
        </div>

        <label style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Image URLs (comma-separated — leave blank for auto)</label>
        <textarea rows={2} value={imagesStr} onChange={(e) => setImagesStr(e.target.value)}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontFamily: 'inherit' }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13 }}>
          <input type="checkbox" checked={hotSeller} onChange={(e) => setHotSeller(e.target.checked)} style={{ width: 'auto' }} />
          Hot Seller
        </label>

        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
          Variants (sizes / stock) can be managed via the API. Adding via this modal is a follow-up.
        </p>

        <div className="form-actions">
          <button className="btn" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
