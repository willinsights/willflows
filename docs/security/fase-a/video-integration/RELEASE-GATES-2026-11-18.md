# WillFlow 2.0 · fecho técnico do candidato de vídeo/quota (18/11/2026)

**Estado:** validação de código isolado aprovada; **NÃO autoriza merge, SQL nem implantação em produção**.

## Confirmado no GitHub Actions

- Pull Request #2: https://github.com/willinsights/willflows/pull/2
- 28 testes Vitest aprovados, incluindo duas chamadas concorrentes ao mesmo upload, recuperação incerta, transferência falhada e validação de quota de substituição.
- Manifesto SHA-256 verificado no CI.
- Build Vite com sobreposição temporária dos candidatos no runner: aprovado.
- Verificação de tipos da interface temporária com `tsc --noEmit -p tsconfig.app.json`: aprovada.
- `deno check` sobre o runtime e os handlers isolados: aprovado.
- Nada copiado para `src/` ou `supabase/functions/` no GitHub. As sobreposições são criadas **somente dentro do runner descartável** do GitHub Actions.

## Alterações desta revisão isolada

- Uma única operação ativa por ficheiro e contexto, coalescendo duas chamadas simultâneas antes de PUT / processamento.
- Retry de falha do PUT reutiliza identificador e ticket, sem gerar uma nova operação de vídeo.
- O envio com resultado incerto mantém a sua identidade e bloqueia outro ficheiro até recuperação explicitamente confirmada como `processing`.
- A interface candidata expõe `Verificar envio` e cancelamento controlado; não afirma que um vídeo foi cancelado se o backend recusar.
- Cálculo de quota total conserva `storage_limit_bytes` como **total** já incluindo o extra; rejeita créditos de substituição impossíveis e overflow de inteiros.
- Os comportamentos comerciais, limites, preços, `Ilimitados`, notificações antigas e pagamentos não foram alterados.

## Restrições restantes: sem autorização de produção

1. **Migração SQL e quotas**: `00-accounting.sql`, `01-upload.sql`, `02-total-quota.sql` ainda não constituem uma migração única comprovadamente reversível contra todos os escritores legados. Fechar `check_storage_quota`, preflight, triggers, contadores, permissões e compatibilidade de dados antigos.
2. **Imutabilidade do objeto R2**: um HEAD válido não impede que um PUT assinado altere o objeto até o fornecedor o copiar. É necessário congelar a origem ou validar versão/ETag com contrato comprovado, incluindo concorrência externa.
3. **Compatibilidade legada**: confirmar a ponte para tickets de versões anteriores e abas abertas, incluindo chaves antigas de três/cinco segmentos, `undefined`/`null` e transição sem perda de vídeos.
4. **Cloudflare Stream**: confirmar pesquisa paginada de recuperação e fencing de estados / UIDs superseded, com evidência operacional. Não assumir exatamente-uma-vez externo.
5. **Outbox e rollback**: conservar referências e claims históricos, sem consumidor destrutivo. Completar reversão conjunta dos SQL e ensaios de cascade/expiração antes de qualquer limpeza.
6. **Gates operacionais**: verificar timestamp UTC e recuperabilidade do backup, versão/hash efetivos de cada função ativa, pausa e drenagem de jobs/chamadores e janela de canário. Sem provas: STOP.
7. **Confirmação comercial**: o contrato técnico proposto é `storage_limit_bytes = total` (base + extra); preservar o mesmo número de versão e comentários ao substituir um vídeo. Não alterar sem aprovação da regra.

## Ordem segura quando as provas existirem

1. Fechar as dependências e executar ensaios isolados com dados fictícios de todos os writers, um teste UI/browser e testes multi-tenant com o pacote SQL final.
2. Apresentar exatamente o diff SQL/código, riscos, backup, SHA e reversão ao proprietário para aprovação **específica**.
3. Pausar e provar drenagem. Aplicar SQL primeiro; verificar ACL e catálogo. Só depois implantação seletiva de funções e UI, compatível com tickets antigos.
4. Validar um canário não destrutivo autorizado e monitorizar sem duplicar jobs. Ativar limpeza de ficheiros apenas mediante autorização destrutiva separada.

**Não confundir o código pronto para revisão com a versão WillFlow 2.0 operacionalmente concluída.** O lote Stripe separado permanece fora deste Pull Request.
