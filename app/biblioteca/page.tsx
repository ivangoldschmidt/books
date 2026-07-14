'use client';

import { BookCard } from '@/components/BookCard';
import { createClient } from '@/lib/supabase-browser';
import type { LibraryItem, ShelfStatus } from '@/lib/types';
import { shelfLabels } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function LibraryContent() {
  const params = useSearchParams();
  const initial = (params.get('status') as ShelfStatus) || 'all';
  const [filter, setFilter] = useState<ShelfStatus | 'all'>(initial);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = '/login';
      return;
    }

    const { data } = await supabase
      .from('library_items')
      .select('*')
      .order('updated_at', { ascending: false });

    setItems((data || []) as LibraryItem[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = filter === 'all' ? items : items.filter((item) => item.status === filter);

  async function increment(item: LibraryItem) {
    const supabase = createClient();
    await supabase
      .from('library_items')
      .update({
        read_count: item.read_count + 1,
        status: 'read',
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);
    await load();
  }

  return (
    <main className="container section">
      <div className="section-head">
        <div>
          <div className="eyebrow">Sua coleção</div>
          <h2>Biblioteca</h2>
        </div>
      </div>

      <div className="tabs">
        <button
          onClick={() => setFilter('all')}
          className={`tab ${filter === 'all' ? 'active' : ''}`}
        >
          Todos ({items.length})
        </button>
        {(['read', 'reading', 'want'] as ShelfStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`tab ${filter === status ? 'active' : ''}`}
          >
            {shelfLabels[status]} ({items.filter((item) => item.status === status).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">Carregando…</div>
      ) : visible.length ? (
        <div className="grid" style={{ marginTop: 24 }}>
          {visible.map((item) => (
            <div key={item.id}>
              <BookCard book={item.book} readCount={item.read_count} />
              {item.status === 'read' && (
                <button
                  className="secondary-btn"
                  style={{ width: '100%', marginTop: 9 }}
                  onClick={() => increment(item)}
                >
                  Li novamente
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 24 }}>
          Nenhum livro nesta seção.
        </div>
      )}
    </main>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<main className="container section"><div className="empty">Carregando…</div></main>}>
      <LibraryContent />
    </Suspense>
  );
}
