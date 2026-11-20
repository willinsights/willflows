# Ponto 3 — implementação concreta new-only, 20/11/2026

## Resultado real

**Piloto isolado completo aprovado; piloto produtivo e publicação não executados.** Isto não é uma nova publicação visual de a56f1383 nem conclusão do WillFlow 2.0. Não confundir o MP4/S3/Stream fictício com um upload aceito pelo fornecedor em produção.

Foram implementados, não só descritos:
- `sidecar.sql`: operações/versões, digests de links, comentários, aprovações e identidades held num schema privado. Sem FKs/cascades, sem acesso direto nem para cliente service_role; RPCs exclusivamente service_role. Emissão bloqueada por enrollment vazio por padrão. Nenhuma projeção de novos keys, UIDs ou IDs em `video_versions`.
- `sidecar-upload.ts`: emissão ligada à operação/autor/scope, assinatura temporária, HEAD/tamanho exato antes da persistência, claim permanente, snapshot held, submissão, incerteza não-reclamável e recuperação por uma associação exata. Abort/withdraw sem DELETE externo. Withdrawal de operação incerta recusado.
- `sidecar-handler.ts`: identidade de membro vem de auth verificada, não do corpo; links aleatórios wf2 de 256 bits só guardam SHA-256. Leitura canónica + verificação repetida depois do fornecedor, expiração/revogação, comentários/aprovação idempotentes, respostas no-store sem key/UID/digest/autor.
- `sidecar-runtime.ts`: candidato Deno com auth, CORS em todos os resultados, R2 condicional e Stream signed-only; sem handlers v1 alterados. **Verificação Deno passou; fornecedor real e empacotamento/deploy seletivo não foram executados.** Os imports externos ao diretório precisam ser empacotados para um único novo handler; não copiar este ficheiro isolado para active functions.
- `PrivateVideoApproval.tsx`: leitor novo separado com player partilhado, seleção, comentário/aprovação e renovação periódica. Servido só pelo harness offline, não ligado ao router público nem ao uploader normal.
- `assemble_sidecar.py`: monta expansão contabilística anterior hash-verificada + sidecar + guard do orçamento conjunto + guard antiprojeção. Não usa upload-expand/generation-fence in-place; não pausa, não ativa enrollment e não reconcilia dados por conta própria. Baseline divergente aborta toda a transação.

## Provas executadas

1. **PostgreSQL descartável, socket Unix:** montagem completa reverte numa falha final, baseline divergente aborta sem instalar schema, ACLs service-only, emissão/repetição com contexto exato, oito persistências concorrentes = 10 bytes privados uma vez com 4 legados intactos. UPDATE absoluto legado tardio neutralizado; INSERT legado de 91 bytes recusado quando 10 privados + 4 legados disputam limite 100. Guard recusa a publicação de key/UID/ID canónico em versões antigas. Sem aumento de limite ou adição dupla de extra.
2. Claim/repetição, leitura autorizada, revogação/expiração de link e membership, feedback com oito retries = um comentário, aprovação/readback, withdrawal que retém duas identidades e histórico; incerteza permanente; cascade de parent não remove registo/atividade; rollback preenchido recusa perda de dados.
3. **16 Vitest:** handlers de emissão/processamento/recuperação, perda de resposta e retries, associação ambígua/cross-workspace, leitor sem leaks, revogação/withdraw/parent removido durante assinatura, geração alterada e identidade auth não manipulável. Contraexemplo negativo original continua a apagar novos assets quando estão na tabela antiga. Contraprova com sidecar executa o código real antigo nos três ramos `expired`, `delivered` e `orphan`, repetido: apaga original/replacement legados e pode revogar token legado, mas não vê keys/UIDs, token nem lifecycle privados. Fornecedores fictícios.
4. **Browser desktop/mobile novo, não a página publicada:** candidato UI → candidatos upload/read/feedback → RPCs reais na BD descartável. Upload Unicode, uma cópia simulada, MP4 local reproduzido, dois comentários e uma aprovação lidos de volta, revogação explícita seguida de 403. Projeção antiga vazia para o ID do piloto; sem erros de execução/overflow. Screenshots em `/tmp/browser/sidecar-pilot/`, não artefactos publicados.
5. Deno check do runtime passou; compilação automática mais recente `build OK` 13:47:43 UTC.

