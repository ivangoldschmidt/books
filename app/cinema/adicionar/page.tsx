'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clapperboard, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import type { MediaRecord, MediaType } from '@/lib/media-types';
export default function AddMediaManually(){
 const router=useRouter(),[title,setTitle]=useState(''),[kind,setKind]=useState<MediaType>('movie'),[year,setYear]=useState(''),[overview,setOverview]=useState(''),[director,setDirector]=useState(''),[cover,setCover]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function add(e:FormEvent){e.preventDefault();setError('');if(!title.trim())return setError('Informe o título.');
  setBusy(true);const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user){router.push('/login');return}
  // IDs manuais negativos não colidem com IDs positivos oficiais do TMDB.
  const id=-(Math.floor(Date.now()/1000)+Math.floor(Math.random()*999));
  const media:MediaRecord={id,mediaType:kind,title:title.trim(),originalTitle:title.trim(),overview:overview.trim(),year:year.trim(),releaseDate:year.trim(),director:kind==='movie'?director.trim():undefined,creators:kind==='tv'&&director.trim()?[director.trim()]:[],posterUrl:cover.trim()||null,genreIds:[]};
  const {error:saveError}=await supabase.from('media_library_items').insert({user_id:user.id,tmdb_id:id,media_type:kind,status:'want',media});
  if(saveError)setError(saveError.message);else router.push('/cinema/biblioteca');setBusy(false);
 }
 return <main className="container section cinema-page"><div className="eyebrow">Adicionar sem TMDB</div><h1>Adicionar filme ou série manualmente</h1><p className="lead">Use quando não encontrar um título no catálogo. Os detalhes poderão ser editados posteriormente pelo próprio cadastro.</p><form className="media-ai-form" onSubmit={add}>
 <label htmlFor="manual-kind">Tipo</label><select id="manual-kind" value={kind} onChange={e=>setKind(e.target.value as MediaType)}><option value="movie">Filme</option><option value="tv">Série</option></select>
 <label htmlFor="manual-title">Título *</label><input id="manual-title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={150} required/>
 <label htmlFor="manual-year">Ano de lançamento</label><input id="manual-year" inputMode="numeric" maxLength={4} value={year} onChange={e=>setYear(e.target.value)}/>
 <label htmlFor="manual-director">{kind==='movie'?'Direção':'Criação'}</label><input id="manual-director" value={director} onChange={e=>setDirector(e.target.value)}/>
 <label htmlFor="manual-overview">Sinopse</label><textarea id="manual-overview" rows={5} value={overview} onChange={e=>setOverview(e.target.value)}/>
 <label htmlFor="manual-cover">URL do pôster (opcional)</label><input id="manual-cover" type="url" value={cover} onChange={e=>setCover(e.target.value)}/>
 {error&&<div className="cinema-alert error">{error}</div>}
 <button className="cinema-button primary" disabled={busy}><Plus size={16}/>{busy?'Salvando…':'Adicionar à biblioteca'}</button></form></main>
}
