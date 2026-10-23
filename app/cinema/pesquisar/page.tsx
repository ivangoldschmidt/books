'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Check, Clapperboard, LoaderCircle, Plus, Search, Send, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import type { MediaRecord } from '@/lib/media-types';

type Kind = 'multi' | 'movie' | 'tv';

function SearchCinemaPageInner() {
  const searchParams=useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q')||'');
  const [kind, setKind] = useState<Kind>('multi');
  const [results, setResults] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState<number | null>(null);
  const [sharing, setSharing] = useState<number | null>(null);
  const [userId, setUserId] = useState('');
  const [existing, setExisting] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { location.href = '/login'; return; }
      setUserId(user.id);
      const { data } = await supabase.from('media_library_items').select('tmdb_id,media_type');
      if (data) setExisting(new Set(data.map(x => `${x.media_type}:${x.tmdb_id}`)));
    })();
  }, []);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) { setError('Digite pelo menos dois caracteres.'); return; }
    setLoading(true); setError(''); setNotice(''); setResults([]);
    try {
      const response = await fetch(`/api/cinema/search?q=${encodeURIComponent(query.trim())}&type=${kind}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'A pesquisa falhou.');
      setResults(payload.results || []);
      if (!payload.results?.length) setNotice('Não encontramos títulos com essa pesquisa. Experimente outro nome.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível pesquisar.');
    } finally { setLoading(false); }
  }

  useEffect(()=>{const initial=searchParams.get('q');if(!initial?.trim())return;void (async()=>{setLoading(true);try{const r=await fetch(`/api/cinema/search?q=${encodeURIComponent(initial)}&type=multi`);const j=await r.json();if(r.ok)setResults(j.results||[]);else setError(j.error||'Erro de pesquisa.')}catch{setError('Erro de pesquisa.')}finally{setLoading(false)}})()},[searchParams]);

  async function addToLibrary(media: MediaRecord) {
    setAdding(media.id); setError(''); setNotice('');
    const supabase = createClient();
    const { error: saveError } = await supabase.from('media_library_items').insert({
      user_id: userId, tmdb_id: media.id, media_type: media.mediaType, status: 'want', media,
    });
    if (saveError?.code === '23505') {
      setExisting(old => new Set(old).add(`${media.mediaType}:${media.id}`));
      setNotice(`“${media.title}” já está na sua biblioteca.`);
    } else if (saveError) {
      setError(saveError.message.includes('media_library_items') || saveError.message.includes('schema cache')
        ? 'A base de dados de filmes ainda não está preparada. Execute supabase/cinema-schema.sql no Supabase.'
        : `Não foi possível adicionar o título: ${saveError.message}`);
    } else {
      setExisting(old => new Set(old).add(`${media.mediaType}:${media.id}`));
      setNotice(`“${media.title}” foi adicionado à lista Para assistir.`);
    }
    setAdding(null);
  }

  async function share(media: MediaRecord) {
    const email = window.prompt('E-mail da outra conta do site:');
    if (!email?.trim()) return;
    const message = window.prompt('Mensagem opcional para acompanhar o filme ou série:') || '';
    setSharing(media.id); setError(''); setNotice('');
    const { error: shareError } = await createClient().rpc('send_media_share', {
      recipient_email: email.trim(), media_snapshot: media, share_message: message,
    });
    if (shareError) setError(shareError.message || 'Não foi possível compartilhar o título.');
    else setNotice(`“${media.title}” foi enviado para ${email.trim()}.`);
    setSharing(null);
  }

  return <main className="container section cinema-page">
    <div className="cinema-page-heading"><div><div className="eyebrow">Descoberta</div><h1>Pesquisar filmes e séries</h1><p className="lead">Os resultados vêm do TMDB. Sua biblioteca pessoal continua privada.</p></div></div>
    <form className="cinema-search-form" onSubmit={search}>
      <div className="cinema-search-input"><Search size={20}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar por título…" aria-label="Título do filme ou série" autoFocus/></div>
      <select value={kind} onChange={e => setKind(e.target.value as Kind)} aria-label="Tipo de título"><option value="multi">Filmes e séries</option><option value="movie">Só filmes</option><option value="tv">Só séries</option></select>
      <button className="cinema-button primary" type="submit" disabled={loading}>{loading ? <LoaderCircle size={17} className="spin"/> : <Search size={17}/>} Pesquisar</button>
    </form>
    {error && <div className="cinema-alert error">{error}</div>}
    {notice && <div className="cinema-alert success">{notice}</div>}
    {loading && <div className="empty"><LoaderCircle className="spin" size={26}/>Pesquisando no catálogo…</div>}
    {!loading && results.length > 0 && <><div className="cinema-results-head"><strong>{results.length} resultados</strong><span>Selecione um título para salvar na sua coleção</span></div><div className="cinema-search-results">{results.map(media => {
      const inLibrary = existing.has(`${media.mediaType}:${media.id}`);
      return <article className="cinema-result-card" key={`${media.mediaType}:${media.id}`}>
        <div className="cinema-result-poster">{media.posterUrl ? <img src={media.posterUrl} alt={`Pôster de ${media.title}`} loading="lazy"/> : <div className="cinema-poster-fallback"><Clapperboard size={30}/></div>}</div>
        <div className="cinema-result-info"><div className="cinema-card-kicker">{media.mediaType === 'tv' ? 'Série' : 'Filme'}{media.year ? ` · ${media.year}` : ''}</div><h3>{media.title}</h3>{media.originalTitle && media.originalTitle !== media.title && <p className="cinema-original-title">{media.originalTitle}</p>}{typeof media.voteAverage === 'number' && media.voteAverage > 0 && <div className="cinema-score"><Star size={15} fill="currentColor"/>{media.voteAverage.toFixed(1)} <span>no TMDB</span></div>}<p className="cinema-overview">{media.overview || 'Ainda não há sinopse disponível em português.'}</p>
          <div className="cinema-result-actions"><Link className="cinema-button" href={`/cinema/detalhes/${media.mediaType}/${media.id}`}>Ver detalhes</Link><button className="cinema-button primary" onClick={() => void addToLibrary(media)} disabled={adding === media.id || inLibrary}>{inLibrary ? <><Check size={16}/> Na sua biblioteca</> : adding === media.id ? 'Salvando…' : <><Plus size={16}/> Quero assistir</>}</button><button className="cinema-button" onClick={() => void share(media)} disabled={sharing === media.id}>{sharing === media.id ? 'Enviando…' : <><Send size={16}/> Compartilhar</>}</button></div>
        </div>
      </article>;
    })}</div></>}
    {!loading && !results.length && !error && <div className="empty cinema-empty"><Clapperboard size={34}/><h3>O que vamos assistir?</h3><p>Pesquise filmes ou séries. Você pode salvar títulos na sua lista ou enviá-los à outra conta.</p></div>}
    <p><Link className="cinema-text-link" href="/cinema/adicionar">Não encontrou seu título? Adicionar manualmente</Link></p>
    <p className="cinema-attribution">Informação de filmes e séries fornecida pelo TMDB. Este produto utiliza a API do TMDB, mas não é aprovado nem certificado pelo TMDB.</p>
  </main>;
}

export default function SearchCinemaPage(){return <Suspense fallback={<main className="container section">Carregando busca…</main>}><SearchCinemaPageInner/></Suspense>}
