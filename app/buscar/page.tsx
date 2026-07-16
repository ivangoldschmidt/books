'use client';

import { BookPlus, Languages, Search } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Book } from '@/lib/types';
import { BookCard } from '@/components/BookCard';

const STORAGE_KEY = 'minha-estante:last-search';

type SavedSearch = {
  q: string;
  books: Book[];
  providers: { name: string; ok: boolean }[];
  queryUsed?: string;
  translated?: boolean;
};

function SearchContent() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<{ name: string; ok: boolean }[]>([]);
  const [queryUsed, setQueryUsed] = useState('');
  const [translated, setTranslated] = useState(false);
  const [error, setError] = useState('');

  function persist(next: SavedSearch) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  async function search(term: string) {
    if (!term.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(term)}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Não foi possível realizar a busca.');
      const next: SavedSearch = {
        q: term,
        books: json.books || [],
        providers: json.providers || [],
        queryUsed: json.queryUsed || term,
        translated: !!json.translated,
      };
      setBooks(next.books);
      setProviders(next.providers);
      setQueryUsed(next.queryUsed || term);
      setTranslated(!!next.translated);
      persist(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha na busca.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initial = params.get('q');
    if (initial) {
      void search(initial);
      return;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedSearch;
      setQ(saved.q || '');
      setBooks(saved.books || []);
      setProviders(saved.providers || []);
      setQueryUsed(saved.queryUsed || saved.q || '');
      setTranslated(!!saved.translated);
    } catch {}
    // Restore the exact previous result set when returning from a book page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await search(q);
  }

  return (
    <main className="container section">
      <div className="section-head">
        <div><div className="eyebrow">Descobrir</div><h2>Buscar livros</h2></div>
        <Link className="secondary-btn" href="/adicionar-manualmente"><BookPlus size={18}/>Adicionar manualmente</Link>
      </div>
      <form className="search-bar" onSubmit={submit}>
        <input value={q} onChange={event=>setQ(event.target.value)} placeholder="Título, autor ou ISBN…" autoFocus/>
        <button className="primary-btn"><Search size={18}/>{loading?'Buscando…':'Buscar'}</button>
      </form>
      {translated && queryUsed && <p className="translated-query"><Languages size={16}/>Busca internacional usada: <strong>{queryUsed}</strong></p>}
      {providers.length>0&&<p className="muted">Fontes: {providers.map(provider=>`${provider.name} ${provider.ok?'✓':'×'}`).join(' · ')}</p>}
      {error && <p className="form-error">{error}</p>}
      {books.length?<div className="grid">{books.map(book=><BookCard key={book.id} book={book}/>)}</div>:!loading&&<div className="empty">Pesquise por um livro para começar.</div>}
    </main>
  );
}

export default function SearchPage(){return <Suspense><SearchContent/></Suspense>}
