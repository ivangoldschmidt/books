'use client';

import { createClient } from '@/lib/supabase-browser';
import type { Book, LibraryItem, ShelfStatus } from '@/lib/types';
import { bookKey, shelfLabels } from '@/lib/utils';
import { ArrowLeft, Check, Heart, Languages, Pencil, RefreshCw, Save, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

const SEARCH_STORAGE_KEY = 'minha-estante:last-search';

function useful(value?: string) {
  const text = String(value || '').trim().toLowerCase();
  return !!text && !text.includes('descrição não disponível') && !text.includes('abra o livro') && !text.includes('open the book');
}

function join(values?: string[]) {
  return values?.filter(Boolean).join(', ') || 'Não informado';
}

export default function BookDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [readCount, setReadCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [editable, setEditable] = useState<Book | null>(null);
  const started = useRef(false);

  const book = useMemo(() => {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(params.get('data') || '')))) as Book;
    } catch {
      return null;
    }
  }, [params]);

  function updateSavedSearch(next: Book) {
    try {
      const raw = sessionStorage.getItem(SEARCH_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      saved.books = (saved.books || []).map((candidate: Book) =>
        candidate.id === next.id || (candidate.source === next.source && candidate.sourceId === next.sourceId)
          ? next
          : candidate,
      );
      sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(saved));
    } catch {}
  }

  async function enrich(currentBook: Book, currentItem?: LibraryItem | null, automatic = false) {
    if (currentBook.aiEnriched && currentBook.translatedToPortuguese) return;
    setAiBusy(true);
    setError('');
    if (!automatic) setMessage('');
    try {
      const response = await fetch('/api/books/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: currentBook }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Não foi possível traduzir e completar o livro.');
      const next = json.book as Book;
      setEditable(next);
      updateSavedSearch(next);

      if (currentItem) {
        const now = new Date().toISOString();
        const { error: saveError } = await createClient()
          .from('library_items')
          .update({ book: next, updated_at: now })
          .eq('id', currentItem.id);
        if (saveError) throw saveError;
        const updated = { ...currentItem, book: next, updated_at: now };
        setItem(updated);
      }
      setMessage(currentItem ? 'Informações traduzidas, completadas e salvas na Estante.' : 'Informações traduzidas e completadas.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao processar o livro.');
    } finally {
      setAiBusy(false);
    }
  }

  useEffect(() => {
    if (!book || started.current) return;
    started.current = true;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      let currentBook = book;
      let currentItem: LibraryItem | null = null;
      if (user) {
        const { data } = await supabase
          .from('library_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('book_key', bookKey(book))
          .maybeSingle();
        if (data) {
          currentItem = data as LibraryItem;
          currentBook = currentItem.book;
          setItem(currentItem);
          setReadCount(currentItem.read_count || 0);
        }
      }
      setEditable(currentBook);
      if (!currentBook.aiEnriched || !currentBook.translatedToPortuguese || !useful(currentBook.description)) {
        await enrich(currentBook, currentItem, true);
      }
    })();
  }, [book]);

  if (!book || !editable) {
    return <main className="container section"><div className="empty">Carregando informações do livro…</div></main>;
  }

  async function save(status: ShelfStatus) {
    const currentBook = editable as Book;
    setBusy(true);
    setError('');
    setMessage('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = '/login'; return; }
    const now = new Date().toISOString();
    let data: unknown = null;
    let saveError: { message: string } | null = null;
    if (item) {
      const result = await supabase.from('library_items').update({
        status,
        book: currentBook,
        updated_at: now,
        finished_at: status === 'read' ? (item.finished_at || now) : item.finished_at,
      }).eq('id', item.id).select('*').single();
      data = result.data; saveError = result.error;
    } else {
      const result = await supabase.from('library_items').insert({
        user_id: user.id,
        book_key: bookKey(currentBook),
        status,
        read_count: 0,
        is_favorite: false,
        rating: null,
        book: currentBook,
        updated_at: now,
        finished_at: status === 'read' ? now : null,
      }).select('*').single();
      data = result.data; saveError = result.error;
    }
    if (saveError) setError(saveError.message);
    else {
      const saved = data as LibraryItem;
      setItem(saved);
      setReadCount(saved.read_count || 0);
      setMessage(`Livro salvo em “${shelfLabels[status]}”.`);
    }
    setBusy(false);
  }

  async function confirmCount() {
    if (!item) { setError('Adicione o livro à Estante antes de salvar o número de leituras.'); return; }
    const count = Math.max(0, Number(readCount) || 0);
    const { error: updateError } = await createClient().from('library_items').update({ read_count: count, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (updateError) setError(updateError.message);
    else { setItem({ ...item, read_count: count }); setMessage('Número de leituras atualizado.'); }
  }

  async function toggleFavorite() {
    if (!item) { setError('Adicione o livro à Estante antes de favoritar.'); return; }
    const next = !item.is_favorite;
    const { error: updateError } = await createClient().from('library_items').update({ is_favorite: next, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (updateError) setError(updateError.message); else setItem({ ...item, is_favorite: next });
  }

  async function saveMetadata() {
    if (!item) { setError('Adicione o livro à Estante antes de editar os dados.'); return; }
    const currentBook = editable as Book;
    const { error: updateError } = await createClient().from('library_items').update({ book: currentBook, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (updateError) setError(updateError.message);
    else { setItem({ ...item, book: currentBook }); updateSavedSearch(currentBook); setEditing(false); setMessage('Informações do livro atualizadas.'); }
  }

  const set = (key: keyof Book, value: unknown) => setEditable(current => current ? { ...current, [key]: value } : current);
  const list = (value: string) => value.split(',').map(x => x.trim()).filter(Boolean);
  const title = showOriginal ? (editable.originalTitle || editable.title) : editable.title;
  const description = showOriginal ? (editable.originalDescription || editable.description) : editable.description;
  const genres = showOriginal ? (editable.originalGenres || editable.genres) : editable.genres;
  const countries = showOriginal ? (editable.originalAuthorCountries || editable.authorCountries) : editable.authorCountries;
  const publisher = showOriginal ? (editable.originalPublisher || editable.publisher) : editable.publisher;
  const series = showOriginal ? (editable.originalSeries || editable.series) : editable.series;
  const language = showOriginal ? (editable.originalLanguage || editable.language) : editable.language;

  return <main className="container">
    <button type="button" className="back-to-search" onClick={() => router.back()}><ArrowLeft size={18}/>Voltar aos resultados</button>
    <section className="detail">
      <div>
        {editable.coverUrl ? <img className="detail-cover" src={editable.coverUrl} alt={`Capa de ${title}`}/> : <div className="cover-wrap detail-placeholder"><div className="cover-placeholder">{title}</div></div>}
        <div className="read-count-box">
          <label htmlFor="read-count">Quantas vezes você leu?</label>
          <div className="read-count-row"><input id="read-count" type="number" min="0" step="1" value={readCount} onChange={e => setReadCount(Math.max(0, Number(e.target.value) || 0))}/><button className="confirm-count-btn" onClick={confirmCount} disabled={!item}><Check size={17}/>Confirmar</button></div>
          <small>O valor será exibido na capa a partir da segunda leitura.</small>
        </div>
      </div>
      <div>
        <div className="detail-topline"><div className="eyebrow">{editable.source}</div>{editable.translatedToPortuguese && <button className="language-toggle" onClick={() => setShowOriginal(value => !value)}><Languages size={17}/>{showOriginal ? 'Mostrar em português' : 'Mostrar no idioma original'}</button>}</div>
        <h1>{title}</h1>
        <p className="muted"><strong>{editable.authors.join(', ') || 'Autor desconhecido'}</strong>{editable.publishedYear ? ` · ${editable.publishedYear}` : ''}</p>
        {!showOriginal && editable.originalTitle && editable.originalTitle !== editable.title && <p className="original-title">Título original: {editable.originalTitle}</p>}
        <p className="book-description">{aiBusy && !useful(description) ? 'A IA está preparando uma descrição completa em português…' : description}</p>
        <button className="ai-enrich-btn" onClick={() => enrich(editable, item)} disabled={aiBusy}><RefreshCw size={18} className={aiBusy ? 'spin' : ''}/>{aiBusy ? 'Analisando, traduzindo e completando…' : 'Analisar novamente com IA'}<Sparkles size={16}/></button>
        {editable.translatedToPortuguese && <p className="ai-note">Os dados em português foram traduzidos e completados pela IA. Você pode alternar para os dados originais.</p>}

        <section className="book-facts">
          <div><span>Autores</span><strong>{join(editable.authors)}</strong></div>
          <div><span>Ano de publicação</span><strong>{editable.publishedYear || 'Não informado'}</strong></div>
          <div><span>Idioma</span><strong>{language || 'Não informado'}</strong></div>
          <div><span>ISBN</span><strong>{editable.isbn || 'Não informado'}</strong></div>
          <div><span>Editora</span><strong>{publisher || 'Não informado'}</strong></div>
          <div><span>Série</span><strong>{series || 'Não informado'}</strong></div>
          <div><span>Gêneros</span><strong>{join(genres)}</strong></div>
          <div><span>País do autor</span><strong>{join(countries)}</strong></div>
          <div><span>Fonte</span><strong>{editable.source}</strong></div>
        </section>

        <div className="detail-shelf-actions">{(['read', 'reading', 'want'] as ShelfStatus[]).map(status => <button disabled={busy} key={status} className={item?.status === status ? 'primary-btn' : 'secondary-btn'} onClick={() => save(status)}>{shelfLabels[status]}</button>)}</div>
        <button className={`favorite-detail-btn ${item?.is_favorite ? 'active' : ''}`} onClick={toggleFavorite}><Heart size={19} fill={item?.is_favorite ? 'currentColor' : 'none'}/>{item?.is_favorite ? 'Favorito' : 'Adicionar aos favoritos'}</button>
        <button className="metadata-toggle" onClick={() => setEditing(!editing)}><Pencil size={17}/>{editing ? 'Fechar edição' : 'Completar informações'}</button>

        {editing && <section className="metadata-editor"><h2>Informações do livro</h2><p>Complete ou corrija dados que não vieram das APIs.</p><div className="metadata-grid">
          <label>Título<input value={editable.title} onChange={e => set('title', e.target.value)}/></label>
          <label>Autores<input value={editable.authors.join(', ')} onChange={e => set('authors', list(e.target.value))}/></label>
          <label>Ano<input value={editable.publishedYear || ''} onChange={e => set('publishedYear', e.target.value)}/></label>
          <label>Idioma<input value={editable.language || ''} onChange={e => set('language', e.target.value)}/></label>
          <label>País do autor<input value={(editable.authorCountries || []).join(', ')} onChange={e => set('authorCountries', list(e.target.value))}/></label>
          <label>Editora<input value={editable.publisher || ''} onChange={e => set('publisher', e.target.value)}/></label>
          <label>Gêneros<input value={(editable.genres || []).join(', ')} onChange={e => set('genres', list(e.target.value))}/></label>
          <label>Série<input value={editable.series || ''} onChange={e => set('series', e.target.value)}/></label>
          <label>ISBN<input value={editable.isbn || ''} onChange={e => set('isbn', e.target.value)}/></label>
          <label>URL da capa<input value={editable.coverUrl || ''} onChange={e => set('coverUrl', e.target.value)}/></label>
          <label className="wide">Descrição<textarea rows={6} value={editable.description || ''} onChange={e => set('description', e.target.value)}/></label>
        </div><button className="primary-btn" onClick={saveMetadata}><Save size={17}/>Salvar informações</button></section>}
        {message && <p className="success-message">{message}</p>}
        {error && <p className="form-error">{error}</p>}
      </div>
    </section>
  </main>;
}
