import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

type Mode = 'general' | 'authors' | 'books' | 'free';
type LibraryRow = {
  id: string;
  status: 'read' | 'reading' | 'want';
  read_count: number | null;
  rating: number | null;
  book: {
    title?: string;
    authors?: string[];
    genres?: string[];
    authorCountries?: string[];
    language?: string;
    publishedYear?: string;
    publisher?: string;
  } | null;
};
type OpenRouterResponse = { choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>; error?: { message?: string } };

function assistantText(payload: OpenRouterResponse) {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  return Array.isArray(content) ? content.map(part => part.type === 'text' ? part.text || '' : '').join('').trim() : '';
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Adicione OPENROUTER_API_KEY nas variáveis da Vercel.' }, { status: 500 });

  let body: { mode?: Mode; selected?: string[]; freeText?: string } = {};
  try { body = await request.json(); } catch { /* usa padrão */ }
  const mode: Mode = body.mode || 'general';
  const selected = Array.isArray(body.selected) ? body.selected : [];
  const freeText = String(body.freeText || '').trim();

  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => undefined },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para receber recomendações.' }, { status: 401 });

  const { data, error } = await supabase.from('library_items').select('id,status,read_count,rating,book').eq('user_id', user.id).limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data || []) as LibraryRow[];
  if (!rows.length) return NextResponse.json({ error: 'Adicione alguns livros antes de pedir uma recomendação.' }, { status: 400 });

  const profile = rows.filter(row => row.book?.title).map(row => ({
    id: row.id,
    titulo: row.book?.title,
    autores: row.book?.authors || [],
    generos: row.book?.genres || [],
    paises: row.book?.authorCountries || [],
    idioma: row.book?.language || null,
    ano: row.book?.publishedYear || null,
    editora: row.book?.publisher || null,
    nota: row.rating,
    status: row.status,
    vezesLido: Math.max(row.read_count || 1, 1),
  }));

  let focus = 'Use o perfil completo da biblioteca e dê peso maior aos livros com 4 ou 5 estrelas.';
  if (mode === 'authors') focus = `O usuário quer mudar ou refinar o gosto com base especificamente nestes autores: ${selected.join(', ')}. Compare esse foco com o restante do histórico.`;
  if (mode === 'books') {
    const chosen = profile.filter(book => selected.includes(book.id));
    focus = `Baseie a recomendação principalmente nestes livros escolhidos pelo usuário: ${JSON.stringify(chosen)}.`;
  }
  if (mode === 'free') focus = `Atenda a este pedido livre e procure títulos adequados usando seu conhecimento literário: ${freeText}`;

  const prompt = `Você é o assistente literário do aplicativo Minha Estante. Recomende exatamente 3 livros que não estejam na biblioteca.
${focus}
Regras:
- Responda em português do Brasil.
- Para cada opção, informe título, autor e justificativa curta.
- A primeira é a opção mais segura; a segunda explora algo próximo; a terceira pode renovar o gosto.
- Não invente disponibilidade, preço ou acesso gratuito.
- Quando o pedido for livre, você pode sugerir obras fora dos padrões anteriores.
Biblioteca: ${JSON.stringify(profile)}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://books-gamma-woad.vercel.app',
      'X-OpenRouter-Title': 'Minha Estante',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openrouter/free',
      messages: [
        { role: 'system', content: 'Você é um bibliotecário experiente, cuidadoso com fatos e recomendações personalizadas.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 900,
    }),
    cache: 'no-store',
  });

  let payload: OpenRouterResponse;
  try { payload = await response.json() as OpenRouterResponse; }
  catch { return NextResponse.json({ error: 'A OpenRouter retornou uma resposta inválida.' }, { status: 502 }); }
  if (!response.ok) return NextResponse.json({ error: payload.error?.message || `OpenRouter indisponível (HTTP ${response.status}).` }, { status: 502 });
  const recommendation = assistantText(payload);
  if (!recommendation) return NextResponse.json({ error: 'A IA não retornou uma recomendação.' }, { status: 502 });
  return NextResponse.json({ recommendation });
}
