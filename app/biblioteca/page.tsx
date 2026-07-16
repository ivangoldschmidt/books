'use client';

import { BookCard } from '@/components/BookCard';
import { StarRating } from '@/components/StarRating';
import { createClient } from '@/lib/supabase-browser';
import type { LibraryItem, ShelfStatus } from '@/lib/types';
import { normalize, shelfLabels } from '@/lib/utils';
import { CheckCircle2, Heart, Trash2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

type Group = 'none' | 'author' | 'genre' | 'country' | 'language' | 'year' | 'series' | 'publisher';
type SpecialFilter = 'all' | 'favorites';

const groupNames: Record<Group, string> = {
  none: 'Sem agrupamento',
  author: 'Autor',
  genre: 'Gênero',
  country: 'País do autor',
  language: 'Idioma',
  year: 'Ano de publicação',
  series: 'Série',
  publisher: 'Editora',
};

function Content() {
  const params = useSearchParams();
  const [filter, setFilter] = useState<ShelfStatus | 'all'>((params.get('status') as ShelfStatus) || 'all');
  const [specialFilter, setSpecialFilter] = useState<SpecialFilter>(params.get('view') === 'favorites' ? 'favorites' : 'all');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [group, setGroup] = useState<Group>((params.get('group') as Group) || 'none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      location.href = '/login';
      return;
    }

    const { data: itemData, error: itemError } = await supabase
      .from('library_items')
      .select('*')
      .order('updated_at', { ascending: false });

    if (itemError) setError(itemError.message || 'Não foi possível carregar a estante.');
    const rawItems = (itemData || []) as unknown as LibraryItem[];
    const deduped = Array.from(new Map(rawItems.map(entry => [entry.book_key, entry])).values());
    setItems(deduped);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function removeBook(item: LibraryItem) {
    if (!confirm(`Remover “${item.book.title}” da biblioteca?`)) return;
    const { error: deleteError } = await createClient().from('library_items').delete().eq('id', item.id);
    if (deleteError) setError(deleteError.message);
    else await load();
  }

  async function rate(item: LibraryItem, rating: number) {
    const { error: ratingError } = await createClient()
      .from('library_items')
      .update({ rating, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (ratingError) setError(ratingError.message);
    else setItems(current => current.map(entry => entry.id === item.id ? { ...entry, rating } : entry));
  }

  async function toggleFavorite(item: LibraryItem) {
    const next = !item.is_favorite;
    const { error: favoriteError } = await createClient()
      .from('library_items')
      .update({ is_favorite: next, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (favoriteError) setError(favoriteError.message);
    else setItems(current => current.map(entry => entry.id === item.id ? { ...entry, is_favorite: next } : entry));
  }

  async function finishReading(item: LibraryItem) {
    const now = new Date().toISOString();
    const nextCount = Math.max(0, item.read_count || 0) + 1;
    const { error: finishError } = await createClient().from('library_items').update({
      status: 'read', read_count: nextCount, finished_at: now, updated_at: now,
    }).eq('id', item.id);
    if (finishError) setError(finishError.message);
    else setItems(current => current.map(entry => entry.id === item.id ? { ...entry, status: 'read', read_count: nextCount, finished_at: now, updated_at: now } : entry));
  }

  const visible = useMemo(() => items.filter((item: any) => {
    const matchesShelf = filter === 'all' || item.status === filter;
    const matchesFavorite = specialFilter !== 'favorites' || item.is_favorite;
    return matchesShelf && matchesFavorite;
  }), [items, filter, specialFilter]);

  function groupKeys(item: LibraryItem) {
    const book = item.book;
    switch (group) {
      case 'author': return book.authors.length ? book.authors : ['Autor desconhecido'];
      case 'genre': return book.genres?.length ? book.genres : ['Não informado'];
      case 'country': return book.authorCountries?.length ? book.authorCountries : ['Não informado'];
      case 'language': return [normalize(book.language)];
      case 'year': return [normalize(book.publishedYear)];
      case 'series': return [normalize(book.series)];
      case 'publisher': return [normalize(book.publisher)];
      default: return ['Todos'];
    }
  }

  const grouped = useMemo(() => {
    const result = new Map<string, LibraryItem[]>();
    visible.forEach(item => groupKeys(item).forEach(key => result.set(key, [...(result.get(key) || []), item])));
    return [...result.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible, group]);

  const favoritesCount = items.filter(item => item.is_favorite).length;

  return (
    <main className="container section">
      <div className="section-head">
        <div>
          <div className="eyebrow">Sua coleção</div>
          <h1>Estante</h1>
        </div>
      </div>

      <div className="library-filters" aria-label="Filtros da biblioteca">
        <button className={`filter-pill ${specialFilter === 'all' ? 'active' : ''}`} onClick={() => setSpecialFilter('all')}>Todos ({items.length})</button>
        <button className={`filter-pill favorite-filter ${specialFilter === 'favorites' ? 'active' : ''}`} onClick={() => setSpecialFilter('favorites')}>
          <Heart size={17} fill={specialFilter === 'favorites' ? 'currentColor' : 'none'} /> Favoritos ({favoritesCount})
        </button>
      </div>

      <div className="controls">
        <select value={filter} onChange={event => setFilter(event.target.value as ShelfStatus | 'all')}>
          <option value="all">Todas as estantes</option>
          {Object.entries(shelfLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select value={group} onChange={event => setGroup(event.target.value as Group)}>
          {Object.entries(groupNames).map(([key, label]) => <option key={key} value={key}>Agrupar: {label}</option>)}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? <div className="empty">Carregando…</div> : visible.length ? grouped.map(([name, list]) => (
        <section className="book-group" key={name}>
          <h2>{group === 'none' ? 'Todos os livros' : `${name} (${list.length})`}</h2>
          <div className="grid">
            {list.map(item => (
              <div className="library-item" key={`${name}-${item.id}`}>
                <BookCard
                  book={item.book}
                  readCount={item.read_count}
                  showAddButton={false}
                  showFavoriteButton
                  favorite={item.is_favorite}
                  onToggleFavorite={() => toggleFavorite(item)}
                />
                <StarRating value={item.rating} onChange={rating => rate(item, rating)} />
                <div className="library-card-actions">
                  {item.status === 'reading' && <button className="finish-btn" onClick={() => finishReading(item)}><CheckCircle2 size={16} />Terminei de ler</button>}
                  <button className="danger-btn" onClick={() => removeBook(item)}><Trash2 size={16} />Remover</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )) : <div className="empty">Nenhum livro nesta seção.</div>}
    </main>
  );
}

export default function Page() {
  return <Suspense><Content /></Suspense>;
}
