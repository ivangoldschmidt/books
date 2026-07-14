'use client';
import type { Book, ShelfStatus } from '@/lib/types';
import { bookKey, shelfLabels } from '@/lib/utils';
import { createClient } from '@/lib/supabase-browser';
import { useState } from 'react';

export function AddBookModal({book,onClose,onSaved}:{book:Book;onClose:()=>void;onSaved?:()=>void}){
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function save(status:ShelfStatus){
    setBusy(true); setError(''); const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser();
    if(!user){ location.href='/login'; return; }
    const payload={user_id:user.id,book_key:bookKey(book),status,book,updated_at:new Date().toISOString()};
    const {error}=await supabase.from('library_items').upsert(payload,{onConflict:'user_id,book_key'});
    if(error){setError(error.message);setBusy(false);return;} onSaved?.(); onClose();
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}>
    <h2>Adicionar à estante</h2><p className="muted">{book.title}</p>
    <div className="modal-actions">{(['read','reading','want'] as ShelfStatus[]).map(s=><button disabled={busy} key={s} className="secondary-btn" onClick={()=>save(s)}>{shelfLabels[s]}</button>)}</div>
    {error&&<p style={{color:'crimson'}}>{error}</p>}<button className="secondary-btn" style={{marginTop:16}} onClick={onClose}>Cancelar</button>
  </div></div>
}