## Verificação produtiva somente por leitura

Em produção o schema privado **não está instalado**. Contagens agregadas: 1.694 versões legadas, 948 comentários, 320 aprovações. Uma divergência de contador foi encontrada agora:

- Contador gravado: **92.143.699.665 bytes**.
- Soma lógica das versões ativas incluindo replacement: **16.862.211.040 bytes**.
- Diferença: **75.281.488.625 bytes**.
- Limite contratual total atual: **1.099.511.627.776 bytes**, extras zero; não alterado.

Esta leitura não autoriza afirmar que a diferença é lixo físico nem que os 16.862.211.040 são todos os objetos reais. Não houve normalização a partir desta consulta, alteração de quota, pausa, SQL produtivo, deploy, schedule, envio, DELETE ou publicação. GET do domínio continua com marcador `a56f1383c144d7764ff3de49736c62184c27dd93`. Uploads normais continuam no contrato anterior.

## O que falta para piloto produtivo — operações precisas

1. Fechar reconciliação individual/fingerprint **ATUAL sob lock** e compatibilidade dos escritores de capacidade/status, confirmar que a diferença tem explicação demonstrada; montar preflight identity/ownership + expansão contabilística + orçamento conjunto numa transação limitada. O bundle atual recusa o baseline produtivo; não executar a mutação de -75.281.488.625 bytes às cegas. Nenhum timestamp global do gateway é condição.
2. Empacotar/deploy do endpoint **novo**, com dependências locais, autenticação e assinador; ensaiar condição frozen-copy e signed-only no fornecedor real com fixture estritamente segregada e permanentemente identificada. A simulação não comprova essas capacidades. Não alterar endpoints v1 nem crons de limpeza antigos.
3. Ligar upload privado e leitor novo à navegação publicada de forma seletiva por enrollment privado; a página candidata não é um router já integrado. Confirmar lista de versões, quota combinada e renovação/autorização end-to-end com sessão real antes de publicar. Leituras antigas e links existentes permanecem no v1; tokens novos não herdam `is_active` de tokens antigos. Expiração/revogação nova é própria, nunca uma exceção de token permanentemente ativo.
4. Só então habilitar **um scope fictício**, publicar a fase real e verificar readback + identidade da revisão; fechar emissão privada por enrollment se falhar, mantendo leitores/histórico/claims. Não voltar à limpeza destrutiva como recuperação.

**Não foi identificada necessidade de alteração destrutiva de projetos, versões, comentários, aprovações ou links existentes para este caminho new-only.** A correção de contador acima é uma alteração persistente separada que exige prova/fingerprint, não eliminação de media. Importar identidades canónicas para a tabela antiga continua proibido. Contract/migração histórica e eliminação física ficam fora desta fase. Após primeiro registo privado, rollback é forward; nunca eliminar registos/outbox para “voltar atrás”.

## Comandos de reprodução

```text
python3 -B docs/security/fase-a/video-integration/coexistence/sidecar_postgres_test.py
bunx vitest run --config docs/security/fase-a/video-integration/coexistence/vitest.config.ts
deno check --no-config --no-lock --node-modules-dir=none docs/security/fase-a/video-integration/coexistence/sidecar-runtime.ts
```

O ensaio browser requer a fixture local explícita `/tmp/browser/release-window/fixture.mp4` e o Vite existente em localhost:8080. Nunca substituir por URL/ficheiro de cliente. Todas as chamadas reais de fornecedor são substituídas no harness; todos os SQL ficam no socket descartável.