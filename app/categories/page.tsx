'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/context';
import { K, get } from '@/lib/storage';
import type { Category } from '@/lib/types';

const bgFor = (id: string) => `https://picsum.photos/seed/cat-${id}/700/400`;

export default function CategoriesPage() {
  const { ready } = useApp();
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    if (!ready) return;
    setCats(get<Category[]>(K.CATEGORIES, []));
  }, [ready]);

  return (
    <>
      <h2 style={{ marginBottom: 16, letterSpacing: 1 }}>CATEGORIES</h2>
      <div className="big-cat-list">
        {cats.map(c => (
          <Link
            key={c.id}
            href={`/products?categoryId=${c.id}`}
            className="big-cat"
          >
            <div className="bc-img" style={{ backgroundImage: `url(${bgFor(c.id)})` }} />
            <div className="bc-content">
              <div className="bc-name">{c.name}</div>
              <div className="bc-sub">Explore Now →</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
