'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { Book } from '@/lib/types';
import { AddBookModal } from './AddBookModal';
import { useState } from 'react';

export function BookCard({
  book,
  readCount,
  showAddButton = true,
}: {
  book: Book;
  readCount?: number;
  showAddButton?: boolean;
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

        {showAddButton && (
          <button
            className="add-btn"
            onClick={() => setOpen(true)}
            aria-label="Adicionar à biblioteca"
          >
            <Plus />
          </button>
        )}
      </div>

      <div className="book-title" title={book.title}>
        {book.title}
      </div>
      <div className="book-meta">
        {book.authors.length ? book.authors.map((a,i)=><span key={a}>{i?', ':''}<Link href={`/autor/${encodeURIComponent(a)}`}>{a}</Link></span>) : 'Autor desconhecido'}
        {book.publishedYear ? ` · ${book.publishedYear}` : ''}
      </div>

      {open && <AddBookModal book={book} onClose={() => setOpen(false)} />}
    </article>
  );
}
