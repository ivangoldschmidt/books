export type ShelfStatus = 'read' | 'reading' | 'want';

export type Book = {
  id: string;
  source: 'google' | 'openlibrary' | 'gutendex' | 'internetarchive';
  sourceId: string;
  googleVolumeId?: string;
  title: string;
  authors: string[];
  description: string;
  coverUrl?: string;
  publishedYear?: string;
  language?: string;
  isbn?: string;
  previewUrl?: string;
  embeddable?: boolean;
};

export type LibraryItem = {
  id: string;
  user_id: string;
  book_key: string;
  status: ShelfStatus;
  read_count: number;
  book: Book;
  created_at: string;
  updated_at: string;
};
