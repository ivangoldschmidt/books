import { NextRequest, NextResponse } from 'next/server';
import type { Book } from '@/lib/types';
import { safeDescription } from '@/lib/utils';

const timeout = (ms:number) => AbortSignal.timeout(ms);

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

async function translateSearchQuery(query: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return query;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://minha-estante.vercel.app',
        'X-Title': 'Minha Estante',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{
          role: 'user',
          content: `Traduza esta busca de livro para inglês. Responda somente com a busca traduzida, sem aspas, explicações ou pontuação extra. Preserve nomes próprios e nomes de autores. Se já estiver em inglês, repita exatamente. Busca: ${query}`,
        }],
        temperature: 0,
        max_tokens: 80,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return query;
    const data = await response.json().catch(() => ({}));
    const translated = String(data?.choices?.[0]?.message?.content || '')
      .replace(/^```(?:text)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .trim();
    return translated || query;
  } catch {
    return query;
  }
}


async function google(q:string):Promise<Book[]>{
 const key=process.env.GOOGLE_BOOKS_API_KEY; const url=new URL('https://www.googleapis.com/books/v1/volumes');
 url.searchParams.set('q',q); url.searchParams.set('maxResults','20'); if(key)url.searchParams.set('key',key);
 const r=await fetch(url,{signal:timeout(6500),next:{revalidate:3600}}); if(!r.ok)throw new Error('Google Books indisponível'); const j=await r.json();
 return (j.items||[]).map((x:any)=>({id:`google:${x.id}`,source:'google',sourceId:x.id,googleVolumeId:x.id,title:x.volumeInfo?.title||'Sem título',authors:x.volumeInfo?.authors||[],description:safeDescription(x.volumeInfo?.description),coverUrl:(x.volumeInfo?.imageLinks?.thumbnail||x.volumeInfo?.imageLinks?.smallThumbnail)?.replace('http:','https:'),publishedYear:x.volumeInfo?.publishedDate?.slice(0,4),language:x.volumeInfo?.language,isbn:x.volumeInfo?.industryIdentifiers?.find((i:any)=>i.type==='ISBN_13')?.identifier,previewUrl:x.volumeInfo?.previewLink,embeddable:!!x.accessInfo?.embeddable,genres:x.volumeInfo?.categories||[],publisher:x.volumeInfo?.publisher,series:x.volumeInfo?.seriesInfo?.bookDisplayNumber?x.volumeInfo?.title:undefined}));
}
async function openLibrary(q:string):Promise<Book[]>{
 const url=new URL('https://openlibrary.org/search.json'); url.searchParams.set('q',q); url.searchParams.set('limit','20'); url.searchParams.set('fields','key,title,author_name,first_publish_year,isbn,cover_i,language,publisher,subject');
 const r=await fetch(url,{signal:timeout(6500),next:{revalidate:3600},headers:{'User-Agent':'MinhaEstante/1.0'}}); if(!r.ok)throw new Error('Open Library indisponível'); const j=await r.json();
 return (j.docs||[]).map((x:any)=>({id:`openlibrary:${x.key}`,source:'openlibrary',sourceId:x.key,title:x.title||'Sem título',authors:x.author_name||[],description:'Descrição não disponível.',coverUrl:x.cover_i?`https://covers.openlibrary.org/b/id/${x.cover_i}-L.jpg`:undefined,publishedYear:x.first_publish_year?.toString(),language:x.language?.[0],isbn:x.isbn?.[0],genres:x.subject?.slice?.(0,8)||[],publisher:x.publisher?.[0]}));
}
async function gutendex(q:string):Promise<Book[]>{
 const url=new URL('https://gutendex.com/books'); url.searchParams.set('search',q);
 const r=await fetch(url,{signal:timeout(6500),next:{revalidate:3600}}); if(!r.ok)throw new Error('Gutendex indisponível'); const j=await r.json();
 return (j.results||[]).slice(0,20).map((x:any)=>({id:`gutendex:${x.id}`,source:'gutendex',sourceId:String(x.id),title:x.title||'Sem título',authors:(x.authors||[]).map((a:any)=>a.name),description:`Livro do Projeto Gutenberg. Downloads: ${x.download_count||0}.`,coverUrl:x.formats?.['image/jpeg'],language:x.languages?.[0],genres:x.subjects||[],previewUrl:x.formats?.['text/html']||x.formats?.['application/epub+zip']}));
}
async function internetArchive(q:string):Promise<Book[]>{
 const url=new URL('https://archive.org/advancedsearch.php'); url.searchParams.set('q',`title:(${q}) AND mediatype:texts`); url.searchParams.set('fl[]','identifier,title,creator,description,date,language'); url.searchParams.set('rows','20'); url.searchParams.set('output','json');
 const r=await fetch(url,{signal:timeout(6500),next:{revalidate:3600}}); if(!r.ok)throw new Error('Internet Archive indisponível'); const j=await r.json();
 return (j.response?.docs||[]).map((x:any)=>({id:`internetarchive:${x.identifier}`,source:'internetarchive',sourceId:x.identifier,title:Array.isArray(x.title)?x.title[0]:x.title||'Sem título',authors:Array.isArray(x.creator)?x.creator:[x.creator].filter(Boolean),description:safeDescription(Array.isArray(x.description)?x.description[0]:x.description),coverUrl:`https://archive.org/services/img/${x.identifier}`,publishedYear:String(x.date||'').slice(0,4),language:Array.isArray(x.language)?x.language[0]:x.language,previewUrl:`https://archive.org/details/${x.identifier}`,genres:[]}));
}

