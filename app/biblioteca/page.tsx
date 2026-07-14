'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { LibraryItem, ShelfStatus } from '@/lib/types';
import { shelfLabels } from '@/lib/utils';
import { BookCard } from '@/components/BookCard';

export default function LibraryPage(){const params=useSearchParams();const initial=(params.get('status') as ShelfStatus)||'all';const[filter,setFilter]=useState<ShelfStatus|'all'>(initial);const[items,setItems]=useState<LibraryItem[]>([]);const[loading,setLoading]=useState(true);
 async function load(){const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){location.href='/login';return;}const {data}=await s.from('library_items').select('*').order('updated_at',{ascending:false});setItems((data||[]) as LibraryItem[]);setLoading(false)} useEffect(()=>{load()},[]);
 const visible=filter==='all'?items:items.filter(i=>i.status===filter);
 async function increment(item:LibraryItem){const s=createClient();await s.from('library_items').update({read_count:item.read_count+1,status:'read',updated_at:new Date().toISOString()}).eq('id',item.id);load()}
 return <main className="container section"><div className="section-head"><div><div className="eyebrow">Sua coleção</div><h2>Biblioteca</h2></div></div><div className="tabs"><button onClick={()=>setFilter('all')} className={`tab ${filter==='all'?'active':''}`}>Todos ({items.length})</button>{(['read','reading','want'] as ShelfStatus[]).map(s=><button key={s} onClick={()=>setFilter(s)} className={`tab ${filter===s?'active':''}`}>{shelfLabels[s]} ({items.filter(i=>i.status===s).length})</button>)}</div>
 {loading?<div className="empty">Carregando…</div>:visible.length?<div className="grid" style={{marginTop:24}}>{visible.map(i=><div key={i.id}><BookCard book={i.book} readCount={i.read_count}/>{i.status==='read'&&<button className="secondary-btn" style={{width:'100%',marginTop:9}} onClick={()=>increment(i)}>Li novamente</button>}</div>)}</div>:<div className="empty" style={{marginTop:24}}>Nenhum livro nesta seção.</div>}</main>}
