'use client';
import type { Book, ShelfStatus } from '@/lib/types';
import { bookKey, shelfLabels } from '@/lib/utils';
import { createClient } from '@/lib/supabase-browser';
import { useState } from 'react';

export function AddBookModal({ book, onClose, onSaved }: { book: Book; onClose: () => void; onSaved?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(status: ShelfStatus) {
    setBusy(true);
    setError('');
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) { location.href = '/login'; return; }
    const now = new Date().toISOString();
    const key = bookKey(book);
    const { data: existing, error: lookupError } = await s.from('library_items').select('id,read_count,finished_at').eq('user_id', user.id).eq('book_key', key).maybeSingle();
    if (lookupError) { setError(lookupError.message); setBusy(false); return; }
    let error: any = null;
    if (existing) {
      const result = await s.from('library_items').update({ status, book, updated_at: now, finished_at: status === 'read' ? (existing.finished_at || now) : existing.finished_at }).eq('id', existing.id);
      error = result.error;
    } else {
      const result = await s.from('library_items').insert({ user_id: user.id, book_key: key, status, read_count: 0, is_favorite: false, rating: null, book, updated_at: now, finished_at: status === 'read' ? now : null });
      error = result.error;
    }
    if (error) { setError(error.message); setBusy(false); return; }
    onSaved?.();
    onClose();
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}>
    <h2>Adicionar à estante</h2><p className="muted">{book.title}</p>
    <div className="modal-actions">{(['read', 'reading', 'want'] as ShelfStatus[]).map(status => <button disabled={busy} key={status} className="secondary-btn" onClick={() => save(status)}>{shelfLabels[status]}</button>)}</div>
    {error && <p className="form-error">{error}</p>}
    <button className="secondary-btn" onClick={onClose}>Cancelar</button>
  </div></div>;
}
