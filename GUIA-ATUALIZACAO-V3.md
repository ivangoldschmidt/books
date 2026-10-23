# Minha Biblioteca V3 — instalação no mesmo GitHub e Vercel

Este ZIP é **o projeto completo**, pronto para substituir o código-fonte do projeto atual no **mesmo repositório**. NÃO é um segundo aplicativo nem requer outra base de dados. A migração foi elaborada para preservar seus livros e filmes já salvos.

## Ordem segura (obrigatória)

1. **Backup:** no Supabase faça uma exportação/cópia de segurança da base de dados. Salve também um snapshot ou tag do commit do GitHub antes de atualizar.
2. **Supabase:** abra **o mesmo projeto** que o site atual utiliza, entre em **SQL Editor → New query** e execute o conteúdo INTEIRO de **`supabase/migration-v3-livros-cinema.sql`**. A migração é adicional: acrescenta `private_comment` aos livros, cria `book_shares` e `send_book_share`, ativa/garante políticas RLS de livros e acrescenta o estado `watching` aos filmes. **Não execute `schema.sql` nem `cinema-schema.sql` de novo.**
3. **GitHub:** extraia este ZIP. Envie o conteúdo da pasta raiz, incluindo `app`, `components`, `lib`, `supabase`, `package.json` e `package-lock.json`, para o **mesmo repositório** do site. Substitua arquivos que já existirem e inclua as pastas novas.
4. **Vercel:** o deploy geralmente dispara automaticamente ao atualizar o branch conectado. No painel verifique se fica **READY**. Mantenha as mesmas variáveis de ambiente já configuradas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `TMDB_API_READ_ACCESS_TOKEN` (ou `TMDB_API_KEY`)
   - `OPENROUTER_API_KEY` (**necessária para a IA de livros e de filmes/séries**)
   - `OPENROUTER_MODEL` (opcional, caso já use um modelo específico)
5. **Teste com as duas contas** após o deploy. Comece por testar o login, a estante e os filmes que já estavam salvos. Depois teste livros recebidos e IA de cinema.

## Como navegar

- `/`: página inicial com escolha visual entre **Livros** e **Filmes & Séries** (no computador, passar o mouse sobre um painel escurece o outro).
- `/livros`: início da seção de livros; menu contextual com Buscar, Adicionar, Estante, Dashboard, IA e Recebidos.
- `/cinema`: início da seção de cinema; menu contextual com Buscar, Adicionar, Biblioteca, Dashboard, IA e Recebidos.
- O seletor no topo alterna diretamente as duas seções. Livros e filmes **não compartilham coleções ou recomendações**.
- `app/cinema/detalhes/[type]/[id]`: sinopse, direção/criação, elenco, gêneros, duração, temporadas, favoritos, status, nota, comentários privados, compartilhamento e análise por IA.
- `app/livros/partilhados`: livros enviados pela outra conta (mesma lógica dos filmes).

## Privacidade e dados

- Livros continuam em `public.library_items`.
- Filmes e séries continuam em `public.media_library_items` e seus compartilhamentos em `public.media_shares`.
- Livros compartilhados passam a usar `public.book_shares`. O destinatário recebe somente metadados do livro; comentários e notas privadas ficam fora.
- Comentários privados são acessíveis apenas ao dono da linha pela política RLS. Não use chaves `service_role` em variáveis públicas ou no navegador.
- A função de IA de cinema chama OpenRouter do lado do servidor, usando `OPENROUTER_API_KEY` já existente para os livros. Nunca envie esta chave para o GitHub.
- A pesquisa e os cartazes dos filmes são fornecidos pelo TMDB. A IA pode errar e não substitui as informações da fonte.

## Testes após a publicação

- Na página inicial, confirme os dois painéis e o hover. Abra Livros e verifique que todos os links mostram funções de livros; clique em Filmes & Séries no topo e confirme que mudaram para rotas `/cinema`.
- Confira que a estante atual, autores, favoritos e dashboard de livros continuam com os mesmos dados.
- Em livros, escreva um comentário privado e compartilhe um título com a segunda conta. Entre nessa conta, abra **Recebidos** e adicione-o à estante. Confirme que o comentário não aparece.
- Em cinema, pesquise um filme, abra **Ver detalhes**, confira criadores, sinopse e elenco, salve-o e teste **IA** e **Dashboard**.
- Teste o estado **Assistindo** no cinema (inclusão feita nesta migração) e o cadastro manual de série.
- Se um recurso de IA falhar, verifique se `OPENROUTER_API_KEY` está definida na Vercel e se o modelo configurado aceita a solicitação.

## Limitações conhecidas

- O ZIP foi verificado quanto à sintaxe de TS/TSX, rotas e estrutura, mas **não foi possível completar `npm ci` nem uma compilação Next.js no ambiente de geração**. Portanto, é preciso confirmar o build e o teste com contas reais no deploy da Vercel.
- A contagem de horas do dashboard de cinema estima somente os filmes assistidos cuja duração tenha sido registrada no snapshot; séries não entram nessa soma.
- O histórico antigo do TMDB pode ter snapshots sem dados de diretor/elenco. Abrir **Ver detalhes** atualiza a exibição a partir da API e permite salvar metadados mais recentes.
- A seção de filmes pode cadastrar títulos manualmente. IDs manuais são negativos e não têm ligação com páginas do TMDB.