async function libraryOfCongress(q:string):Promise<Book[]>{
 const url=new URL('https://www.loc.gov/books/');
 url.searchParams.set('q',q); url.searchParams.set('fo','json'); url.searchParams.set('c','20');
 const r=await fetch(url,{signal:timeout(7000),next:{revalidate:3600},headers:{'User-Agent':'MinhaEstante/2.0'}});
 if(!r.ok)throw new Error('Library of Congress indisponível');
 const j=await r.json();
 return (j.results||[]).filter((x:any)=>x?.title).map((x:any)=>{
   const contributors=Array.isArray(x.contributor)?x.contributor:[];
   const creators=Array.isArray(x.creator)?x.creator:[x.creator].filter(Boolean);
   const authors=(contributors.length?contributors:creators).map((a:any)=>typeof a==='string'?a:a?.name).filter(Boolean).slice(0,6);
   const images=Array.isArray(x.image)?x.image:[];
   const descriptions=Array.isArray(x.description)?x.description:[x.description].filter(Boolean);
   const subjects=Array.isArray(x.subject)?x.subject:[];
   const languages=Array.isArray(x.language)?x.language:[x.language].filter(Boolean);
   const locations=Array.isArray(x.location)?x.location:[];
   const identifiers=Array.isArray(x.number)?x.number:[];
   const isbn=identifiers.map((v:any)=>String(v)).find((v:string)=>/^(?:97[89])?\d{9}[\dX]$/i.test(v.replace(/[-\s]/g,'')));
   const idUrl=typeof x.id==='string'?x.id:'';
   const sourceId=idUrl.split('/').filter(Boolean).pop()||String(x.item?.id||x.title);
   return {id:`loc:${sourceId}`,source:'loc',sourceId,title:x.title||'Sem título',authors,description:safeDescription(descriptions[0]),coverUrl:images.at(-1)||images[0],publishedYear:String(x.date||x.item?.date||'').match(/\d{4}/)?.[0],language:languages[0],isbn,genres:subjects.slice(0,12),authorCountries:locations.slice(0,5),publisher:x.publisher?.[0]||x.item?.publication,previewUrl:idUrl||undefined} as Book;
 });
}

export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams.get('q')?.trim();
 if(!q)return NextResponse.json({books:[],providers:[],queryUsed:'',translated:false});
 const queryUsed=await translateSearchQuery(q);
 const providers=[['Google Books',google],['Open Library',openLibrary],['Gutendex',gutendex],['Internet Archive',internetArchive],['Library of Congress',libraryOfCongress]] as const;
 const settled=await Promise.allSettled(providers.map(([,fn])=>fn(queryUsed)));
 const books:Book[]=[]; const seen=new Set<string>();
 settled.forEach((result)=>{if(result.status==='fulfilled')for(const book of result.value){const key=(book.isbn||`${book.title}|${book.authors[0]||''}`).toLowerCase();if(!seen.has(key)){seen.add(key);books.push(book)}}});
 return NextResponse.json({
   books:books.slice(0,60),
   providers:settled.map((result,index)=>({name:providers[index][0],ok:result.status==='fulfilled'})),
   queryUsed,
   translated:queryUsed.toLocaleLowerCase()!==q.toLocaleLowerCase(),
 });
}
