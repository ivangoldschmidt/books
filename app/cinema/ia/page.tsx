'use client';
import Link from 'next/link';
import { Sparkles, Search } from 'lucide-react';
import { useState } from 'react';
type Rec={title:string;year?:string;mediaType?:'movie'|'tv';reason:string};
export default function CinemaAI(){
 const [request,setRequest]=useState(''),[kind,setKind]=useState('all'),[recs,setRecs]=useState<Rec[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function run(){setLoading(true);setError('');setRecs([]);try{const r=await fetch('/api/cinema/recommend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request,kind})});const j=await r.json();if(!r.ok)throw Error(j.error||'Não foi possível gerar sugestões.');setRecs(j.recommendations||[])}catch(e){setError(e instanceof Error?e.message:'A IA falhou.')}finally{setLoading(false)}}
 return <main className="container section recommendation-page"><div className="eyebrow">Recomendações para seu cinema</div><h1><Sparkles size={30}/> IA · Filmes & Séries</h1><p className="lead">Sugestões baseadas exclusivamente em seus filmes e séries. Seus livros e suas comentários privados ficam fora desta análise.</p>
 <div className="media-ai-form"><label htmlFor="media-kind">Quero recomendações de</label><select id="media-kind" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">Filmes e séries</option><option value="movie">Somente filmes</option><option value="tv">Somente séries</option></select><label htmlFor="media-ai-prompt">Descreva seu momento (opcional)</label><textarea id="media-ai-prompt" rows={4} maxLength={500} placeholder="Ex.: Um suspense inteligente sem muita violência, para assistir hoje à noite." value={request} onChange={e=>setRequest(e.target.value)}/><button className="primary-btn" disabled={loading} onClick={()=>void run()}><Sparkles size={17}/>{loading?'Analisando seu histórico…':'Gerar recomendações'}</button></div>
 {error&&<div className="form-error">{error}</div>}
 {recs.length>0&&<section className="recommend-results">{recs.map((rec,i)=><article className="recommend-card" key={`${rec.title}-${i}`}><span className="recommend-index">0{i+1}</span><div><small>{rec.mediaType==='tv'?'Série':'Filme'} {rec.year?`· ${rec.year}`:''}</small><h2>{rec.title}</h2><p>{rec.reason}</p><Link className="secondary-btn" href={`/cinema/pesquisar?q=${encodeURIComponent(rec.title)}`}><Search size={17}/> Buscar no TMDB</Link></div></article>)}</section>}
 </main>
}
