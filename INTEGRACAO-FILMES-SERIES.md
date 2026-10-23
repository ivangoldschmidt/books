# Atualização segura: Filmes & Séries dentro da Minha Estante

Esta versão mantém a área de livros na mesma aplicação e adiciona uma secção própria em `/cinema`.

## Aplicar no repositório existente

1. Faça download e extraia `minha-estante-com-filmes-series.zip`.
2. Copie os ficheiros para o seu repositório atual, preservando `.env.local` e quaisquer credenciais locais que não estão incluídas neste ZIP.
3. Verifique o diff antes de fazer commit. As mudanças de aplicação são aditivas: links de navegação, rotas `/cinema`, endpoint `/api/cinema/search`, tipos e estilos novos.
4. No Supabase que já usa a Minha Estante, execute somente `supabase/cinema-schema.sql`. Não é necessário voltar a executar `supabase/schema.sql` para ativar o cinema e não deve apagar tabelas.
5. Configure `TMDB_API_READ_ACCESS_TOKEN` na Vercel e faça redeploy.

## Isolamento dos dados

- Os livros continuam em `public.library_items`.
- Filmes e séries ficam em `public.media_library_items`.
- Partilhas ficam em `public.media_shares`.
- A nota privada fica apenas na entrada pessoal do utilizador; o conteúdo enviado numa partilha não inclui a nota.
- As duas tabelas novas têm RLS ativado. A função de partilha procura a conta destinatária pelo e-mail e não permite enviar para a própria conta.

## Rotas novas

- `/cinema` — resumo e entrada da nova secção.
- `/cinema/pesquisar` — pesquisa e adição de títulos.
- `/cinema/biblioteca` — estados, favoritos, notas privadas e avaliação.
- `/cinema/partilhados` — caixa de entrada de títulos recebidos.

A build completa não foi confirmada neste ambiente porque a instalação npm excedeu o tempo limite e não havia dependências em cache. A sintaxe TypeScript/TSX dos ficheiros foi validada; antes da publicação, execute `npm ci` e `npm run build` no ambiente do projeto.
