'use client';

import Link from 'next/link';
import { Heart, Plus } from 'lucide-react';
import type { Book } from '@/lib/types';
import { AddBookModal } from './AddBookModal';
import { useState } from 'react';

export function BookCard({
  book,
  readCount,
  showAddButton = true,
  favorite = false,
  showFavoriteButton = false,
  onToggleFavorite,
}: {
  book: Book;
  readCount?: number;
  showAddButton?: boolean;
  favorite?: boolean;
  showFavoriteButton?: boolean;
  onToggleFavorite?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="book-card">
      <div className="cover-wrap">
        <Link
          href={`/livro/${encodeURIComponent(`${book.source}:${book.sourceId}`)}?data=${encodeURIComponent(
            btoa(unescape(encodeURIComponent(JSON.stringify(book)))),
          )}`}
          aria-label={`Ver ${book.title}`}
        >
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={`Capa de ${book.title}`} loading="lazy" />
          ) : (
            <div className="cover-placeholder">{book.title}</div>
          )}
        </Link>

        {!!readCount && readCount > 1 && (
          <span className="read-badge">Lido {readCount}×</span>
        )}

        {showFavoriteButton && (
          <button
            type="button"
            className={`favorite-btn ${favorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
            aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            title={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart size={21} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        )}

        {showAddButton && (
          <button
            className="add-btn"
            onClick={() => setOpen(true)}
            aria-label="Adicionar à estante"
          >
            <Plus />
          </button>
        )}
      </div>

      <div className="book-title" title={book.title}>{book.title}</div>
      <div className="book-meta">
        {book.authors.length
          ? book.authors.map((author, index) => (
              <span key={author}>
                {index ? ', ' : ''}
                <Link href={`/autor/${encodeURIComponent(author)}`}>{author}</Link>
              </span>
            ))
          : 'Autor desconhecido'}
        {book.publishedYear ? ` · ${book.publishedYear}` : ''}
      </div>

      {open && <AddBookModal book={book} onClose={() => setOpen(false)} />}
    </article>
  );
}
