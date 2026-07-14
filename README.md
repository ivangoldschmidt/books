# Minha Estante

Web app responsivo de biblioteca pessoal com visual inspirado nas imagens de referência, usando bordô no lugar do laranja/salmão.

## Recursos

- Login por Google ou e-mail/senha com Supabase Auth.
- Estantes **Já li**, **Lendo agora** e **Quero ler**.
- Contadores clicáveis no overview, abrindo a biblioteca já filtrada.
- Busca agregada com uma única tentativa em cada fonte: Google Books, Open Library, Gutendex e Internet Archive.
- Capa, título, autor, descrição, ano, idioma e link da fonte quando disponíveis.
- Clique na capa para abrir os detalhes; clique no botão `+` para escolher a estante.
- Google Books Embedded Viewer para volumes com prévia incorporável.
- Contador “Li novamente”; a capa recebe tag apenas a partir da segunda leitura.
- Temas claro e escuro e layout responsivo para desktop e smartphone.

## 1. Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor, cole e execute `supabase/schema.sql`.
3. Em **Authentication > Providers**, ative Email e Google.
4. No Google Cloud, configure as credenciais OAuth e use a URL de callback mostrada pelo Supabase.
5. Em **Authentication > URL Configuration**, adicione:
   - `http://localhost:3000/auth/callback`
   - `https://SEU-DOMINIO.vercel.app/auth/callback`

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
GOOGLE_BOOKS_API_KEY=SUA_CHAVE_OPCIONAL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

A chave do Google Books é opcional, mas recomendada para cota mais previsível.

## 3. Rodar localmente

```bash
npm install
npm run dev
```

## 4. Publicar

Envie a pasta ao GitHub, importe o repositório na Vercel e cadastre as mesmas variáveis de ambiente. O preset Next.js é detectado automaticamente.

## Observações

“Todas as APIs disponíveis” não é um conjunto finito. Este projeto já integra quatro fontes públicas relevantes e isolou os adaptadores em `app/api/books/search/route.ts`, facilitando acrescentar outras. Cada busca faz no máximo uma requisição por fonte e combina/deduplica os resultados.
