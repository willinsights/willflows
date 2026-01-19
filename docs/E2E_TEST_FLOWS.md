# WillFlow - Fluxos de Teste End-to-End

Este documento descreve os fluxos de teste fim-a-fim para validação completa do sistema WillFlow.

---

## 1. Fluxo de Autenticação

### 1.1 Registo de Nova Conta

**Pré-condições:** Nenhuma conta existente com o email de teste

**Passos:**
1. Aceder a `/auth`
2. Clicar em "Criar conta"
3. Preencher:
   - Nome completo
   - Email válido
   - Password (mínimo 6 caracteres)
4. Clicar em "Criar conta"

**Resultado esperado:**
- ✅ Conta criada com sucesso (auto-confirm ativo)
- ✅ Redirect automático para `/onboarding`
- ✅ Toast de sucesso exibido

### 1.2 Login com Conta Existente

**Passos:**
1. Aceder a `/auth`
2. Preencher email e password
3. Clicar em "Entrar"

**Resultado esperado:**
- ✅ Login bem-sucedido
- ✅ Redirect para `/app/dashboard` (se tem workspace)
- ✅ Redirect para `/onboarding` (se não tem workspace)

### 1.3 Recuperação de Password

**Passos:**
1. Aceder a `/auth`
2. Clicar em "Esqueci a password"
3. Inserir email
4. Clicar em "Enviar link"

**Resultado esperado:**
- ✅ Email enviado com link de reset
- ✅ Toast de confirmação

---

## 2. Fluxo de Onboarding

### 2.1 Criação de Workspace

**Pré-condições:** Utilizador autenticado sem workspace

**Passos:**
1. Aceder a `/onboarding`
2. Preencher nome do workspace
3. Selecionar região/país
4. Selecionar moeda
5. Clicar em "Criar Workspace"

**Resultado esperado:**
- ✅ Workspace criado na base de dados
- ✅ Utilizador associado como owner
- ✅ Colunas Kanban default criadas
- ✅ Redirect para `/app/dashboard`

### 2.2 Seleção de Plano (Trial)

**Passos:**
1. Após criar workspace
2. Verificar que trial de 14 dias está ativo
3. Verificar badge "Trial" no header

**Resultado esperado:**
- ✅ Trial ativo com 14 dias
- ✅ Todas as features Pro disponíveis durante trial
- ✅ Banner de trial exibido

---

## 3. Fluxo de Clientes

### 3.1 Criar Cliente

**Passos:**
1. Aceder a `/app/clientes`
2. Clicar em "Novo Cliente"
3. Preencher:
   - Nome (obrigatório)
   - Email
   - Telefone
   - Empresa
   - NIF
   - Morada completa
4. Clicar em "Criar"

**Resultado esperado:**
- ✅ Cliente criado e visível na lista
- ✅ Toast de sucesso

### 3.2 Editar Cliente

**Passos:**
1. Clicar num cliente existente
2. Modificar dados
3. Guardar alterações

**Resultado esperado:**
- ✅ Dados atualizados
- ✅ Histórico de comunicações visível
- ✅ Notas editáveis

### 3.3 Arquivar/Desativar Cliente

**Passos:**
1. Abrir cliente
2. Marcar como inativo

**Resultado esperado:**
- ✅ Cliente movido para inativos
- ✅ Não aparece em seleções de novos projetos

---

## 4. Fluxo de Projetos (Kanban)

### 4.1 Criar Projeto

**Passos:**
1. Aceder a `/app/captacao` ou `/app/edicao`
2. Clicar em "Novo Projeto"
3. Preencher:
   - Nome do projeto
   - Cliente (selecionar)
   - Tipo (vídeo/foto/etc)
   - Data de entrega
   - Valor acordado
4. Clicar em "Criar"

**Resultado esperado:**
- ✅ Projeto criado na primeira coluna do Kanban
- ✅ Card visível com informações resumidas

### 4.2 Mover Projeto entre Colunas (Drag & Drop)

**Passos:**
1. Arrastar card de projeto
2. Soltar noutra coluna

