export type MediaType = 'movie' | 'tv';
export type MediaStatus = 'want' | 'watched';

export type MediaRecord = {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  releaseDate?: string;
  year?: string;
  voteAverage?: number | null;
  genreIds?: number[];
};

export type MediaLibraryItem = {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  status: MediaStatus;
  is_favorite: boolean;
  rating: number | null;
  private_comment: string;
  media: MediaRecord;
  watched_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaShare = {
  id: string;
  sender_id: string;
  recipient_id: string;
  media: MediaRecord;
  message: string;
  status: 'pending' | 'added' | 'dismissed';
  created_at: string;
};
