'use client';

import { createClient } from '@/lib/supabase-browser';
import type { Book, ShelfStatus } from '@/lib/types';
import { bookKey, shelfLabels } from '@/lib/utils';
import { BookPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';

export default function ManualBookPage() {
  const [form, setForm] = useState({ title: '', authors: '', description: '', coverUrl: '', publishedYear: '', language: '', isbn: '', genres: '', country: '', publisher: '', series: '' });
  const [status, setStatus] = useState<ShelfStatus>('want');
  const [readCount, setReadCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function update(key: keyof typeof form, value: string) { setForm(current => ({ ...current, [key]: value })); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = '/login'; return; }
    const sourceId = crypto.randomUUID();
    const book: Book = {
      id: `manual:${sourceId}`,
      source: 'manual',
      sourceId,
      title: form.title.trim(),
      authors: form.authors.split(',').map(value => value.trim()).filter(Boolean),
      description: form.description.trim() || 'Descrição não disponível.',
      coverUrl: form.coverUrl.trim() || undefined,
      publishedYear: form.publishedYear.trim() || undefined,
      language: form.language.trim() || undefined,
      isbn: form.isbn.trim() || undefined,
      genres: form.genres.split(',').map(value => value.trim()).filter(Boolean),
      authorCountries: form.country.split(',').map(value => value.trim()).filter(Boolean),
      publisher: form.publisher.trim() || undefined,
      series: form.series.trim() || undefined,
    };
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('library_items').insert({
      user_id: user.id,
      book_key: bookKey(book),
      status,
      read_count: Math.max(0, readCount),
      book,
      finished_at: status === 'read' ? now : null,
      updated_at: now,
    });
    if (insertError) setError(insertError.code === '23505' ? 'Este livro já existe na sua biblioteca.' : insertError.message);
    else { setMessage('Livro adicionado com sucesso.'); setForm({ title: '', authors: '', description: '', coverUrl: '', publishedYear: '', language: '', isbn: '', genres: '', country: '', publisher: '', series: '' }); }
    setBusy(false);
  }

  return <main className="container section manual-page">
    <div className="eyebrow">Cadastro próprio</div><h1>Adicionar livro manualmente</h1>
    <p className="lead">Use esta opção quando o título não existir nas fontes de pesquisa.</p>
    <form className="manual-form" onSubmit={submit}>
      <label>Título obrigatório<input required value={form.title} onChange={event => update('title', event.target.value)} /></label>
      <label>Autor(es)<input value={form.authors} onChange={event => update('authors', event.target.value)} placeholder="Separe vários autores por vírgula" /></label>
      <label className="wide">Descrição<textarea rows={5} value={form.description} onChange={event => update('description', event.target.value)} /></label>
      <label className="wide">URL da capa<input type="url" value={form.coverUrl} onChange={event => update('coverUrl', event.target.value)} placeholder="https://…" /></label>
      <label>Ano<input value={form.publishedYear} onChange={event => update('publishedYear', event.target.value)} /></label>
      <label>Idioma<input value={form.language} onChange={event => update('language', event.target.value)} /></label>
      <label>ISBN<input value={form.isbn} onChange={event => update('isbn', event.target.value)} /></label>
      <label>Editora<input value={form.publisher} onChange={event => update('publisher', event.target.value)} /></label>
      <label>Gênero(s)<input value={form.genres} onChange={event => update('genres', event.target.value)} placeholder="Separe por vírgula" /></label>
      <label>País(es) do autor<input value={form.country} onChange={event => update('country', event.target.value)} placeholder="Separe por vírgula" /></label>
      <label>Série<input value={form.series} onChange={event => update('series', event.target.value)} /></label>
      <label>Adicionar em<select value={status} onChange={event => setStatus(event.target.value as ShelfStatus)}>{Object.entries(shelfLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      {status === 'read' && <label>Quantas vezes foi lido?<input type="number" min="0" value={readCount} onChange={event => setReadCount(Math.max(0, Number(event.target.value) || 0))} /></label>}
      <div className="wide"><button className="primary-btn" disabled={busy}><BookPlus size={18} />{busy ? 'Adicionando…' : 'Adicionar à estante'}</button></div>
    </form>
    {message && <p className="success-message">{message}</p>}{error && <p className="form-error">{error}</p>}
  </main>;
}
