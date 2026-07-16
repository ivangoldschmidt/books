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

export async function POST(req: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return NextResponse.json({ error: 'OPENROUTER_API_KEY não configurada.' }, { status: 500 });

  const body = await req.json().catch(() => null) as { book?: Book } | null;
  if (!body?.book) return NextResponse.json({ error: 'Livro não informado.' }, { status: 400 });

  const book = body.book;
  const prompt = `Traduza e complete os metadados bibliográficos abaixo para português do Brasil.
COMANDOS OBRIGATÓRIOS:
- Responda APENAS com JSON válido, sem markdown e sem comentários.
- Traduza título, descrição, gêneros, idioma, país e nome de série para português.
- NÃO traduza nomes próprios: autores, pessoas, editoras, instituições, cidades e marcas.
- Preserve o título original em originalTitle quando o título traduzido for diferente.
- Open Library frequentemente envia descrição genérica ou inválida; trate "Descrição não disponível", "Abra o livro" e textos semelhantes como campo vazio.
- Complete campos ausentes usando fatos bibliográficos conhecidos. Não invente. Quando não houver segurança, use null ou [].
- Mantenha ISBN sem alterar.
- Descrição deve ser objetiva, natural, sem spoilers e em português.
- Se o título já estiver em português, mantenha-o.

Retorne exatamente estas chaves:
{"title":"","originalTitle":null,"authors":[],"description":"","publishedYear":null,"language":"Português","originalLanguage":null,"isbn":null,"genres":[],"authorCountries":[],"publisher":null,"series":null}

DADOS:
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
      temperature: 0.1,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `OpenRouter respondeu ${response.status}.`;
    return NextResponse.json({ error: message }, { status: response.status });
  }

  try {
    const parsed = extractJson(data?.choices?.[0]?.message?.content || '');
    const enriched: Book = {
      ...book,
      title: String(parsed.title || book.title).trim(),
      originalTitle: parsed.originalTitle ? String(parsed.originalTitle).trim() : (book.originalTitle || (parsed.title && parsed.title !== book.title ? book.title : undefined)),
      authors: list(parsed.authors).length ? list(parsed.authors) : book.authors,
      description: String(parsed.description || book.description || 'Descrição não disponível.').trim(),
      publishedYear: parsed.publishedYear ? String(parsed.publishedYear).trim() : book.publishedYear,
      language: String(parsed.language || 'Português').trim(),
      originalLanguage: parsed.originalLanguage ? String(parsed.originalLanguage).trim() : (book.originalLanguage || book.language),
      isbn: parsed.isbn ? String(parsed.isbn).trim() : book.isbn,
      genres: list(parsed.genres).length ? list(parsed.genres) : (book.genres || []),
      authorCountries: list(parsed.authorCountries).length ? list(parsed.authorCountries) : (book.authorCountries || []),
      publisher: parsed.publisher ? String(parsed.publisher).trim() : book.publisher,
      series: parsed.series ? String(parsed.series).trim() : book.series,
      translatedToPortuguese: true,
      aiEnriched: true,
    };
    return NextResponse.json({ book: enriched });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Resposta inválida da IA.' }, { status: 502 });
  }
}
