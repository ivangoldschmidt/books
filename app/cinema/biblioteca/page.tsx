'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Heart, Search } from 'lucide-react';
import { CinemaMediaCard } from '@/components/CinemaMediaCard';
import { createClient } from '@/lib/supabase-browser';
import type { MediaLibraryItem, MediaRecord, MediaStatus } from '@/lib/media-types';

type Filter = 'all' | MediaStatus | 'favorites';

export default function CinemaLibraryPage() {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = '/login'; return; }
    const { data, error: loadError } = await supabase.from('media_library_items').select('*').order('updated_at', { ascending: false });
    if (loadError) setError(loadError.message.includes('media_library_items') || loadError.message.includes('schema cache') ? 'A seção de cinema ainda não está configurada. Execute supabase/cinema-schema.sql no Supabase.' : loadError.message);
    setItems((data || []) as MediaLibraryItem[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'want' || status === 'watched') setFilter(status);
    if (params.get('view') === 'favorites') setFilter('favorites');
  }, []);

  async function patch(id: string, changes: Partial<MediaLibraryItem>) {
    setError('');
    const payload: Record<string, unknown> = { ...changes, updated_at: new Date().toISOString() };
    const { error: patchError } = await createClient().from('media_library_items').update(payload).eq('id', id);
    if (patchError) { setError(patchError.message); return; }
    setItems(old => old.map(item => item.id === id ? { ...item, ...changes, updated_at: new Date().toISOString() } : item));
  }

  async function remove(item: MediaLibraryItem) {
    if (!window.confirm(`Remover “${item.media.title}” da sua biblioteca?`)) return;
    const { error: removeError } = await createClient().from('media_library_items').delete().eq('id', item.id);
    if (removeError) setError(removeError.message);
    else setItems(old => old.filter(entry => entry.id !== item.id));
  }

  async function share(media: MediaRecord) {
    const email = window.prompt('E-mail da outra conta do site:');
    if (!email?.trim()) return;
    const message = window.prompt('Mensagem opcional para acompanhar o filme ou série:') || '';
    const { error: shareError } = await createClient().rpc('send_media_share', { recipient_email: email.trim(), media_snapshot: media, share_message: message });
    if (shareError) setError(shareError.message || 'Não foi possível compartilhar o título.');
    else window.alert(`“${media.title}” foi enviado para ${email.trim()}.`);
  }

  const visible = useMemo(() => items.filter(item => {
    const matchesStatus = filter === 'all' || (filter === 'favorites' ? item.is_favorite : item.status === filter);
    const matchesType = typeFilter === 'all' || item.media_type === typeFilter;
    const matchesQuery = !searchText.trim() || item.media?.title?.toLocaleLowerCase('pt-BR').includes(searchText.trim().toLocaleLowerCase('pt-BR'));
    return matchesStatus && matchesType && matchesQuery;
  }), [items, filter, typeFilter, searchText]);

  return <main className="container section cinema-page">
    <div className="cinema-page-heading"><div><div className="eyebrow">Biblioteca independente</div><h1>Minha coleção</h1><p className="lead">Os títulos, as avaliações e as notas desta seção são separados dos seus livros.</p></div><Link href="/cinema/pesquisar" className="cinema-button primary"><Search size={17}/> Encontrar títulos</Link></div>
    <div className="cinema-library-toolbar">
      <div className="cinema-filter-tabs" aria-label="Filtrar por estado">
        {([{id:'all',label:`Todos (${items.length})`},{id:'want',label:`Para assistir (${items.filter(x=>x.status==='want').length})`},{id:'watching',label:`Assistindo (${items.filter(x=>x.status==='watching').length})`},{id:'watched',label:`Assistidos (${items.filter(x=>x.status==='watched').length})`},{id:'favorites',label:`Favoritos (${items.filter(x=>x.is_favorite).length})`}] as {id:Filter;label:string}[]).map(tab => <button key={tab.id} className={filter===tab.id?'active':''} onClick={()=>setFilter(tab.id)}>{tab.id==='favorites'&&<Heart size={15}/>} {tab.label}</button>)}
      </div>
      <input className="cinema-local-search" value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="Filtrar a minha coleção…" aria-label="Filtrar a minha coleção"/>
      <select className="cinema-type-select" value={typeFilter} onChange={e=>setTypeFilter(e.target.value as 'all'|'movie'|'tv')} aria-label="Filtrar por tipo"><option value="all">Filmes e séries</option><option value="movie">Filmes</option><option value="tv">Séries</option></select>
    </div>
    {error && <div className="cinema-alert error">{error}</div>}
    {loading ? <div className="empty">Carregando a sua biblioteca…</div> : visible.length ? <div className="cinema-library-grid">{visible.map(item=><CinemaMediaCard key={item.id} item={item} onPatch={patch} onDelete={remove} onShare={share}/>)}</div> : <div className="empty cinema-empty"><Clapperboard size={34}/><h3>Nenhum título neste filtro</h3><p>Pesquisa o seu primeiro filme ou série, ou muda o filtro acima.</p><Link className="cinema-button primary" href="/cinema/pesquisar">Pesquisar títulos</Link></div>}
    <p className="cinema-attribution">Os comentários privados são salvos na sua conta e não são incluídos quando compartilha um título.</p>
  </main>;
}
