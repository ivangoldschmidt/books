'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Clapperboard, Inbox, Plus, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import type { MediaRecord, MediaShare } from '@/lib/media-types';

export default function SharedCinemaPage() {
  const [shares, setShares] = useState<MediaShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = '/login'; return; }
    const { data, error: queryError } = await supabase.from('media_shares').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false });
    if (queryError) setError(queryError.message.includes('media_shares') || queryError.message.includes('schema cache') ? 'Os compartilhamentos ainda não estão configurados. Execute supabase/cinema-schema.sql no Supabase.' : queryError.message);
    setShares((data || []) as MediaShare[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function addToLibrary(share: MediaShare) {
    setBusy(share.id); setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { location.href = '/login'; return; }
    const media = share.media as MediaRecord;
    const { error: addError } = await supabase.from('media_library_items').insert({ user_id: user.id, tmdb_id: media.id, media_type: media.mediaType, status: 'want', media });
    if (addError && addError.code !== '23505') {
      setError(addError.message);
    } else {
      await supabase.from('media_shares').update({ status: 'added' }).eq('id', share.id);
      setShares(old => old.map(x => x.id === share.id ? { ...x, status: 'added' } : x));
    }
    setBusy(null);
  }

  async function dismiss(share: MediaShare) {
    setBusy(share.id);
    const { error: updateError } = await createClient().from('media_shares').update({ status: 'dismissed' }).eq('id', share.id);
    if (updateError) setError(updateError.message);
    else setShares(old => old.map(x => x.id === share.id ? { ...x, status: 'dismissed' } : x));
    setBusy(null);
  }

  return <main className="container section cinema-page">
    <div className="cinema-page-heading"><div><div className="eyebrow">Descobertas a dois</div><h1>Compartilhados comigo</h1><p className="lead">Títulos que a outra conta enviou para você. Adicionar aqui cria sua própria entrada privada na biblioteca.</p></div><Link href="/cinema/pesquisar" className="cinema-button"><SearchIcon/> Pesquisar</Link></div>
    {error && <div className="cinema-alert error">{error}</div>}
    {loading ? <div className="empty">Carregando compartilhamentos…</div> : shares.length ? <div className="cinema-shares-list">{shares.map(share => {
      const media = share.media;
      return <article className={`cinema-share-card ${share.status !== 'pending' ? 'processed' : ''}`} key={share.id}>
        <div className="cinema-share-poster">{media.posterUrl ? <img src={media.posterUrl} alt={`Pôster de ${media.title}`} loading="lazy"/> : <Clapperboard size={30}/>}</div>
        <div className="cinema-share-info"><div className="cinema-card-kicker">{media.mediaType === 'tv' ? 'Série' : 'Filme'}{media.year ? ` · ${media.year}` : ''}</div><h3>{media.title}</h3><p>{share.message ? `“${share.message}”` : 'A outra conta compartilhou este título com você.'}</p><small>Recebido em {new Date(share.created_at).toLocaleDateString('pt-BR')}</small><div className="cinema-share-actions">{share.status === 'pending' ? <><button className="cinema-button primary" disabled={busy===share.id} onClick={()=>void addToLibrary(share)}>{busy===share.id?'Salvando…':<><Plus size={16}/> Adicionar à minha lista</>}</button><button className="cinema-button" disabled={busy===share.id} onClick={()=>void dismiss(share)}>Dispensar</button></> : <span className={`cinema-status ${share.status==='added'?'watched':'want'}`}>{share.status==='added'?<><Check size={14}/> Adicionado à biblioteca</>:'Compartilhamento descartado'}</span>}</div></div>
      </article>;
    })}</div> : <div className="empty cinema-empty"><Inbox size={36}/><h3>Você ainda não recebeu títulos</h3><p>Quando a outra conta te enviar um filme ou série, aparecerá aqui.</p><Link className="cinema-button primary" href="/cinema/pesquisar"><Send size={16}/> Explorar títulos</Link></div>}
  </main>;
}

function SearchIcon() { return <Clapperboard size={17}/>; }
