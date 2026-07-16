'use client';

import { createClient } from '@/lib/supabase-browser';
import type { Book, LibraryItem, ShelfStatus } from '@/lib/types';
import { bookKey, shelfLabels } from '@/lib/utils';
import { Heart } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function BookDetail() {
  const params = useSearchParams();
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [readCount, setReadCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const book = useMemo(() => {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(params.get('data') || '')))) as Book;
    } catch {
      return null;
    }
  }, [params]);

  useEffect(() => {
    if (!book) return;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('library_items').select('*').eq('user_id', user.id).eq('book_key', bookKey(book)).maybeSingle();
      if (data) {
        const current = data as LibraryItem;
        setItem(current);
        setReadCount(current.read_count || 1);
      }
    })();
  }, [book]);

  if (!book) return <main className="container section"><div className="empty">Não foi possível carregar este livro.</div></main>;

  async function save(status: ShelfStatus) {
    if (!book) return;
    setBusy(true); setError(''); setMessage('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = '/login'; return; }
    const now = new Date().toISOString();
    const count = status === 'read' ? Math.max(1, Number(readCount) || 1) : Math.max(1, item?.read_count || 1);
    const { data, error: saveError } = await supabase.from('library_items').upsert({
      user_id: user.id,
      book_key: bookKey(book),
      status,
      read_count: count,
      is_favorite: item?.is_favorite || false,
      rating: item?.rating || null,
      book,
      updated_at: now,
      finished_at: status === 'read' ? now : item?.finished_at || null,
    }, { onConflict: 'user_id,book_key' }).select('*').single();
    if (saveError) setError(saveError.message);
    else { setItem(data as LibraryItem); setMessage(`Livro salvo em “${shelfLabels[status]}”.`); }
    setBusy(false);
  }

  async function toggleFavorite() {
    if (!book) return;
    if (!item) { setError('Adicione o livro à biblioteca antes de favoritar.'); return; }
    const next = !item.is_favorite;
    const { error: favoriteError } = await createClient().from('library_items').update({ is_favorite: next, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (favoriteError) setError(favoriteError.message);
    else setItem({ ...item, is_favorite: next });
  }

  return <main className="container">
    <section className="detail">
      <div>
        {book.coverUrl ? <img className="detail-cover" src={book.coverUrl} alt={`Capa de ${book.title}`} /> : <div className="cover-wrap detail-placeholder"><div className="cover-placeholder">{book.title}</div></div>}
        <div className="read-count-box">
          <label htmlFor="read-count">Quantas vezes você leu?</label>
          <input id="read-count" type="number" min="1" step="1" value={readCount} onChange={event => setReadCount(Math.max(1, Number(event.target.value) || 1))} />
          <small>Este valor é usado quando você escolher “Já li”.</small>
        </div>
      </div>
      <div>
        <div className="eyebrow">{book.source}</div>
        <h1>{book.title}</h1>
        <p className="muted"><strong>{book.authors.join(', ') || 'Autor desconhecido'}</strong>{book.publishedYear ? ` · ${book.publishedYear}` : ''}</p>
        <p style={{ lineHeight: 1.75 }}>{book.description || 'Descrição não disponível.'}</p>
        <div className="detail-shelf-actions">
          {(['read', 'reading', 'want'] as ShelfStatus[]).map(status => <button disabled={busy} key={status} className={item?.status === status ? 'primary-btn' : 'secondary-btn'} onClick={() => save(status)}>{shelfLabels[status]}</button>)}
        </div>
        <button className={`favorite-detail-btn ${item?.is_favorite ? 'active' : ''}`} onClick={toggleFavorite}><Heart size={19} fill={item?.is_favorite ? 'currentColor' : 'none'} />{item?.is_favorite ? 'Favorito' : 'Adicionar aos favoritos'}</button>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="form-error">{error}</p>}
      </div>
    </section>
  </main>;
}
