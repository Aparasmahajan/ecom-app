'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { api, ApiError, Banner, BannerTemplate } from '@/lib/api';
import { PromoBanner } from '@/components/BannerStrip';

const TEMPLATES: { key: BannerTemplate; label: string; hint: string }[] = [
  { key: 'hero',    label: 'Hero',    hint: 'Big headline, photo fades in from the right' },
  { key: 'sale',    label: 'Sale',    hint: 'Dark overlay, gold headline, price chip' },
  { key: 'split',   label: 'Split',   hint: 'Photo on the left, copy on the right' },
  { key: 'minimal', label: 'Minimal', hint: 'No photo — clean gradient panel' }
];

/**
 * Landing-page banner manager. Admin controls how many banners show on Home
 * (homeBannerCount) and curates the banners themselves — each from a default
 * template, with an image, copy and an optional featured price.
 */
export default function AdminBanners() {
  const { toast } = useApp();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [count, setCount] = useState(3);
  const [countDraft, setCountDraft] = useState('3');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    try {
      const [bs, s] = await Promise.all([api.admin.banners.list(), api.admin.settings.get()]);
      setBanners(bs);
      setCount(s.homeBannerCount);
      setCountDraft(String(s.homeBannerCount));
    } catch (e) { toast('Failed to load: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast(msg); await load(); }
    catch (e) { toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message)); }
  };

  const saveCount = () => {
    const n = Number(countDraft);
    if (!Number.isFinite(n) || n < 0) return toast('Enter a number ≥ 0');
    run(() => api.admin.settings.update({ homeBannerCount: Math.floor(n) }), 'Banner count saved');
  };
  const toggleActive = (b: Banner) =>
    run(() => api.admin.banners.update(b.id, { active: !b.active }), b.active ? 'Banner hidden' : 'Banner shown');
  const remove = (b: Banner) => {
    if (!confirm(`Delete banner "${b.title}"?`)) return;
    run(() => api.admin.banners.remove(b.id), 'Banner deleted');
  };
  const move = (b: Banner, dir: -1 | 1) => {
    const sorted = [...banners].sort((a, c) => a.position - c.position);
    const idx = sorted.findIndex(x => x.id === b.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    run(async () => {
      await api.admin.banners.update(b.id, { position: swap.position });
      await api.admin.banners.update(swap.id, { position: b.position });
    }, 'Reordered');
  };

  const activeCount = banners.filter(b => b.active).length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Banners</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{banners.length} <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>({activeCount} active)</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Show on Home</label>
            <input
              type="number" min={0}
              value={countDraft}
              onChange={(e) => setCountDraft(e.target.value)}
              style={{ width: 80, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
            />
          </div>
          <button className="btn small" onClick={saveCount} disabled={Number(countDraft) === count}>Save</button>
          <button className="btn" onClick={() => setEditing(null)}>+ Add Banner</button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
        The Home page shows up to <strong style={{ color: 'var(--text)' }}>{count}</strong> active banner(s), ordered top-to-bottom below.
      </p>

      {loading ? <p className="empty">Loading banners…</p> : banners.length === 0 ? (
        <div className="ao-empty">
          <h3>No banners yet</h3>
          <p style={{ marginTop: 6 }}>Add one from a template to feature it on the storefront.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Preview</th><th>Title</th><th>Template</th><th>Price</th><th>Status</th><th>Order</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...banners].sort((a, b) => a.position - b.position).map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ width: 80, height: 44, borderRadius: 6, overflow: 'hidden', background: 'var(--card-2)', backgroundImage: b.template !== 'minimal' ? `url(${b.imageUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{b.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{b.subtitle}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{b.template}</td>
                  <td>{b.price || '—'}</td>
                  <td>
                    <span className={`status-pill ${b.active ? 'status-DELIVERED' : 'status-CANCELLED'}`}>
                      {b.active ? 'Live' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <button className="btn small secondary" onClick={() => move(b, -1)}>↑</button>{' '}
                    <button className="btn small secondary" onClick={() => move(b, +1)}>↓</button>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn small secondary" onClick={() => toggleActive(b)}>{b.active ? 'Hide' : 'Show'}</button>{' '}
                    <button className="btn small secondary" onClick={() => setEditing(b)}>Edit</button>{' '}
                    <button className="btn small danger" onClick={() => remove(b)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined && (
        <BannerModal
          initial={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); load(); }}
          toast={toast}
        />
      )}
    </>
  );
}

function BannerModal({
  initial, onClose, onSaved, toast
}: {
  initial: Banner | null;
  onClose: () => void;
  onSaved: () => void;
  toast: (m: string) => void;
}) {
  const isNew = initial === null;
  const [template, setTemplate] = useState<BannerTemplate>(initial?.template || 'hero');
  const [title, setTitle] = useState(initial?.title || '');
  const [subtitle, setSubtitle] = useState(initial?.subtitle || '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80');
  const [price, setPrice] = useState(initial?.price || '');
  const [ctaText, setCtaText] = useState(initial?.ctaText || 'Shop Now');
  const [ctaHref, setCtaHref] = useState(initial?.ctaHref || '/products');
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [busy, setBusy] = useState(false);

  const preview: Banner = {
    id: 'preview', template, title: title || 'Your headline', subtitle,
    imageUrl, price, ctaText, ctaHref, active, position: 0, createdAt: ''
  };

  const submit = async () => {
    if (!title.trim()) return toast('Title is required');
    setBusy(true);
    try {
      const body = { template, title: title.trim(), subtitle: subtitle.trim(), imageUrl: imageUrl.trim(), price: price.trim(), ctaText: ctaText.trim(), ctaHref: ctaHref.trim(), active };
      if (isNew) await api.admin.banners.create(body);
      else       await api.admin.banners.update(initial!.id, body);
      toast('Banner saved');
      onSaved();
    } catch (e) {
      toast('Failed: ' + (e instanceof ApiError ? e.message : (e as Error).message));
    } finally { setBusy(false); }
  };

  const inputStyle = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', marginBottom: 8 } as const;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? 'Add' : 'Edit'} Banner</h3>

        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Template</label>
        <div className="banner-templates">
          {TEMPLATES.map(t => (
            <button key={t.key} className={`bt ${template === t.key ? 'active' : ''}`} onClick={() => setTemplate(t.key)} title={t.hint}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
          {TEMPLATES.find(t => t.key === template)?.hint}
        </div>

        {/* Live preview */}
        <div style={{ marginBottom: 12 }}>
          <PromoBanner banner={preview} preview />
        </div>

        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />

        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Subtitle</label>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} style={inputStyle} />

        {template !== 'minimal' && (
          <>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Image URL</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
          </>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Featured price (optional)</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. ₹999" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Button text</label>
            <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Button link</label>
        <input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/products?categoryId=shoes" style={inputStyle} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13 }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: 'auto' }} />
          Active (show on storefront)
        </label>

        <div className="form-actions">
          <button className="btn" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          <button className="btn secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
