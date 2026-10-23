'use client';

import { useEffect, useState } from 'react';
import { Check, Clapperboard, Heart, MessageCircle, Send, Star, Trash2 } from 'lucide-react';
import type { MediaLibraryItem, MediaRecord } from '@/lib/media-types';

type Props = {
  item: MediaLibraryItem;
  onPatch: (id: string, patch: Partial<MediaLibraryItem>) => Promise<void>;
  onDelete: (item: MediaLibraryItem) => Promise<void>;
  onShare: (media: MediaRecord) => Promise<void>;
};

export function CinemaMediaCard({ item, onPatch, onDelete, onShare }: Props) {
  const [comment, setComment] = useState(item.private_comment || '');
  const [savingComment, setSavingComment] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  useEffect(() => setComment(item.private_comment || ''), [item.private_comment]);

  async function saveComment() {
    setSavingComment(true);
    await onPatch(item.id, { private_comment: comment });
    setSavingComment(false);
    setCommentMessage('Nota privada guardada.');
    window.setTimeout(() => setCommentMessage(''), 2500);
  }

  const titleType = item.media_type === 'tv' ? 'Série' : 'Filme';
  return (
    <article className="cinema-card">
      <div className="cinema-poster">
        {item.media?.posterUrl ? <img src={item.media.posterUrl} alt={`Cartaz de ${item.media.title}`} loading="lazy" /> : <div className="cinema-poster-fallback"><Clapperboard size={34}/><span>{item.media?.title || titleType}</span></div>}
        <button className={`cinema-favorite ${item.is_favorite ? 'active' : ''}`} aria-label={item.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} title={item.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} onClick={() => void onPatch(item.id, { is_favorite: !item.is_favorite })}><Heart size={18} fill={item.is_favorite ? 'currentColor' : 'none'}/></button>
      </div>
      <div className="cinema-card-body">
        <div className="cinema-card-kicker">{titleType}{item.media?.year ? ` · ${item.media.year}` : ''}</div>
        <h3 title={item.media?.title}>{item.media?.title || 'Título sem nome'}</h3>
        <div className="cinema-meta-row">
          {typeof item.media?.voteAverage === 'number' && <span><Star size={14} fill="currentColor"/> {item.media.voteAverage.toFixed(1)} TMDB</span>}
          <span className={`cinema-status ${item.status}`}>{item.status === 'watched' ? 'Assistido' : 'Quero assistir'}</span>
        </div>
        <div className="cinema-rating-row">
          <label htmlFor={`rating-${item.id}`}>A minha nota</label>
          <select id={`rating-${item.id}`} aria-label={`A tua nota para ${item.media?.title}`} value={item.rating ?? ''} onChange={(event) => void onPatch(item.id, { rating: event.target.value ? Number(event.target.value) : null })}>
            <option value="">Sem nota</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}/10</option>)}
          </select>
        </div>
        <label className="cinema-private-label" htmlFor={`note-${item.id}`}><MessageCircle size={14}/> Nota privada</label>
        <textarea id={`note-${item.id}`} rows={3} value={comment} maxLength={3000} onChange={e => setComment(e.target.value)} placeholder="O que achaste? Esta nota só tu podes ver." />
        <button className="cinema-button subtle full" onClick={() => void saveComment()} disabled={savingComment}>{savingComment ? 'A guardar…' : <><Check size={16}/> Guardar nota privada</>}</button>
        {commentMessage && <small className="cinema-feedback">{commentMessage}</small>}
        <div className="cinema-card-actions">
          <button className="cinema-button primary" onClick={() => void onPatch(item.id, { status: item.status === 'watched' ? 'want' : 'watched', watched_at: item.status === 'watched' ? null : new Date().toISOString() })}>{item.status === 'watched' ? 'Quero rever' : 'Marcar assistido'}</button>
          <button className="cinema-icon-action" onClick={() => void onShare(item.media)} title="Partilhar com a outra conta" aria-label="Partilhar filme"><Send size={17}/></button>
          <button className="cinema-icon-action danger" onClick={() => void onDelete(item)} title="Remover da biblioteca" aria-label="Remover da biblioteca"><Trash2 size={17}/></button>
        </div>
      </div>
    </article>
  );
}
