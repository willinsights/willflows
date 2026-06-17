# Geração de Documentos do WillFlow para Claude Desktop

Vou gerar 4 arquivos `.md` consolidando o conhecimento já registrado na memória do projeto, para você anexar ao "WillFlow Master" no Claude Desktop.

## Documentos a gerar

Todos salvos em `/mnt/documents/willflow-master/` e disponibilizados como artifacts para download.

### 1. `01-roadmap.md`
- Visão do produto (do `mem://project/vision`)
- Estado atual: módulos implementados (CRM, Kanban, Financeiro, Contratos, Review Studio, Chat, Calendar, Time Tracking, Automations, Relatórios)
- Próximos passos sugeridos (melhorias mobile/desktop em andamento, hardening de segurança, expansão de automações)

### 2. `02-regras-de-negocio.md`
- **Regra Financeira Única**: projeto só entra em fluxos/relatórios quando `is_delivered = true` (data âncora `delivered_at`)
- Cadeia de datas âncora: delivery → shoot → created_at
- Roles e permissões (admin, edicao, etc. — 4 categorias consolidadas)
- Visibilidade financeira, modo privacidade, visibilidade global do Super Admin
- Pagamentos a colaboradores: vínculo à entrega, baseline para projetos legados
- Receita interna como projeto entregue
- Faturação de cliente + VAT
- Score de saúde de projeto e penalidades
- Custos extras e categorização
- Convites de workspace (hash + máscara)

### 3. `03-estrutura-financeira.md`
- Camada de dados no servidor (views SQL + RPCs)
- Engine de relatórios unificada (contagem de projetos)
- Previsão de receita (fórmula forecast v2)
- Segregação receita de projeto vs pagamento manual
- Cálculo de margem de lucro
- Tracking de custos detalhado
- Faturação Stripe (produtos live, VAT, limites)
- Relatórios detalhados de colaboradores
- Export Excel (exceljs) e PDF (ReportLab)
- Padrões globais de export financeiro
- Filtros de período financeiro

### 4. `04-fluxos.md`
- **Quote-to-Cash** end-to-end
- **Pipeline de Edição**: Kanban → coluna final → auto-delivery → entrada financeira
- **Entrega retroativa** de projetos
- **Time Tracking**: regras de tracking ativo + automações
- **Workflow Automations Engine**: eventos, fila durável (`automation_jobs` + cron worker), idempotência de e-mails
- **Notificações**: filas, transacional, resumos semanais, compliance de descadastro
- **Review Studio**: Cloudflare R2 + Stream, HLS, aprovação pública
- **Chat**: Supabase Realtime + Web Push
- **Calendar/Meet**: integração Google
- **Auth**: Google OAuth com domínio próprio, templates branded

## Formato

- Markdown puro, sem frontmatter pesado
- Cabeçalhos hierárquicos (H1/H2/H3) para o Claude indexar bem
- Tabelas onde fizer sentido (roles, produtos Stripe, status de projeto)
- PT-BR (Brasil)
- Sem prints/PDFs (você indicou que vai anexar os seus próprios)

## Entrega

Ao final, 4 tags `<presentation-artifact>` para download direto, mais um `00-index.md` curto que lista os 4 arquivos — útil para o Claude entender a estrutura do projeto "WillFlow Master".

Posso prosseguir?
