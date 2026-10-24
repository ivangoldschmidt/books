# Minha Biblioteca V4 — Atualização de Filmes & Séries

## Alterações
- **Livros não foram alterados:** preservadas rotas, componentes de livros e identidade vermelha.
- **Cinema:** tema verde (#387a55), com vinho/vermelho (#761f35) como acento secundário.
- **Listas compartilhadas:** crie lista, convide um usuário já cadastrado por e-mail, ambos podem adicionar/remover títulos e mudar status. Não compartilha avaliações/comentários privados.
- **Onde assistir no Brasil:** fonte TMDB/JustWatch, agrupada em streaming, grátis, anúncios, aluguel e compra; remete ao TMDB para links de plataformas.
- **Top 10:** tendências da semana e popularidade atual no TMDB, separadas por filme/série. **Não é Top 10 Brasil nem ranking mensal/anual histórico.** Para histórico mensal/anual verdadeiro precisamos armazenar rankings periodicamente com cron e criar métricas próprias ou integrar uma fonte licenciada.

## Migração segura
1. Faça backup do Supabase e guarde um commit de rollback.
2. Execute APENAS `supabase/migration-v4-cinema-shared-lists.sql` no SQL Editor do projeto existente. É aditiva, sem modificar tabelas dos livros.
3. Suba o código deste ZIP ao **mesmo repositório** no GitHub. Mantenha as variáveis Vercel existentes, incluindo `TMDB_API_READ_ACCESS_TOKEN`.
4. Aguarde a Vercel concluir o novo build. Não altere variáveis do Supabase.
5. Faça login com ambas contas; crie lista em `/cinema/compartilhada`, convide a segunda conta (e-mail já registrado), acesse com essa conta, adicione título e mude status. Confirme que os comentários privados não aparecem nela.
6. Teste `/cinema` e `/cinema/detalhes/movie/157336` para tendência e provedores. Confirme que `Livros` ainda mostra a aparência original.

## Limites e cuidados
- Código não recebeu teste end-to-end com as duas contas ou dados reais.
- A compilação completa não pôde ser concluída no ambiente de empacotamento por impossibilidade de instalar dependências a tempo. Revise logs Vercel e só declare produção estável após `READY` e testes.
- Só o proprietário pode convidar usuários; participantes da lista têm permissão para alterar estados da lista conjunta.
- TMDB/JustWatch não garante disponibilidade em tempo real; a disponibilidade pode mudar.
- Se migrar o Supabase e precisar reverter o deploy, as tabelas novas podem permanecer sem interferir nos livros.