**Resultado esperado:**
- ✅ Projeto movido visualmente
- ✅ Estado atualizado na base de dados
- ✅ Histórico de atividade registado

### 4.3 Completar Checklist

**Passos:**
1. Abrir projeto
2. Ir para tab "Checklist"
3. Marcar itens como completos
4. Adicionar novos itens se necessário

**Resultado esperado:**
- ✅ Progresso atualizado no card
- ✅ Barra de progresso reflete estado

### 4.4 Entregar Projeto

**Passos:**
1. Mover projeto para coluna final (is_final=true)
2. Ou clicar em "Marcar como entregue"

**Resultado esperado:**
- ✅ Data de entrega registada
- ✅ Projeto visível em `/app/finalizados`
- ✅ Removido do Kanban ativo

---

## 5. Fluxo Financeiro

### 5.1 Registar Pagamento de Cliente

**Passos:**
1. Aceder a `/app/pagamentos`
2. Tab "Clientes"
3. Clicar em "Novo Pagamento"
4. Preencher:
   - Cliente
   - Projeto (opcional)
   - Valor
   - Data de vencimento
   - Descrição
5. Guardar

**Resultado esperado:**
- ✅ Pagamento registado como "A receber"
- ✅ Visível na lista de pagamentos

### 5.2 Marcar Pagamento como Pago

**Passos:**
1. Encontrar pagamento pendente
2. Clicar em "Marcar como pago"

**Resultado esperado:**
- ✅ Status alterado para "Pago"
- ✅ Data de pagamento registada
- ✅ Relatórios atualizados

### 5.3 Registar Custo/Despesa

**Passos:**
1. Tab "Custos Extras"
2. Clicar em "Novo Custo"
3. Preencher detalhes

**Resultado esperado:**
- ✅ Custo registado
- ✅ Margem de lucro atualizada nos relatórios

### 5.4 Exportar Pagamentos (PDF/Excel)

**Passos:**
1. Aceder a `/app/pagamentos`
2. Aplicar filtros desejados
3. Clicar em "Exportar PDF" ou "Exportar Excel"

**Resultado esperado:**
- ✅ **Plano Starter**: Botões bloqueados com mensagem de upgrade
- ✅ **Plano Pro/Studio**: Download iniciado

---

## 6. Fluxo de Relatórios

### 6.1 Visualizar Relatórios

**Passos:**
1. Aceder a `/app/relatorios`
2. Selecionar período
3. Verificar gráficos e métricas

**Resultado esperado:**
- ✅ Receitas totais corretas
- ✅ Custos totais corretos
- ✅ Margem de lucro calculada
- ✅ Gráficos renderizados

### 6.2 Comparação Mensal

**Passos:**
1. Visualizar comparação com mês anterior

**Resultado esperado:**
- ✅ Percentagens de variação corretas
- ✅ Indicadores visuais (verde/vermelho)

---

## 7. Fluxo de Calendário

### 7.1 Criar Evento

**Passos:**
1. Aceder a `/app/calendario`
2. Clicar numa data
3. Preencher detalhes do evento
4. Guardar

**Resultado esperado:**
- ✅ Evento visível no calendário
- ✅ Cores por tipo de evento

### 7.2 Arrastar Evento (Reagendar)

**Passos:**
1. Arrastar evento para nova data

**Resultado esperado:**
- ✅ Data atualizada
- ✅ Persistido na base de dados

---

## 8. Fluxo de Equipa

### 8.1 Convidar Membro

**Passos:**
1. Aceder a `/app/equipa`
2. Clicar em "Convidar"
3. Inserir email
4. Selecionar role (admin/member/freelancer)
5. Enviar convite

**Resultado esperado:**
- ✅ Email de convite enviado
- ✅ Convite pendente visível na lista
- ✅ **Limite de plano**: Verificar se permite mais membros

### 8.2 Aceitar Convite

**Passos:**
1. Aceder ao link do email
2. Criar conta ou fazer login
3. Aceitar convite

**Resultado esperado:**
- ✅ Membro adicionado ao workspace
- ✅ Permissões do role aplicadas

### 8.3 Alterar Permissões

