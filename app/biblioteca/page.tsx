'use client';

import { BookCard } from '@/components/BookCard';
import { createClient } from '@/lib/supabase-browser';
import type { LibraryItem, ShelfStatus } from '@/lib/types';
import { shelfLabels } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

function LibraryContent() {
  const params = useSearchParams();
  const initial = (params.get('status') as ShelfStatus) || 'all';
  const [filter, setFilter] = useState<ShelfStatus | 'all'>(initial);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

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


  async function removeItem(item: LibraryItem) {
    const confirmed = window.confirm(`Remover “${item.book.title}” da sua biblioteca?`);
    if (!confirmed) return;

    setRemovingId(item.id);
    setError('');

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from('library_items')
      .delete()
      .eq('id', item.id);

    if (deleteError) {
      setError(deleteError.message);
      setRemovingId(null);
      return;
    }

    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    setRemovingId(null);
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

      {error && <div className="form-error" style={{ marginTop: 18 }}>{error}</div>}

      {loading ? (
        <div className="empty">Carregando…</div>
      ) : visible.length ? (
        <div className="grid" style={{ marginTop: 24 }}>
          {visible.map((item) => (
            <div key={item.id}>
              <BookCard book={item.book} readCount={item.read_count} showAddButton={false} />
              <div className="library-card-actions">
                {item.status === 'read' && (
                  <button
                    className="secondary-btn"
                    onClick={() => increment(item)}
                  >
                    Li novamente
                  </button>
                )}
                <button
                  className="danger-btn"
                  onClick={() => removeItem(item)}
                  disabled={removingId === item.id}
                  aria-label={`Remover ${item.book.title} da biblioteca`}
                >
                  <Trash2 size={17} />
                  {removingId === item.id ? 'Removendo…' : 'Remover'}
                </button>
              </div>
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
