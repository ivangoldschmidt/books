import { NextRequest, NextResponse } from 'next/server';
import type { MediaRecord, MediaType } from '@/lib/media-types';

type Context = { params: Promise<{type:string;id:string}> };
export async function GET(_request: NextRequest, {params}: Context) {
  const {type,id} = await params;
  if (!['movie','tv'].includes(type) || !/^\d{1,9}$/.test(id)) return NextResponse.json({error:'Título inválido.'},{status:400});
  const token=process.env.TMDB_API_READ_ACCESS_TOKEN, apiKey=process.env.TMDB_API_KEY;
  if(!token&&!apiKey) return NextResponse.json({error:'Configure o token do TMDB na Vercel.'},{status:503});
  const url=new URL(`https://api.themoviedb.org/3/${type}/${id}`);
  url.searchParams.set('language','pt-BR');
  url.searchParams.set('append_to_response','credits,external_ids');
  if(!token&&apiKey)url.searchParams.set('api_key',apiKey);
  try{
    const res=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`,accept:'application/json'}:{accept:'application/json'},next:{revalidate:3600}});
    if(!res.ok)return NextResponse.json({error:`O TMDB retornou ${res.status}.`},{status:502});
    const x=await res.json();
    const crew=Array.isArray(x.credits?.crew)?x.credits.crew:[];
    const director=crew.filter((person:{job?:string;name?:string})=>person.job==='Director').map((person:{name:string})=>person.name).slice(0,3).join(', ');
    const creators=Array.isArray(x.created_by)?x.created_by.map((person:{name?:string})=>person.name).filter(Boolean):[];
    const cast=Array.isArray(x.credits?.cast)?x.credits.cast.slice(0,8).map((person:{name?:string})=>person.name).filter(Boolean):[];
    const releaseDate=(type==='tv'?x.first_air_date:x.release_date)||'';
    const media:MediaRecord={id:Number(id),mediaType:type as MediaType,title:(type==='tv'?x.name:x.title)||'Sem título',originalTitle:(type==='tv'?x.original_name:x.original_title)||'',overview:x.overview||'',posterPath:x.poster_path||null,posterUrl:x.poster_path?`https://image.tmdb.org/t/p/w500${x.poster_path}`:null,backdropUrl:x.backdrop_path?`https://image.tmdb.org/t/p/w1280${x.backdrop_path}`:null,releaseDate,year:releaseDate.slice(0,4),voteAverage:typeof x.vote_average==='number'?x.vote_average:null,genreIds:(x.genres||[]).map((g:{id:number})=>g.id),genres:(x.genres||[]).map((g:{name:string})=>g.name),director:director||undefined,creators,cast,runtime:type==='tv'?x.episode_run_time?.[0]||null:x.runtime||null,seasons:type==='tv'?x.number_of_seasons:undefined,episodes:type==='tv'?x.number_of_episodes:undefined,originalLanguage:x.original_language,tagline:x.tagline||undefined,imdbId:x.external_ids?.imdb_id||x.imdb_id||null};
    return NextResponse.json({media});
  }catch{return NextResponse.json({error:'Não foi possível carregar os detalhes no TMDB.'},{status:502})}
}
