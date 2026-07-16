'use client';
import { Star } from 'lucide-react';
export function StarRating({value,onChange,readonly=false}:{value:number|null;onChange?:(n:number)=>void;readonly?:boolean}){
 return <div className="stars" aria-label={value?`${value} de 5 estrelas`:'Sem nota'}>{[1,2,3,4,5].map(n=><button key={n} type="button" disabled={readonly} className={n<=(value||0)?'filled':''} onClick={()=>onChange?.(n)} aria-label={`${n} estrelas`}><Star size={18}/></button>)}</div>
}
