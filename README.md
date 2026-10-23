# Minha Biblioteca — livros, filmes e séries

Aplicação única (Next.js + Supabase) com seleção inicial de seções e navegação contextual. Toda a interface nova está em **português do Brasil**.

**Para publicar, leia primeiro [GUIA-ATUALIZACAO-V3.md](./GUIA-ATUALIZACAO-V3.md).**

A atualização usa o **mesmo repositório, a mesma Vercel e o mesmo Supabase**. Execute apenas `supabase/migration-v3-livros-cinema.sql` no banco existente, depois faça upload dos arquivos para o GitHub. Nunca publique seu `.env.local`.

## Funções

**Livros:** busca, adição manual, estante, estados, favoritos, notas, comentários privados, histórico, dashboard, recomendações por IA, compartilhamento entre contas e caixa de recebidos.

**Filmes & Séries:** busca TMDB, adição manual, biblioteca, estados Para assistir/Assistindo/Assistido, favoritos, notas, comentários privados, dashboard, informações sobre direção/criação, elenco, sinopse e temporadas, análise e recomendações por IA, compartilhamento entre contas e recebidos.

A interface muda a navegação no cabeçalho conforme a seção selecionada. Livros permanecem em `library_items`, mídia em `media_library_items`.

## Desenvolvimento local

```sh
npm ci
cp .env.example .env.local
# Defina as variáveis indicadas em .env.local
npm run dev
```

A IA depende de chave OpenRouter válida no servidor. A API de cinema utiliza o TMDB e suas condições de uso e atribuição.
