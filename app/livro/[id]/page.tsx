'use client';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { Book } from '@/lib/types';
import { AddBookModal } from '@/components/AddBookModal';
import { GoogleViewer } from '@/components/GoogleViewer';
export default function BookDetail(){const p=useSearchParams();const[open,setOpen]=useState(false);const book=useMemo(()=>{try{return JSON.parse(decodeURIComponent(escape(atob(p.get('data')||'')))) as Book}catch{return null}},[p]);if(!book)return <main className="container section"><div className="empty">Não foi possível carregar este livro.</div></main>;
 return <main className="container"><section className="detail"><div>{book.coverUrl?<img className="detail-cover" src={book.coverUrl} alt={`Capa de ${book.title}`}/>:<div className="cover-wrap"><div className="cover-placeholder">{book.title}</div></div>}</div><div><div className="eyebrow">{book.source}</div><h1>{book.title}</h1><p className="muted"><strong>{book.authors.join(', ')||'Autor desconhecido'}</strong>{book.publishedYear?` · ${book.publishedYear}`:''}</p><p style={{lineHeight:1.75}}>{book.description}</p><button className="primary-btn" onClick={()=>setOpen(true)}>Adicionar à biblioteca</button>{book.previewUrl&&<a className="secondary-btn" style={{marginLeft:10}} href={book.previewUrl} target="_blank" rel="noreferrer">Abrir fonte</a>}</div></section>
 {book.googleVolumeId&&book.embeddable&&<section className="section"><div className="section-head"><div><div className="eyebrow">Google Books</div><h2>Ler prévia</h2></div></div><GoogleViewer volumeId={book.googleVolumeId}/></section>}{open&&<AddBookModal book={book} onClose={()=>setOpen(false)}/>}</main>}
