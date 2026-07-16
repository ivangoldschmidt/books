import { NextRequest, NextResponse } from 'next/server';
import type { Book } from '@/lib/types';

const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

function extractJson(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('A IA não retornou dados estruturados.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(v => String(v).trim()).filter(Boolean);
}

function invalidDescription(value?: string) {
  const text = String(value || '').trim().toLowerCase();
  return !text || text.includes('descrição não disponível') || text.includes('abra o livro') || text.includes('open the book') || text.length < 40;
}

export async function POST(req: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return NextResponse.json({ error: 'OPENROUTER_API_KEY não configurada.' }, { status: 500 });

  const body = await req.json().catch(() => null) as { book?: Book } | null;
  if (!body?.book) return NextResponse.json({ error: 'Livro não informado.' }, { status: 400 });

  const book = body.book;
  const original = {
    title: book.originalTitle || book.title,
    description: book.originalDescription || (invalidDescription(book.description) ? '' : book.description),
    genres: book.originalGenres || book.genres || [],
    authorCountries: book.originalAuthorCountries || book.authorCountries || [],
    publisher: book.originalPublisher || book.publisher || null,
    series: book.originalSeries || book.series || null,
    language: book.originalLanguage || book.language || null,
  };

  const prompt = `Você é um bibliotecário especialista. Analise, complete e traduza estes metadados para português do Brasil.

REGRAS OBRIGATÓRIAS:
- Responda SOMENTE com JSON válido, sem markdown, comentários ou texto fora do JSON.
- Produza uma descrição factual, natural, clara e sem spoilers, com 90 a 180 palavras. A descrição NUNCA pode ficar vazia e nunca pode dizer "descrição não disponível".
- Traduza título, descrição, gêneros, idioma, país e nome de série para português.
- NÃO traduza nomes próprios: autores, pessoas, editoras, instituições, cidades, marcas e ISBN.
- Complete autor, descrição, ano, idioma, ISBN, gêneros, países dos autores, editora e série usando conhecimento bibliográfico confiável.
- Se um campo não puder ser confirmado com segurança, use null ou [], exceto descrição, que deve sempre ser preenchida com uma sinopse factual.
- Preserve o título original.
- Se o título já estiver em português, mantenha-o.
- Não invente prêmios, personagens ou acontecimentos.

Retorne exatamente:
{"title":"","originalTitle":"","authors":[],"description":"","publishedYear":null,"language":"Português","originalLanguage":null,"isbn":null,"genres":[],"authorCountries":[],"publisher":null,"series":null}

METADADOS RECEBIDOS:
${JSON.stringify(book)}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://minha-estante.vercel.app',
      'X-Title': 'Minha Estante',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.05,
      max_tokens: 1800,
    }),
    signal: AbortSignal.timeout(45000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `OpenRouter respondeu ${response.status}.`;
    return NextResponse.json({ error: message }, { status: response.status });
  }

  try {
    const parsed = extractJson(data?.choices?.[0]?.message?.content || '');
    const description = String(parsed.description || '').trim();
    if (invalidDescription(description)) throw new Error('A IA não conseguiu produzir uma descrição completa. Tente novamente.');

    const enriched: Book = {
      ...book,
      title: String(parsed.title || book.title).trim(),
      originalTitle: String(parsed.originalTitle || original.title).trim(),
      authors: list(parsed.authors).length ? list(parsed.authors) : book.authors,
      description,
      originalDescription: original.description || undefined,
      publishedYear: parsed.publishedYear ? String(parsed.publishedYear).trim() : book.publishedYear,
      language: String(parsed.language || 'Português').trim(),
      originalLanguage: parsed.originalLanguage ? String(parsed.originalLanguage).trim() : (original.language || undefined),
      isbn: parsed.isbn ? String(parsed.isbn).trim() : book.isbn,
      genres: list(parsed.genres),
      originalGenres: original.genres,
      authorCountries: list(parsed.authorCountries),
      originalAuthorCountries: original.authorCountries,
      publisher: parsed.publisher ? String(parsed.publisher).trim() : book.publisher,
      originalPublisher: original.publisher || undefined,
      series: parsed.series ? String(parsed.series).trim() : book.series,
      originalSeries: original.series || undefined,
      translatedToPortuguese: true,
      aiEnriched: true,
    };
    return NextResponse.json({ book: enriched });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Resposta inválida da IA.' }, { status: 502 });
  }
}
