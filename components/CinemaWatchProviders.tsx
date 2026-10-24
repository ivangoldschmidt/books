'use client';
import {useEffect,useState} from 'react';
type Provider={provider_id:number;provider_name:string;logo_path:string};
type Data={link:string|null;flatrate:Provider[];free:Provider[];ads:Provider[];rent:Provider[];buy:Provider[]};
export function CinemaWatchProviders({type,id}:{type:string;id:number}){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch(`/api/cinema/providers/${type}/${id}`).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error);if(active)setData(j)}).catch(e=>active&&setError(e.message));return()=>{active=false}},[type,id]);
 const groups:[string,keyof Data][]=[['Streaming','flatrate'],['Grátis','free'],['Com anúncios','ads'],['Aluguel','rent'],['Compra','buy']];
 return <section className="cinema-provider-section"><h2>Onde assistir no Brasil</h2><p className="muted">Disponibilidade informada pelo TMDB em parceria com a JustWatch. Catálogos podem mudar.</p>
 {error&&<p className="muted">{error}</p>}{!data&&!error&&<p className="muted">Consultando provedores…</p>}
 {data&&<>{groups.map(([label,key])=>{const providers=data[key] as Provider[];return providers?.length?<div key={label}><h3>{label}</h3><div className="cinema-provider-list">{providers.map(pr=><span className="cinema-provider" key={pr.provider_id}>{pr.logo_path&&<img src={`https://image.tmdb.org/t/p/w92${pr.logo_path}`} alt=""/>}{pr.provider_name}</span>)}</div></div>:null})}
 {!groups.some(([,key])=>(data[key] as Provider[])?.length)&&<p className="muted">Nenhuma oferta disponível registrada para o Brasil neste momento.</p>}
 {data.link&&<a href={data.link} target="_blank" rel="noopener noreferrer" className="cinema-button secondary-accent">Conferir opções no TMDB</a>}
 <p className="cinema-attribution">Dados de disponibilidade: JustWatch via TMDB. Os links das plataformas devem ser conferidos no TMDB.</p></>}</section>;
}
