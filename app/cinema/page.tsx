'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clapperboard, Film, Heart, Inbox, Search, Tv } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import type { MediaLibraryItem } from '@/lib/media-types';

export default function CinemaHome() {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [incoming, setIncoming] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { location.href = '/login'; return; }
      const [itemsResult, sharesResult] = await Promise.all([
        supabase.from('media_library_items').select('*').order('updated_at', { ascending: false }),
        supabase.from('media_shares').select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('status', 'pending'),
      ]);
      if (!active) return;
      if (itemsResult.error) setError(itemsResult.error.message);
      setItems((itemsResult.data || []) as MediaLibraryItem[]);
      setIncoming(sharesResult.count || 0);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const watched = items.filter(x => x.status === 'watched').length;
  const want = items.filter(x => x.status === 'want').length;
  const favorites = items.filter(x => x.is_favorite).length;
  const movies = items.filter(x => x.media_type === 'movie').length;
  const shows = items.filter(x => x.media_type === 'tv').length;

  return <main className="container section cinema-page">
    <section className="cinema-hero">
      <div className="cinema-hero-copy">
        <div className="eyebrow">Uma nova secção · A mesma conta</div>
        <h1>Filmes e séries.<br/><em>À tua maneira.</em></h1>
        <p>Descobre títulos, organiza o que queres ver, guarda as tuas opiniões em privado e partilha descobertas com a outra conta da casa.</p>
        <div className="cinema-hero-actions">
          <Link href="/cinema/pesquisar" className="cinema-button primary"><Search size={17}/> Pesquisar títulos</Link>
          <Link href="/cinema/biblioteca" className="cinema-button"><Clapperboard size={17}/> A minha coleção</Link>
        </div>
        <div className="cinema-private-note"><CheckCircle2 size={16}/> Os livros continuam na sua própria secção, sem misturar dados.</div>
      </div>
      <div className="cinema-hero-art" aria-hidden="true"><div className="cinema-orbit orbit-one"/><div className="cinema-orbit orbit-two"/><div className="cinema-film-icon"><Clapperboard size={70}/></div><span className="cinema-art-caption">YOUR PRIVATE WATCHLIST</span></div>
    </section>

    <section className="cinema-stat-grid" aria-label="Resumo da biblioteca de filmes e séries">
      <Link className="cinema-stat" href="/cinema/biblioteca?status=want"><span><Clapperboard size={18}/> Para assistir</span><strong>{loading ? '—' : want}</strong></Link>
      <Link className="cinema-stat" href="/cinema/biblioteca?status=watched"><span><CheckCircle2 size={18}/> Assistidos</span><strong>{loading ? '—' : watched}</strong></Link>
      <Link className="cinema-stat" href="/cinema/biblioteca?view=favorites"><span><Heart size={18}/> Favoritos</span><strong>{loading ? '—' : favorites}</strong></Link>
      <Link className="cinema-stat" href="/cinema/partilhados"><span><Inbox size={18}/> Partilhados</span><strong>{loading ? '—' : incoming}</strong></Link>
    </section>
    {error && <p className="form-error">{error}. Se as tabelas de cinema ainda não existem, execute `supabase/cinema-schema.sql` no Supabase.</p>}

    <section className="cinema-section-head"><div><div className="eyebrow">Separado dos livros</div><h2>O teu espaço de cinema</h2></div><Link className="cinema-text-link" href="/cinema/biblioteca">Abrir biblioteca <ArrowRight size={16}/></Link></section>
    <div className="cinema-feature-grid">
      <Link href="/cinema/pesquisar" className="cinema-feature-card"><div className="cinema-feature-icon"><Search size={23}/></div><div><h3>Encontrar algo para ver</h3><p>Pesquisa filmes e séries através do TMDB, com cartazes, sinopses e avaliações.</p><span>Pesquisar agora <ArrowRight size={15}/></span></div></Link>
      <Link href="/cinema/biblioteca" className="cinema-feature-card"><div className="cinema-feature-icon"><Film size={23}/></div><div><h3>Organizar a coleção</h3><p>Marca o que queres assistir, o que já viste e os títulos de que mais gostaste.</p><span>{movies} filmes · {shows} séries <ArrowRight size={15}/></span></div></Link>
      <Link href="/cinema/partilhados" className="cinema-feature-card"><div className="cinema-feature-icon"><Tv size={23}/></div><div><h3>Escolher em conjunto</h3><p>Envia um filme à outra conta com uma mensagem curta. As notas privadas não são partilhadas.</p><span>Ver partilhas <ArrowRight size={15}/></span></div></Link>
    </div>

    <section className="cinema-section-head"><div><div className="eyebrow">Adicionados recentemente</div><h2>A tua estante de cinema</h2></div></section>
    {loading ? <div className="empty">A carregar a coleção…</div> : items.length ? <div className="cinema-poster-strip">{items.slice(0, 7).map(item => <Link href="/cinema/biblioteca" key={item.id} className="cinema-mini-poster">{item.media?.posterUrl ? <img src={item.media.posterUrl} alt={`Cartaz de ${item.media.title}`} loading="lazy"/> : <span><Clapperboard size={24}/>{item.media?.title}</span>}<strong>{item.media?.title}</strong><small>{item.status === 'watched' ? 'Assistido' : 'Para assistir'}</small></Link>)}</div> : <div className="empty cinema-empty"><Clapperboard size={34}/><h3>A tua coleção de filmes começa aqui</h3><p>Pesquisa o primeiro título e adiciona-o à lista para assistir.</p><Link className="cinema-button primary" href="/cinema/pesquisar">Explorar filmes e séries</Link></div>}
  </main>;
}
