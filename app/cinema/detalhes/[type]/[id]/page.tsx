'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Clapperboard, Heart, RefreshCw, Send, Sparkles, Star, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import type { MediaLibraryItem, MediaRecord, MediaStatus } from '@/lib/media-types';

export default function MediaDetailsPage() {
  const params=useParams<{type:string;id:string}>();
  const [media,setMedia]=useState<MediaRecord|null>(null), [item,setItem]=useState<MediaLibraryItem|null>(null);
  const [userId,setUserId]=useState(''),[comment,setComment]=useState(''),[rating,setRating]=useState('');
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[aiBusy,setAiBusy]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState('');
  const type=params.type, id=params.id;
  const load=useCallback(async()=>{
    setLoading(true);setError('');const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href='/login';return}setUserId(user.id);
    const [detail,stored]=await Promise.all([
      (Number(id)<0?Promise.resolve(null):fetch(`/api/cinema/details/${type}/${id}`).then(async response=>{const j=await response.json();if(!response.ok)throw Error(j.error||'Erro ao carregar informações.');return j.media as MediaRecord}).catch(err=>{setError(err.message);return null})),
      supabase.from('media_library_items').select('*').eq('user_id',user.id).eq('tmdb_id',Number(id)).eq('media_type',type).maybeSingle(),
    ]);
    const saved=stored.data as MediaLibraryItem|null;
    if(stored.error)setError(stored.error.message);
    setItem(saved);setComment(saved?.private_comment||'');setRating(saved?.rating?String(saved.rating):'');
    setMedia(detail?{...detail,...(saved?.media?.aiEnriched?{aiOverview:saved.media.aiOverview,aiAnalysis:saved.media.aiAnalysis,aiEnriched:true}:{} )}:saved?.media||null);
    setLoading(false);
  },[id,type]);
  useEffect(()=>{void load()},[load]);
  async function store(changes:Record<string,unknown>,success:string){
    if(!media||!userId)return;
    setBusy(true);setError('');setNotice('');const supabase=createClient();
    const payload={media,updated_at:new Date().toISOString(),...changes};
    const result=item?await supabase.from('media_library_items').update(payload).eq('id',item.id).select('*').single():await supabase.from('media_library_items').insert({user_id:userId,tmdb_id:media.id,media_type:media.mediaType,status:'want',...payload}).select('*').single();
    if(result.error)setError(result.error.message);else {setItem(result.data as MediaLibraryItem);setNotice(success)}setBusy(false);
  }
  async function share(){if(!media)return;const email=window.prompt('E-mail da outra conta do site:');if(!email?.trim())return;const message=window.prompt('Mensagem opcional:')||'';setBusy(true);setError('');const {error:e}=await createClient().rpc('send_media_share',{recipient_email:email.trim(),media_snapshot:{id:media.id,mediaType:media.mediaType,title:media.title,overview:media.overview,posterUrl:media.posterUrl,year:media.year},share_message:message});if(e)setError(e.message);else setNotice('Título compartilhado com sucesso.');setBusy(false)}
  async function enrich(){if(!media)return;setAiBusy(true);setError('');setNotice('');try{const r=await fetch('/api/cinema/enrich',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({media})});const j=await r.json();if(!r.ok)throw Error(j.error||'Não foi possível usar a IA.');const updated=j.media as MediaRecord;setMedia(updated);if(item){const {error:e}=await createClient().from('media_library_items').update({media:updated,updated_at:new Date().toISOString()}).eq('id',item.id);if(e)throw Error(e.message);setItem({...item,media:updated})}setNotice('Análise em português do Brasil concluída.');}catch(e){setError(e instanceof Error?e.message:'Erro ao consultar IA.')}finally{setAiBusy(false)}}
  async function remove(){if(!item||!confirm('Remover este título da sua biblioteca?'))return;setBusy(true);const {error:e}=await createClient().from('media_library_items').delete().eq('id',item.id);if(e)setError(e.message);else {setItem(null);setNotice('Título removido da sua biblioteca.')}setBusy(false)}
  if(loading)return <main className="container section cinema-page"><div className="empty">Carregando informações…</div></main>;
  if(!media)return <main className="container section cinema-page"><p className="cinema-alert error">{error||'Título não encontrado.'}</p><Link href="/cinema/pesquisar" className="cinema-button">Voltar para a busca</Link></main>;
  const text=media.aiOverview||media.overview||'Não há uma sinopse disponível para este título.';
  return <main className="container section cinema-page media-detail-page">
    <Link href="/cinema/pesquisar" className="cinema-text-link"><ArrowLeft size={17}/> Voltar para a busca</Link>
    <section className="media-detail-layout">
      <div className="media-detail-poster">{media.posterUrl?<img src={media.posterUrl} alt={`Pôster de ${media.title}`}/>:<div className="cinema-poster-fallback"><Clapperboard size={54}/></div>}
        <button className={`cinema-button full ${item?.is_favorite?'primary':''}`} disabled={busy} onClick={()=>void store({is_favorite:!item?.is_favorite},item?.is_favorite?'Removido dos favoritos.':'Adicionado aos favoritos.')}><Heart size={17} fill={item?.is_favorite?'currentColor':'none'}/> {item?.is_favorite?'Favorito':'Favoritar'}</button>
      </div>
      <div className="media-detail-content">
        <div className="eyebrow">{media.mediaType==='tv'?'Série':'Filme'} {media.year?`· ${media.year}`:''}</div><h1>{media.title}</h1>
        {media.originalTitle&&media.originalTitle!==media.title&&<p className="muted">Título original: {media.originalTitle}</p>}
        <div className="media-chips">{media.genres?.map(g=><span key={g}>{g}</span>)}{media.voteAverage!=null&&media.voteAverage>0&&<span><Star size={13}/> {media.voteAverage.toFixed(1)} TMDB</span>}</div>
        <h2>Sinopse</h2><p className="cinema-overview media-synopsis">{text}</p>
        {media.aiAnalysis&&<section className="media-ai-insight"><h3><Sparkles size={17}/> Análise com IA · Sem spoilers</h3><p>{media.aiAnalysis}</p><small>Interpretação gerada por IA a partir dos metadados. Verifique dados importantes na fonte.</small></section>}
        <button className="cinema-button" onClick={()=>void enrich()} disabled={aiBusy}><RefreshCw size={16} className={aiBusy?'spin':''}/>{aiBusy?'Analisando…':media.aiEnriched?'Analisar novamente com IA':'Traduzir e analisar com IA'}</button>
        <div className="media-facts">
          <div><span>{media.mediaType==='movie'?'Direção':'Criado por'}</span><strong>{media.mediaType==='movie'?media.director||'Não informado':media.creators?.join(', ')||'Não informado'}</strong></div>
          <div><span>Elenco principal</span><strong>{media.cast?.slice(0,6).join(', ')||'Não informado'}</strong></div>
          <div><span>Data de lançamento</span><strong>{media.releaseDate||'Não informado'}</strong></div>
          <div><span>{media.mediaType==='tv'?'Duração por episódio':'Duração'}</span><strong>{media.runtime?`${media.runtime} min`:'Não informada'}</strong></div>
          {media.mediaType==='tv'&&<><div><span>Temporadas</span><strong>{media.seasons??'Não informado'}</strong></div><div><span>Episódios</span><strong>{media.episodes??'Não informado'}</strong></div></>}
          <div><span>Idioma original</span><strong>{media.originalLanguage||'Não informado'}</strong></div>
        </div>
        <div className="media-detail-actions"><button className="cinema-button primary" disabled={busy} onClick={()=>void store({status:'want'},'Adicionado à lista Para assistir.')}>Quero assistir</button><button className="cinema-button" disabled={busy} onClick={()=>void store({status:'watching'},'Marcado como Assistindo.')}>Estou assistindo</button><button className="cinema-button" disabled={busy} onClick={()=>void store({status:'watched',watched_at:new Date().toISOString()},'Marcado como assistido.')}>Já assisti</button><button className="cinema-button" disabled={busy} onClick={()=>void share()}><Send size={16}/> Compartilhar</button></div>
        <div className="media-private-editor"><h2>Seu diário privado</h2><p>Somente você pode ler suas notas. Compartilhar um título não envia seus comentários.</p>
          <div className="cinema-rating-row"><label htmlFor="media-rating">Sua avaliação</label><select id="media-rating" value={rating} onChange={e=>setRating(e.target.value)}><option value="">Sem nota</option>{Array.from({length:10},(_,i)=>i+1).map(x=><option key={x} value={x}>{x}/10</option>)}</select></div>
          <label htmlFor="media-note">Comentário privado</label><textarea id="media-note" rows={5} maxLength={3000} value={comment} onChange={e=>setComment(e.target.value)} placeholder="O que você achou?"/>
          <button className="cinema-button primary" disabled={busy} onClick={()=>void store({rating:rating?Number(rating):null,private_comment:comment},'Avaliação e comentário salvos.') }><Check size={16}/> Salvar avaliação e comentário</button>
        </div>
        {item&&<button className="cinema-button" disabled={busy} onClick={()=>void remove()}><Trash2 size={16}/> Remover da biblioteca</button>}
        {error&&<div className="cinema-alert error">{error}</div>}{notice&&<div className="cinema-alert success">{notice}</div>}
      </div>
    </section>
    <p className="cinema-attribution">Metadados fornecidos pelo TMDB. Este produto usa a API do TMDB, mas não é aprovado nem certificado pelo TMDB.</p>
  </main>
}
