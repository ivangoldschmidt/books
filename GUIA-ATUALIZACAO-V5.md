# Minha Biblioteca V5 — Cinema compartilhado e sugestões TMDB

## Mudanças

- A biblioteca compartilhada tem cartões com pôster, sinopse breve, tipo, ano, avaliação TMDB e status; acesso à página de detalhes (inclusive provedores no Brasil).
- Filtros por status, tipo e título, escolha da lista, convite e pesquisa de novos títulos.
- Recomendações na biblioteca pessoal e em cada lista compartilhada com endpoints TMDB `/recommendations` e `/similar`.
- Exclui títulos que já estejam na coleção usada como referência.
- Cada coleção gera sugestões de forma independente. Não utiliza IA nem acessa comentários pessoais para sugerir filmes.
- Livros não foram alterados. Não há migração SQL nova.

## Publicação

1. Faça backup do código/guarde o último commit funcional.
2. Extraia o ZIP e envie seu conteúdo ao mesmo repositório GitHub na branch usada pela Vercel.
3. Mantenha as variáveis de ambiente existentes (`TMDB_API_READ_ACCESS_TOKEN` e Supabase).
4. Verifique o build na Vercel. Se houver erro, envie os logs.
5. Confirme com as duas contas que as listas compartilhadas e seus títulos só são visíveis aos participantes autorizados; isso depende das políticas RLS da migração V4.
6. Abra `/cinema/biblioteca` e `/cinema/compartilhada` para testar sugestões e cartões.

## Limitações

- Recomendação depende dos resultados e da disponibilidade da API TMDB; listas pequenas podem produzir poucas sugestões.
- A API de sugestões requer login e aplica a filtragem de acesso do Supabase.
- O projeto usa imagens do TMDB; consulte os termos e atribuição TMDB/JustWatch conforme aplicável.
- Os pacotes Next/React não estavam completamente instalados no ambiente de elaboração, então a compilação de produção não pôde ser executada aqui. Foram verificadas as sintaxes TypeScript/TSX.