**Passos:**
1. Aceder a configurações
2. Tab "Permissões"
3. Ajustar matriz de permissões

**Resultado esperado:**
- ✅ Permissões guardadas
- ✅ Acesso restrito conforme configuração

---

## 9. Fluxo de Upgrade/Stripe

### 9.1 Iniciar Upgrade

**Passos:**
1. Clicar em "Upgrade" no header ou settings
2. Selecionar plano (Pro/Studio)
3. Selecionar ciclo (mensal/anual)
4. Clicar em "Subscrever"

**Resultado esperado:**
- ✅ Redirect para Stripe Checkout
- ✅ Preço correto exibido

### 9.2 Completar Pagamento

**Passos:**
1. Preencher dados de pagamento no Stripe
2. Confirmar

**Resultado esperado:**
- ✅ Redirect para `/checkout-success`
- ✅ Plano atualizado
- ✅ Features desbloqueadas

### 9.3 Gerir Subscrição

**Passos:**
1. Aceder a Settings > Plano
2. Clicar em "Gerir Subscrição"

**Resultado esperado:**
- ✅ Portal Stripe abre
- ✅ Pode cancelar/alterar plano
- ✅ Pode atualizar método de pagamento

---

## 10. Limites de Planos - Validação

### Tabela de Verificação

| Feature | Starter | Pro | Studio | Teste |
|---------|---------|-----|--------|-------|
| Projetos ativos | 10 | 100 | ∞ | Criar 11º projeto em Starter → Bloqueado |
| Membros equipa | 1 | 5 | 20 | Convidar 2º membro em Starter → Bloqueado |
| Clientes | 25 | 500 | ∞ | Criar 26º cliente em Starter → Bloqueado |
| Export PDF | ❌ | ✅ | ✅ | Clicar em Starter → Modal upgrade |
| Export Excel | ✅ | ✅ | ✅ | Funciona em todos |
| Google Calendar | ❌ | ✅ | ✅ | Conectar em Starter → Modal upgrade |
| Relatórios avançados | ❌ | ✅ | ✅ | Aceder em Starter → Upgrade alert |

---

## 11. Testes de Segurança

### 11.1 Acesso Cross-Workspace

**Teste:**
1. Login com utilizador A (workspace A)
2. Tentar aceder a dados do workspace B via URL

**Resultado esperado:**
- ✅ Acesso negado
- ✅ Redirect ou erro 403

### 11.2 Permissões de Role

**Teste:**
1. Login como membro (não admin)
2. Tentar aceder a configurações de equipa

**Resultado esperado:**
- ✅ Acesso bloqueado conforme permissões

### 11.3 RLS Policies

**Teste:**
1. Via Supabase, tentar SELECT em tabelas protegidas sem auth

**Resultado esperado:**
- ✅ Nenhum dado retornado
- ✅ Erro de permissão

---

## 12. Testes de Performance

### 12.1 Carregamento do Dashboard

**Métrica:** Tempo até interativo < 3s

**Passos:**
1. Limpar cache
2. Aceder a `/app/dashboard`
3. Medir tempo de carregamento

### 12.2 Kanban com Muitos Projetos

**Métrica:** Renderização fluida com 100+ cards

**Passos:**
1. Criar 100 projetos de teste
2. Verificar scroll e drag & drop

### 12.3 Lista de Pagamentos Grande

**Métrica:** Paginação funcional com 1000+ registos

---

## Checklist Final de Validação

- [ ] Todos os fluxos de autenticação funcionam
- [ ] Onboarding cria workspace corretamente
- [ ] CRUD de clientes funciona
- [ ] Kanban permite criar, mover e entregar projetos
- [ ] Pagamentos podem ser registados e marcados como pagos
- [ ] Relatórios exibem dados corretos
- [ ] Calendário permite criar e mover eventos
- [ ] Convites de equipa funcionam
- [ ] Limites de planos são respeitados
- [ ] Upgrade via Stripe funciona
- [ ] Segurança cross-workspace validada
- [ ] Performance aceitável

---

*Última atualização: Janeiro 2025*
