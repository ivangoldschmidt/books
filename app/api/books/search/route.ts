import { NextRequest, NextResponse } from 'next/server';
import type { Book } from '@/lib/types';
import { safeDescription } from '@/lib/utils';

const timeout = (ms:number) => AbortSignal.timeout(ms);

async function google(q:string):Promise<Book[]>{
 const key=process.env.GOOGLE_BOOKS_API_KEY; const url=new URL('https://www.googleapis.com/books/v1/volumes');
 url.searchParams.set('q',q); url.searchParams.set('maxResults','20'); if(key)url.searchParams.set('key',key);
 const r=await fetch(url,{signal:timeout(6500),next:{revalidate:3600}}); if(!r.ok)throw new Error('Google Books indisponível'); const j=await r.json();
 return (j.items||[]).map((x:any)=>({id:`google:${x.id}`,source:'google',sourceId:x.id,googleVolumeId:x.id,title:x.volumeInfo?.title||'Sem título',authors:x.volumeInfo?.authors||[],description:safeDescription(x.volumeInfo?.description),coverUrl:(x.volumeInfo?.imageLinks?.thumbnail||x.volumeInfo?.imageLinks?.smallThumbnail)?.replace('http:','https:'),publishedYear:x.volumeInfo?.publishedDate?.slice(0,4),language:x.volumeInfo?.language,isbn:x.volumeInfo?.industryIdentifiers?.find((i:any)=>i.type==='ISBN_13')?.identifier,previewUrl:x.volumeInfo?.previewLink,embeddable:!!x.accessInfo?.embeddable}));
}
async function openLibrary(q:string):Promise<Book[]>{
 const url=new URL('https://openlibrary.org/search.json'); url.searchParams.set('q',q); url.searchParams.set('limit','20'); url.searchParams.set('fields','key,title,author_name,first_publish_year,isbn,cover_i,language');
 const r=await fetch(url,{signal:timeout(6500),next:{revalidate:3600},headers:{'User-Agent':'MinhaEstante/1.0'}}); if(!r.ok)throw new Error('Open Library indisponível'); const j=await r.json();
 return (j.docs||[]).map((x:any)=>({id:`openlibrary:${x.key}`,source:'openlibrary',sourceId:x.key,title:x.title||'Sem título',authors:x.author_name||[],description:'Abra o livro para consultar mais detalhes.',coverUrl:x.cover_i?`https://covers.openlibrary.org/b/id/${x.cover_i}-L.jpg`:undefined,publishedYear:x.first_publish_year?.toString(),language:x.language?.[0],isbn:x.isbn?.[0]}));
}
async function gutendex(q:string):Promise<Book[]>{
 const url=new URL('https://gutendex.com/books'); url.searchParams.set('search',q);
 const r=await fetch(url,{signal:timeout(6500),next:{revalidate:3600}}); if(!r.ok)throw new Error('Gutendex indisponível'); const j=await r.json();
 return (j.results||[]).slice(0,20).map((x:any)=>({id:`gutendex:${x.id}`,source:'gutendex',sourceId:String(x.id),title:x.title||'Sem título',authors:(x.authors||[]).map((a:any)=>a.name),description:`Livro do Projeto Gutenberg. Downloads: ${x.download_count||0}.`,coverUrl:x.formats?.['image/jpeg'],language:x.languages?.[0],previewUrl:x.formats?.['text/html']||x.formats?.['application/epub+zip']}));
}
async function internetArchive(q:string):Promise<Book[]>{
 const url=new URL('https://archive.org/advancedsearch.php'); url.searchParams.set('q',`title:(${q}) AND mediatype:texts`); url.searchParams.set('fl[]','identifier,title,creator,description,date,language'); url.searchParams.set('rows','20'); url.searchParams.set('output','json');
 const r=await fetch(url,{signal:timeout(6500),next:{revalidate:3600}}); if(!r.ok)throw new Error('Internet Archive indisponível'); const j=await r.json();
 return (j.response?.docs||[]).map((x:any)=>({id:`internetarchive:${x.identifier}`,source:'internetarchive',sourceId:x.identifier,title:Array.isArray(x.title)?x.title[0]:x.title||'Sem título',authors:Array.isArray(x.creator)?x.creator:[x.creator].filter(Boolean),description:safeDescription(Array.isArray(x.description)?x.description[0]:x.description),coverUrl:`https://archive.org/services/img/${x.identifier}`,publishedYear:String(x.date||'').slice(0,4),language:Array.isArray(x.language)?x.language[0]:x.language,previewUrl:`https://archive.org/details/${x.identifier}`}));
}
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams.get('q')?.trim(); if(!q)return NextResponse.json({books:[],providers:[]});
 const providers=[['Google Books',google],['Open Library',openLibrary],['Gutendex',gutendex],['Internet Archive',internetArchive]] as const;
 const settled=await Promise.allSettled(providers.map(([,fn])=>fn(q))); const books:Book[]=[]; const seen=new Set<string>();
 settled.forEach((s,i)=>{if(s.status==='fulfilled')for(const b of s.value){const key=(b.isbn||`${b.title}|${b.authors[0]||''}`).toLowerCase();if(!seen.has(key)){seen.add(key);books.push(b)}}});
 return NextResponse.json({books:books.slice(0,60),providers:settled.map((s,i)=>({name:providers[i][0],ok:s.status==='fulfilled'}))});
}
