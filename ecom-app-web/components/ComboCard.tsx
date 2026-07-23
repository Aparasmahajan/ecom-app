'use client';

import Link from 'next/link';
import type { Combo } from '@/lib/api';

const money = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export default function ComboCard({ combo }: { combo: Combo }) {
  return (
    <Link href={`/products?combo=${combo.id}`} className="combo-card">
      <div className="combo-img" style={{ backgroundImage: `url(${combo.image})` }} />
      <div className="combo-overlay" />
      <div className="combo-body">
        <div className="combo-count">{combo.productIds.length}-PIECE COMBO</div>
        <div className="combo-name">{combo.name}</div>
        <div className="combo-desc">{combo.description}</div>
        <div className="combo-price-row">
          <span className="combo-price">{money(combo.comboPrice)}</span>
          <span className="combo-cta">Shop combo →</span>
        </div>
      </div>
    </Link>
  );
}
