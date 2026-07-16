# Minha Estante v2

Biblioteca pessoal responsiva em Next.js 15, Supabase, Google Books/Open Library/Gutendex/Internet Archive e recomendações com OpenRouter.

## Recursos
- Login Google e e-mail/senha.
- Já li, Lendo agora e Quero ler.
- Categorias personalizadas ilimitadas.
- Agrupamento automático por autor, gênero, país do autor, idioma, ano, série e editora.
- Notas de 1 a 5 estrelas, releituras e remoção.
- Página de autor, histórico, dashboard, perfil e “Minha biblioteca em números”.
- IA para sugerir os próximos livros.
- Dark/light e layout desktop/mobile.

## 1. Supabase
Crie um projeto e execute **todo** o arquivo `supabase/schema.sql` no SQL Editor. Ele é idempotente e também atualiza uma instalação anterior.

Em Authentication habilite Email e Google. No Google Cloud, a redirect URI deve ser:
`https://SEU-PROJETO.supabase.co/auth/v1/callback`

No Supabase > Authentication > URL Configuration:
- Site URL: seu domínio principal da Vercel
- Redirect URL: `https://seu-dominio.vercel.app/auth/callback`

## 2. Variáveis na Vercel
Cadastre em Settings > Environment Variables (Production, Preview e Development):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://seu-dominio.vercel.app
GOOGLE_BOOKS_API_KEY=...
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openrouter/free
```
Crie a chave em OpenRouter e adicione-a somente nas variáveis de ambiente da Vercel. O projeto usa `openrouter/free` por padrão, que encaminha a solicitação a um modelo gratuito disponível. Para fixar outro modelo, altere `OPENROUTER_MODEL` na Vercel, sem modificar o código.

## 3. GitHub/Vercel
Envie o conteúdo da pasta para um repositório, importe na Vercel e faça Deploy. Depois de alterar variáveis, faça Redeploy sem cache.

## Observações de dados
As APIs nem sempre fornecem país do autor, gênero, série ou editora. Nesses casos o agrupamento usa “Não informado”. Novos livros pesquisados pelo Google Books costumam possuir metadados mais completos.

## Local
```
npm install
npm run dev
npm run build
```

## Atualização: favoritos e remoção de categorias

Depois de atualizar os arquivos, execute novamente `supabase/schema.sql` no SQL Editor do Supabase. O script adiciona a coluna `is_favorite` sem apagar os livros existentes.

- Favoritos fica sempre visível na biblioteca.
- Clique no coração da capa para adicionar ou remover um livro dos favoritos.
- As categorias criadas ficam visíveis como botões.
- Clique no `×` da categoria para excluí-la. A exclusão da categoria não remove os livros.
