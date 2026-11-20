# Integração autenticada de vídeos new-only

## Implementação e limites
- Review Studio normal do projeto contém vídeos novos e vídeos já guardados. Uploads canónicos, seleção de versão, player HLS privado, comentários da equipe, aprovação interna/pública, links novos/revogação e retirada não destrutiva. Gestão de armazenamento lista ambos os grupos sem projetar objetos privados no legado; quota exibida soma bytes antigos+privados uma vez.
- RPCs cliente 0015 service-only usam identidade verificada e projects.edit do workspace; membros ativos leem/comentam, só editores gerem/aprovam. Upload novo exige Studio ativo e enrollment. Não alterados preços/limites de plano. Leitores antigos e correções históricas preservados, sem migração nem exclusão de vídeos antigos.
- Nova versão é um registro canónico novo: **substituição/corrigido dentro do mesmo ID privado não está implementada**; correção de vídeos novos é enviada como nova versão, mantendo versões/comentários anteriores. Sem rotular release integral. Comparação lado-a-lado/thumbnail customizado não integrados nos novos vídeos. Retirada mantém evidência e objetos; não é limpeza física automática.
- Handler final implantado com hash 77dc5e110a7c1bbfc8eedaab278d626878ab17702cf111b17cd1c9da70980ac5. Download assinado de cópia frozen, validação de acesso antes/depois de assinatura e sem exposição de identidade ao lifecycle antigo.

## Verificações antes da publicação
- PostgreSQL descartável: migrações 0012–0014 exatas com substituição de identidades fictícias, mais SQL cliente: guards transacionais, viewer/outsider/Studio, upload/feedback/retirada/revogação, quota concorrente, não-cascata e cleanup externo antigo. 15 grupos passaram, incluindo browser isolado.
- 21 testes de coexistência e 12 routing/client/quota passaram, mais 2 regressões uploader/versões. Deno check final e build supervisionado OK.
- Conta autorizada, workspace sintético: navegação Dashboard→Captação→projeto→Review Studio, envio MP4 real, Stream signed-only, comentário da equipe, link novo, aprovação anónima e leitura de aprovação/comentário após reload. Sem erros de runtime. Apenas fixture foi escrita; o usuário da sessão gerida não foi substituído por uma conta arbitrária.
- Restrição detectada: bucket R2 não autoriza localhost (preflight 403 CORS not configured), mas autoriza https://willflow.app (204/PUT). Ensaio local usa ponte explícita somente no teste, sem mudar CORS; não é prova de transporte no domínio. Publicação requer novo ensaio sem interceptação no domínio antes de ampliar enrollment.
- Leitura legada REAL autorizada pelo mesmo usuário: linha histórica acessível e stream-get-status original HTTP 200/ready; sem escrita/migração. Estado legado permanece 1.694 versões, 948 comentários, 320 aprovações; zero referências privadas em video_versions.
- Scan básico atualizado sem findings; não substitui análise profunda. Duas advertências profundas existentes de destinatários de email continuam abertas, não foram ignoradas/corrigidas nesta tarefa.

## Publicação/ativação
Frontend exige publish separado. Código tem marcador verificável canonical-client-20261120-1 no Review Studio e bundle. Resultado no domínio e enrollment serão adicionados após verificação. Nenhuma pausa, cron ou secret alterado.