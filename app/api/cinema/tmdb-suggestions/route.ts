import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { MediaRecord, MediaType } from '@/lib/media-types';

type Seed={tmdb_id:number;media_type:MediaType;status?:string;is_favorite?:boolean;rating?:number|null};
type Raw={id:number;title?:string;name?:string;overview?:string;poster_path?:string|null;release_date?:string;first_air_date?:string;vote_average?:number;genre_ids?:number[];adult?:boolean};
export async function GET(req:NextRequest){
 const token=process.env.TMDB_API_READ_ACCESS_TOKEN,key=process.env.TMDB_API_KEY;
 if(!token&&!key)return NextResponse.json({error:'Configure o token TMDB.'},{status:503});
 const scope=req.nextUrl.searchParams.get('scope')==='shared'?'shared':'personal';
 const listId=req.nextUrl.searchParams.get('listId')||'';
 const type=req.nextUrl.searchParams.get('type');
 if(scope==='shared'&&!/^[0-9a-f-]{36}$/i.test(listId))return NextResponse.json({error:'Selecione uma lista válida.'},{status:400});
 const store=await cookies();
 const sb=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>store.getAll(),setAll:()=>undefined}});
 const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:'Faça login.'},{status:401});
 // Supabase RLS determines which shared entries this user is authorized to read.
 const query=scope==='shared'?sb.from('cinema_shared_entries').select('tmdb_id,media_type,status').eq('list_id',listId).limit(150):sb.from('media_library_items').select('tmdb_id,media_type,status,is_favorite,rating').eq('user_id',user.id).limit(150);
 const {data,error}=await query;if(error)return NextResponse.json({error:error.message},{status:403});
 const all=(data||[]) as Seed[];
 if(!all.length)return NextResponse.json({results:[],message:'Adicione títulos à coleção para gerar recomendações.'});
 const existing=new Set(all.map(x=>`${x.media_type}:${x.tmdb_id}`));
 const seeds=all.filter(x=>type!=='movie'&&type!=='tv'||x.media_type===type).sort((a,b)=>Number(!!b.is_favorite)-Number(!!a.is_favorite)||(b.rating||0)-(a.rating||0)).slice(0,6);
 const results=await Promise.all(seeds.flatMap(seed=>['recommendations','similar'].map(async path=>{
  const url=new URL(`https://api.themoviedb.org/3/${seed.media_type}/${seed.tmdb_id}/${path}`);url.searchParams.set('language','pt-BR');if(!token&&key)url.searchParams.set('api_key',key);
  try{const r=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},next:{revalidate:21600},signal:AbortSignal.timeout(8000)});if(!r.ok)return {seed,items:[] as Raw[]};const json=await r.json() as {results?:Raw[]};return {seed,items:json.results||[]}}catch{return {seed,items:[] as Raw[]}}
 })));
 const found=new Map<string,{media:MediaRecord;score:number;matchCount:number}>();
 for(const {seed,items} of results){for(const [i,x] of items.entries()){
  const id=`${seed.media_type}:${x.id}`;if(existing.has(id)||x.adult||!x.poster_path||!(x.title||x.name))continue;
  const previous=found.get(id);const date=seed.media_type==='tv'?x.first_air_date:x.release_date;
  const media:MediaRecord={id:x.id,mediaType:seed.media_type,title:x.title||x.name||'',overview:x.overview||'',posterPath:x.poster_path,posterUrl:`https://image.tmdb.org/t/p/w500${x.poster_path}`,releaseDate:date||'',year:date?.slice(0,4)||'',voteAverage:x.vote_average??null,genreIds:x.genre_ids||[]};
  found.set(id,{media:previous?.media||media,score:(previous?.score||0)+1+(seed.is_favorite?0.5:0)+(seed.rating||0)/20+(20-i)/100,matchCount:(previous?.matchCount||0)+1});
 }}
 return NextResponse.json({results:[...found.values()].sort((a,b)=>b.score-a.score).slice(0,18).map(({media,matchCount})=>({...media,matchCount})),source:'TMDB recommendations + similar'});
}
