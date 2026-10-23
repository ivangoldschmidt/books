import { NextRequest, NextResponse } from 'next/server';

type TmdbResult = {
  id: number;
  media_type?: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  const requestedType = request.nextUrl.searchParams.get('type') || 'multi';
  const type = ['multi', 'movie', 'tv'].includes(requestedType) ? requestedType : 'multi';

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], error: 'Escreva pelo menos 2 caracteres.' }, { status: 400 });
  }
  if (query.length > 120) {
    return NextResponse.json({ results: [], error: 'A pesquisa é demasiado longa.' }, { status: 400 });
  }

  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!token && !apiKey) {
    return NextResponse.json({
      results: [],
      error: 'A pesquisa ainda não está configurada. Adicione TMDB_API_READ_ACCESS_TOKEN nas variáveis de ambiente do projeto.',
    }, { status: 503 });
  }

  const endpoint = new URL(`https://api.themoviedb.org/3/search/${type}`);
  endpoint.searchParams.set('query', query);
  endpoint.searchParams.set('include_adult', 'false');
  endpoint.searchParams.set('language', 'pt-BR');
  endpoint.searchParams.set('page', '1');
  if (!token && apiKey) endpoint.searchParams.set('api_key', apiKey);

  try {
    const response = await fetch(endpoint, {
      headers: token ? { Authorization: `Bearer ${token}`, accept: 'application/json' } : { accept: 'application/json' },
      next: { revalidate: 60 * 10 },
    });
    if (!response.ok) {
      return NextResponse.json({ results: [], error: `O TMDB respondeu com o código ${response.status}. Verifique o token configurado.` }, { status: 502 });
    }
    const payload = await response.json() as { results?: TmdbResult[] };
    const results = (payload.results || [])
      .filter((item) => item.media_type !== 'person' && (type !== 'multi' || item.media_type === 'movie' || item.media_type === 'tv'))
      .map((item) => {
        const mediaType = item.media_type || (type === 'tv' ? 'tv' : 'movie');
        const title = mediaType === 'tv' ? item.name : item.title;
        const originalTitle = mediaType === 'tv' ? item.original_name : item.original_title;
        const releaseDate = mediaType === 'tv' ? item.first_air_date : item.release_date;
        return {
          id: item.id,
          mediaType,
          title: title || originalTitle || 'Sem título',
          originalTitle: originalTitle || title || '',
          overview: item.overview || '',
          posterPath: item.poster_path || null,
          posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
          releaseDate: releaseDate || '',
          year: releaseDate?.slice(0, 4) || '',
          voteAverage: typeof item.vote_average === 'number' ? item.vote_average : null,
          genreIds: item.genre_ids || [],
        };
      });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: 'Não foi possível contactar o TMDB. Tente novamente.' }, { status: 502 });
  }
}
