import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

type LibraryRow = {
  status: 'read' | 'reading' | 'want'
  read_count: number | null
  rating: number | null
  book: {
    title?: string
    authors?: string[]
    genres?: string[]
    country?: string
    language?: string
    publicationYear?: number
    publisher?: string
  } | null
}

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
  error?: {
    message?: string
    code?: string | number
  }
}

function getAssistantText(payload: OpenRouterResponse): string {
  const content = payload.choices?.[0]?.message?.content

  if (typeof content === 'string') return content.trim()

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === 'text' ? part.text ?? '' : ''))
      .join('')
      .trim()
  }

  return ''
}

export async function POST() {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://books-gamma-woad.vercel.app'

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Adicione OPENROUTER_API_KEY nas variáveis de ambiente da Vercel.' },
      { status: 500 },
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          // A rota apenas lê a sessão existente.
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Faça login para receber recomendações.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('library_items')
    .select('status,read_count,rating,book')
    .eq('user_id', user.id)
    .limit(250)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const profile = ((data ?? []) as LibraryRow[])
    .filter((item) => item.book?.title)
    .map((item) => ({
      titulo: item.book?.title,
      autores: item.book?.authors ?? [],
      generos: item.book?.genres ?? [],
      pais: item.book?.country ?? null,
      idioma: item.book?.language ?? null,
      ano: item.book?.publicationYear ?? null,
      editora: item.book?.publisher ?? null,
      nota: item.rating,
      status: item.status,
      releituras: Math.max(item.read_count ?? 1, 1),
    }))

  if (!profile.length) {
    return NextResponse.json(
      { error: 'Adicione alguns livros à biblioteca antes de pedir uma recomendação.' },
      { status: 400 },
    )
  }

  const prompt = `Você é o assistente literário do aplicativo Minha Estante.
Analise a biblioteca do usuário e recomende exatamente 3 próximos livros.

Regras:
- Não recomende nenhum título que já esteja presente na biblioteca.
- Dê mais peso aos livros avaliados com 4 ou 5 estrelas.
- Considere autores, gêneros, países, idiomas e editoras recorrentes.
- A primeira recomendação deve ser a mais segura.
- A segunda deve explorar um autor ou gênero próximo ao gosto do usuário.
- A terceira deve ser uma escolha um pouco diferente, mas ainda justificável.
- Responda em português do Brasil.
- Para cada recomendação, escreva: título, autor e uma justificativa curta de até 2 frases.
- Não invente que um livro está disponível gratuitamente ou no catálogo do aplicativo.

Biblioteca do usuário:
${JSON.stringify(profile)}`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': siteUrl,
      'X-OpenRouter-Title': 'Minha Estante',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Você é um bibliotecário experiente, cuidadoso com fatos e especializado em recomendações personalizadas.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.65,
      max_tokens: 800,
    }),
    cache: 'no-store',
  })

  let payload: OpenRouterResponse
  try {
    payload = (await response.json()) as OpenRouterResponse
  } catch {
    return NextResponse.json(
      { error: 'A OpenRouter retornou uma resposta inválida. Tente novamente.' },
      { status: 502 },
    )
  }

  if (!response.ok) {
    const message = payload.error?.message || `OpenRouter indisponível (HTTP ${response.status}).`
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const recommendation = getAssistantText(payload)
  if (!recommendation) {
    return NextResponse.json(
      { error: 'A IA não retornou uma recomendação. Tente novamente em instantes.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ recommendation, model })
}
