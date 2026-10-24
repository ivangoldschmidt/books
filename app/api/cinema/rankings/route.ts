import { NextRequest, NextResponse } from 'next/server';
export async function GET(req:NextRequest){
 const type=req.nextUrl.searchParams.get('type')==='tv'?'tv':'movie';
 const period=req.nextUrl.searchParams.get('period')==='popular'?'popular':'week';
 const token=process.env.TMDB_API_READ_ACCESS_TOKEN,key=process.env.TMDB_API_KEY;
 if(!token&&!key)return NextResponse.json({error:'Configure o token TMDB'},{status:503});
 const path=period==='week'?`trending/${type}/week`:`${type}/popular`;
 const url=new URL(`https://api.themoviedb.org/3/${path}`);url.searchParams.set('language','pt-BR');
 if(!token&&key)url.searchParams.set('api_key',key);
 try {const r=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},next:{revalidate:3600}});
 if(!r.ok)throw Error(String(r.status));const j=await r.json();
 const results=(j.results||[]).slice(0,10).map((x:any)=>({id:x.id,mediaType:type,title:x.title||x.name,year:(x.release_date||x.first_air_date||'').slice(0,4),posterUrl:x.poster_path?`https://image.tmdb.org/t/p/w342${x.poster_path}`:null,score:x.vote_average}));
 return NextResponse.json({results,period,description:period==='week'?'Tendências dos últimos 7 dias no TMDB':'Ranking atual por popularidade no TMDB — não representa um mês ou ano fechado',region:'Global'});
 }catch{return NextResponse.json({error:'Erro ao consultar ranking'},{status:502})}
}
