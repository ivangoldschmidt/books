import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { MediaRecord } from '@/lib/media-types';

export async function POST(req:NextRequest){
 const key=process.env.OPENROUTER_API_KEY;
 if(!key)return NextResponse.json({error:'Configure OPENROUTER_API_KEY na Vercel para usar a IA.'},{status:503});
 const store=await cookies();const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>store.getAll(),setAll:()=>undefined}});
 const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Faça login para utilizar a IA.'},{status:401});
 const {media}=await req.json().catch(()=>({})) as {media?:MediaRecord};
 if(!media||!['tv','movie'].includes(media.mediaType)||!Number.isInteger(media.id)||!media.title)return NextResponse.json({error:'Título inválido.'},{status:400});
 const prompt=`Você é um pesquisador de cinema. Traduza e organize em português do Brasil informações sobre este título SEM INVENTAR FATOS nem apresentar spoilers. Use SOMENTE os metadados fornecidos. Se a sinopse for insuficiente, escreva um resumo curto e honesto sem acrescentar enredo não confirmado. Escreva uma análise de temas e atmosfera em até 100 palavras, deixando claro que é interpretação, não fato. Responda SOMENTE JSON válido: {"overview":"sinopse em pt-BR", "analysis":"análise sem spoilers em pt-BR"}. DADOS: ${JSON.stringify({title:media.title,originalTitle:media.originalTitle,kind:media.mediaType,year:media.year,overview:media.overview,genres:media.genres,cast:media.cast,director:media.director,creators:media.creators}).slice(0,7000)}`;
 try{
  const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':process.env.NEXT_PUBLIC_SITE_URL||'https://books-gamma-woad.vercel.app','X-OpenRouter-Title':'Minha Biblioteca'},body:JSON.stringify({model:process.env.OPENROUTER_MODEL||'openrouter/free',messages:[{role:'user',content:prompt}],temperature:0.2,max_tokens:700}),signal:AbortSignal.timeout(40000),cache:'no-store'});
  const data=await r.json();if(!r.ok)return NextResponse.json({error:data.error?.message||`A IA retornou ${r.status}.`},{status:502});
  const content=data.choices?.[0]?.message?.content;
  const raw=typeof content==='string'?content:Array.isArray(content)?content.map((x:{text?:string})=>x.text||'').join(''):'';
  const clean=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();const start=clean.indexOf('{'),end=clean.lastIndexOf('}');
  if(start<0||end<start)throw new Error('A IA retornou um formato inválido.');
  const parsed=JSON.parse(clean.slice(start,end+1));
  const result:MediaRecord={...media,originalOverview:media.originalOverview||media.overview,aiOverview:String(parsed.overview||'').slice(0,3500),aiAnalysis:String(parsed.analysis||'').slice(0,2000),aiEnriched:true};
  if(!result.aiOverview)throw new Error('A IA não conseguiu criar o resumo.');
  return NextResponse.json({media:result});
 }catch(err){return NextResponse.json({error:err instanceof Error?err.message:'Erro ao consultar a IA.'},{status:502})}
}
