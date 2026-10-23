'use client';
import { useEffect, useState } from 'react';
import { Check, MessageCircle, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import type { Book, LibraryItem } from '@/lib/types';

export function ShareBookButton({book}:{book:Book}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function share(){const email=window.prompt('E-mail da outra conta do site:');if(!email?.trim())return;const note=window.prompt('Mensagem opcional para acompanhar o livro:')||'';setBusy(true);setMessage('');
  // Apenas metadados da obra são enviados. Notas, avaliações e comentários nunca são incluídos.
  const {error}=await createClient().rpc('send_book_share',{recipient_email:email.trim(),book_snapshot:book,share_message:note});
  setMessage(error?.message||'Livro compartilhado com sucesso.');setBusy(false);
 }
 return <div><button className="cinema-button" disabled={busy} onClick={()=>void share()}><Send size={16}/>{busy?'Enviando…':'Compartilhar livro'}</button>{message&&<p className="cinema-feedback" role="status">{message}</p>}</div>
}
export function BookPrivateActions({item,onUpdated}:{item:LibraryItem;onUpdated?:(updated:LibraryItem)=>void}){
 const [comment,setComment]=useState(item.private_comment||''),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>setComment(item.private_comment||''),[item.private_comment]);
 async function save(){setSaving(true);setNotice('');const {error}=await createClient().from('library_items').update({private_comment:comment,updated_at:new Date().toISOString()}).eq('id',item.id);
  if(error)setNotice(error.message);else{setNotice('Comentário privado salvo.');onUpdated?.({...item,private_comment:comment})}setSaving(false)}
 return <div className="book-private-actions"><label htmlFor={`book-note-${item.id}`}><MessageCircle size={16}/> Comentário privado</label><textarea id={`book-note-${item.id}`} value={comment} rows={3} maxLength={3000} onChange={e=>setComment(e.target.value)} placeholder="Suas impressões sobre este livro (só você pode ver)"/>
  <button type="button" className="cinema-button subtle" disabled={saving} onClick={()=>void save()}><Check size={16}/> {saving?'Salvando…':'Salvar comentário'}</button>
  {notice&&<p className="cinema-feedback" role="status">{notice}</p>}
  <ShareBookButton book={item.book}/>
 </div>
}
