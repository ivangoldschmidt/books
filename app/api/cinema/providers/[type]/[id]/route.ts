import { NextRequest, NextResponse } from 'next/server';
export async function GET(_req:NextRequest,{params}:{params:Promise<{type:string;id:string}>}){
 const {type,id}=await params;
 if(!['movie','tv'].includes(type)||!/^[0-9]{1,9}$/.test(id))return NextResponse.json({error:'Título inválido'},{status:400});
 const token=process.env.TMDB_API_READ_ACCESS_TOKEN,key=process.env.TMDB_API_KEY;
 if(!token&&!key)return NextResponse.json({error:'Token TMDB não configurado'},{status:503});
 const url=new URL(`https://api.themoviedb.org/3/${type}/${id}/watch/providers`);
 if(!token&&key)url.searchParams.set('api_key',key);
 try {const r=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},next:{revalidate:21600}});
 if(!r.ok)throw Error(`TMDB: ${r.status}`);
 const json=await r.json();const br=json.results?.BR||{};
 return NextResponse.json({country:'BR',link:br.link||null,flatrate:br.flatrate||[],free:br.free||[],ads:br.ads||[],rent:br.rent||[],buy:br.buy||[],source:'TMDB / JustWatch'});
 }catch{return NextResponse.json({error:'Não foi possível consultar a disponibilidade'},{status:502})}
}
