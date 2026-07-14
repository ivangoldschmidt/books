'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { ShelfStatus } from '@/lib/types';

export default function Home(){
 const [counts,setCounts]=useState<Record<ShelfStatus,number>>({read:0,reading:0,want:0});
 useEffect(()=>{(async()=>{const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user)return;const {data}=await s.from('library_items').select('status');if(data)setCounts({read:data.filter(x=>x.status==='read').length,reading:data.filter(x=>x.status==='reading').length,want:data.filter(x=>x.status==='want').length})})()},[]);
 return <main><div className="container"><section className="hero"><div><div className="eyebrow">Sua vida de leitura, organizada</div><h1>Histórias que ficam.<br/><em>Leituras que avançam.</em></h1><p>Descubra livros, acompanhe seu progresso e construa uma biblioteca que é só sua.</p><Link href="/buscar" className="primary-btn">Encontrar um livro <ArrowRight size={18}/></Link></div><div className="book-art"><div className="stack"><div className="book-shape"/><div className="book-shape"/><div className="book-shape"/></div><div className="cup"/></div></section>
 <section className="stats">{([['read','Já li'],['reading','Lendo agora'],['want','Quero ler']] as const).map(([k,label])=><Link className="stat" href={`/biblioteca?status=${k}`} key={k}><strong>{counts[k]}</strong><span>{label}</span></Link>)}</section></div></main>
}
