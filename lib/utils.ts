import type { Book } from './types';

export const shelfLabels = {
  read: 'Já li',
  reading: 'Lendo agora',
  want: 'Quero ler'
} as const;

export function bookKey(book: Book) {
  return `${book.source}:${book.sourceId}`;
}

export function safeDescription(value?: string | null) {
  if (!value) return 'Descrição não disponível.';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
