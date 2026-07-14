'use client';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { Book } from '@/lib/types';
import { BookCard } from '@/components/BookCard';
export default function SearchPage(){const[q,setQ]=useState('');const[books,setBooks]=useState<Book[]>([]);const[loading,setLoading]=useState(false);const[providers,setProviders]=useState<{name:string;ok:boolean}[]>([]);
 async function submit(e:FormEvent){e.preventDefault();if(!q.trim())return;setLoading(true);const r=await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);const j=await r.json();setBooks(j.books||[]);setProviders(j.providers||[]);setLoading(false)}
 return <main className="container section"><div className="section-head"><div><div className="eyebrow">Descobrir</div><h2>Buscar livros</h2></div><p className="muted">Uma tentativa por fonte, sem repetir requisições.</p></div><form className="search-bar" onSubmit={submit}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Título, autor ou ISBN…" autoFocus/><button className="primary-btn"><Search size={18}/>{loading?'Buscando…':'Buscar'}</button></form>
 {providers.length>0&&<p className="muted">Fontes: {providers.map(p=>`${p.name} ${p.ok?'✓':'×'}`).join(' · ')}</p>}
 {books.length?<div className="grid">{books.map(b=><BookCard key={b.id} book={b}/>)}</div>:!loading&&<div className="empty">Pesquise por um livro para começar.</div>}</main>}
