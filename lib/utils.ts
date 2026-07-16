import type { Book, ShelfStatus } from './types';
export const shelfLabels:Record<ShelfStatus,string>={read:'Já li',reading:'Lendo agora',want:'Quero ler'};
export const bookKey=(b:Book)=>(b.isbn||`${b.source}:${b.sourceId}`).toLowerCase();
export function safeDescription(v:unknown){if(typeof v==='string')return v.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();if(v&&typeof v==='object'&&'value' in v)return safeDescription((v as {value:unknown}).value);return 'Descrição não disponível.'}
export const normalize=(v?:string)=>v?.trim()||'Não informado';
