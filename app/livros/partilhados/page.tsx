'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, Check, Inbox, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import type { Book } from '@/lib/types';
import { bookKey } from '@/lib/utils';
type BookShare={id:string;recipient_id:string;book:Book;message:string;status:'pending'|'added'|'dismissed';created_at:string};
export default function BooksShared(){
 const [shares,setShares]=useState<BookShare[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState('');
 useEffect(()=>{void(async()=>{const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){location.href='/login';return}const {data,error}=await s.from('book_shares').select('*').eq('recipient_id',user.id).order('created_at',{ascending:false});if(error)setError(error.message);setShares((data||[]) as BookShare[]);setLoading(false)})()},[]);
 async function mark(share:BookShare,status:'added'|'dismissed'){
  setBusy(share.id);setError('');const s=createClient();
  if(status==='added'){
   const {data:{user}}=await s.auth.getUser();if(!user){location.href='/login';return}
   const {error:e}=await s.from('library_items').insert({user_id:user.id,book_key:bookKey(share.book),status:'want',read_count:0,is_favorite:false,rating:null,book:share.book});
   if(e&&e.code!=='23505'){setError(e.message);setBusy('');return}
  }
  const {error:e}=await s.from('book_shares').update({status}).eq('id',share.id);
  if(e)setError(e.message);else setShares(old=>old.map(x=>x.id===share.id?{...x,status}:x));setBusy('');
 }
 return <main className="container section cinema-page"><div className="eyebrow">Descobertas compartilhadas</div><h1>Livros recebidos</h1><p className="lead">Livros enviados pela outra conta. Seus comentários pessoais não são compartilhados.</p>
 {error&&<div className="cinema-alert error">{error}</div>}
 {loading?<div className="empty">Carregando livros recebidos…</div>:shares.length?<div className="cinema-shares-list">{shares.map(share=><article className="cinema-share-card" key={share.id}>
 <div className="cinema-share-poster">{share.book.coverUrl?<img src={share.book.coverUrl} alt={`Capa de ${share.book.title}`}/>:<BookOpen size={35}/>}</div>
 <div className="cinema-share-info"><div className="cinema-card-kicker">Livro · {share.book.publishedYear||'Ano não informado'}</div><h3>{share.book.title}</h3><p>{share.book.authors?.join(', ')}</p><p>{share.message?`“${share.message}”`:'Livro recomendado para você.'}</p><small>Recebido em {new Date(share.created_at).toLocaleDateString('pt-BR')}</small>
 <div className="cinema-share-actions">{share.status==='pending'?<><button className="cinema-button primary" disabled={busy===share.id} onClick={()=>void mark(share,'added')}><Plus size={16}/> Adicionar à estante</button><button className="cinema-button" disabled={busy===share.id} onClick={()=>void mark(share,'dismissed')}>Dispensar</button></>:<span className="cinema-status watched"><Check size={15}/> {share.status==='added'?'Adicionado à estante':'Dispensado'}</span>}</div></div></article>)}</div>:<div className="empty cinema-empty"><Inbox size={32}/><h3>Nenhum livro recebido</h3><p>Quando a outra conta compartilhar um livro, ele aparecerá aqui.</p><Link href="/buscar" className="cinema-button primary">Buscar livros</Link></div>}
 </main>
}
