'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { K, get, set, uid, money } from '@/lib/storage';
import { productRating } from '@/lib/helpers';
import { productImages } from '@/lib/images';
import type { Category, Product, Variant } from '@/lib/types';

export default function AdminProducts() {
  const { toast } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined); // undefined = closed, null = new

  const reload = () => {
    setProducts(get<Product[]>(K.PRODUCTS, []));
    setCats(get<Category[]>(K.CATEGORIES, []));
  };
  useEffect(() => { reload(); }, []);

  const toggleHot = (id: string, checked: boolean) => {
    const list = get<Product[]>(K.PRODUCTS, []);
    const p = list.find(x => x.id === id);
    if (p) { p.isHotSeller = checked; set(K.PRODUCTS, list); reload(); toast('Updated'); }
  };

  const setOverride = (id: string, val: string) => {
    const list = get<Product[]>(K.PRODUCTS, []);
    const p = list.find(x => x.id === id);
    if (!p) return;
    p.adminRatingOverride = val === '' ? null : Math.max(0, Math.min(5, +val));
    set(K.PRODUCTS, list);
    reload();
    toast('Rating override saved');
  };

  const delProduct = (id: string) => {
    if (!confirm('Delete this product?')) return;
    set(K.PRODUCTS, get<Product[]>(K.PRODUCTS, []).filter(p => p.id !== id));
    reload();
  };

  const saveProduct = (updated: Product, isNew: boolean) => {
    const list = get<Product[]>(K.PRODUCTS, []);
    if (isNew) list.push(updated);
    else {
      const i = list.findIndex(x => x.id === updated.id);
      if (i >= 0) list[i] = updated;
    }
    set(K.PRODUCTS, list);
    setEditing(undefined);
    reload();
    toast('Saved');
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <button className="btn" onClick={() => setEditing(null)}>+ Add Product</button>
      </div>
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
                  checked={p.isHotSeller}
                  onChange={(e) => toggleHot(p.id, e.target.checked)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0" max="5" step="0.1"
                  defaultValue={p.adminRatingOverride ?? ''}
                  placeholder={String(productRating(p.id) || '—')}
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
  onSave: (p: Product, isNew: boolean) => void;
  onCancel: () => void;
  toast: (m: string) => void;
}) {
  const isNew = initial === null;
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId || cats[0]?.id || '');
  const [basePrice, setBasePrice] = useState<number>(initial?.basePrice || 999);
  const [gender, setGender] = useState<Product['gender']>(initial?.gender || 'MEN');
  const [ageGroup, setAgeGroup] = useState<Product['ageGroup']>(initial?.ageGroup || 'ADULT');
  const [imagesStr, setImagesStr] = useState((initial?.images || []).join(', '));
  const [variantsStr, setVariantsStr] = useState(
    (initial?.variants || []).map(v => `${v.size}:${v.stock}`).join(', ')
  );
  const [isHotSeller, setIsHotSeller] = useState(initial?.isHotSeller || false);

  const submit = () => {
    if (!name.trim()) { toast('Name required'); return; }
    const images = imagesStr.trim()
      ? imagesStr.split(',').map(s => s.trim()).filter(Boolean)
      : productImages(categoryId, Math.floor(Math.random() * 5));
    const variants: Variant[] = variantsStr.split(',').map(s => {
      const [size, stock] = s.split(':').map(x => x?.trim());
      return {
        id: uid(),
        size: size || 'Free',
        color: 'Default',
        stock: +stock || 0,
        priceModifier: 0
      };
    }).filter(v => v.size);
    const product: Product = {
      id: initial?.id || uid(),
      name: name.trim(),
      description: description.trim(),
      categoryId,
      basePrice: +basePrice,
      gender,
      ageGroup,
      images,
      variants: variants.length ? variants : [{
        id: uid(), size: 'Free', color: 'Default', stock: 10, priceModifier: 0
      }],
      isHotSeller,
      adminRatingOverride: initial?.adminRatingOverride ?? null
    };
    onSave(product, isNew);
  };

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? 'Add' : 'Edit'} Product</h3>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>Description</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Price (₹)</label>
            <input type="number" value={basePrice} onChange={(e) => setBasePrice(+e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value as Product['gender'])}>
              <option value="MEN">MEN</option>
              <option value="WOMEN">WOMEN</option>
              <option value="UNISEX">UNISEX</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Age Group</label>
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as Product['ageGroup'])}>
              <option value="KIDS">KIDS</option>
              <option value="TEEN">TEEN</option>
              <option value="ADULT">ADULT</option>
            </select>
          </div>
        </div>
        <label>Image URLs (comma-separated)</label>
        <textarea rows={2} value={imagesStr} onChange={(e) => setImagesStr(e.target.value)} />
        <label>Variants (size:stock, comma-separated) e.g. S:10, M:15, L:8</label>
        <input value={variantsStr} onChange={(e) => setVariantsStr(e.target.value)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <input
            type="checkbox"
            checked={isHotSeller}
            onChange={(e) => setIsHotSeller(e.target.checked)}
            style={{ width: 'auto' }}
          /> Hot Seller
        </label>
        <div className="form-actions">
          <button className="btn" onClick={submit}>Save</button>
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
