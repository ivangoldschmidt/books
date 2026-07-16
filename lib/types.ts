export type ShelfStatus = 'read' | 'reading' | 'want';

export type BookSource = 'google' | 'openlibrary' | 'gutendex' | 'internetarchive' | 'loc' | 'manual';

export type Book = {
  id: string;
  source: BookSource;
  sourceId: string;
  googleVolumeId?: string;
  title: string;
  originalTitle?: string;
  authors: string[];
  description: string;
  originalDescription?: string;
  coverUrl?: string;
  publishedYear?: string;
  language?: string;
  originalLanguage?: string;
  isbn?: string;
  previewUrl?: string;
  embeddable?: boolean;
  genres?: string[];
  originalGenres?: string[];
  authorCountries?: string[];
  originalAuthorCountries?: string[];
  publisher?: string;
  originalPublisher?: string;
  series?: string;
  originalSeries?: string;
  translatedToPortuguese?: boolean;
  aiEnriched?: boolean;
};

export type LibraryItem = {
  id: string;
  user_id: string;
  book_key: string;
  status: ShelfStatus;
  read_count: number;
  rating: number | null;
  is_favorite: boolean;
  book: Book;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};
