
# Plano: Dados Fictícios para Workspace "Agencia"

## Informação do Workspace

| Campo | Valor |
|-------|-------|
| **Workspace ID** | `ffd33759-8c83-4fc3-8e9d-7bf16ba9fe92` |
| **Nome** | Agencia |
| **Slug** | agencia-ml2s6e42 |
| **User ID (Admin)** | `697806bf-89b2-4ad6-af64-eaf0796a34c4` |

---

## Dados Fictícios a Criar (Baseados na Tabela de Referência)

### 1. Clientes (8 clientes fictícios)

| Nome | Empresa | Tipo | Email | NIF | Tags |
|------|---------|------|-------|-----|------|
| Ana Silva | Hotel Marina Resort | hotel | ana.silva@marinahotel.pt | 501234567 | VIP, Recorrente |
| Pedro Santos | Cervejaria Artesanal Minho | experiencia | pedro@cervejariaminho.pt | 502345678 | Premium |
| Mariana Costa | Eventos Atlântico | evento | mariana@eventosatlantico.pt | 503456789 | Novo |
| João Rodrigues | Produtora Soundscape | outro | joao@soundscape.pt | 504567890 | Videoclipe |
| Sofia Ferreira | Restaurante Oceano | experiencia | sofia@restauranteoceano.pt | 505678901 | Gastronomia |
| Miguel Almeida | Imobiliária Vista Mar | outro | miguel@vistamar.pt | 506789012 | Imobiliário |
| Beatriz Lopes | Academia Fitness Plus | experiencia | beatriz@fitnessplus.pt | 507890123 | Corporativo |
| Ricardo Mendes | Startup TechFlow | outro | ricardo@techflow.io | 508901234 | Tech, Motion |

---

### 2. Projectos (12 projectos em várias fases)

Baseado nos valores da tabela de referência (convertidos para EUR ~= R$ / 5.5):

| Projecto | Cliente | Tipo | Valor (€) | Fase | Categoria |
|----------|---------|------|-----------|------|-----------|
| Institucional Marina Resort 2025 | Hotel Marina | video | 4.500 | edicao | hotel |
| Ensaio Fotográfico Cervejaria | Cervejaria Minho | fotografia | 800 | captacao | experiencia |
| Cobertura Gala Atlântico | Eventos Atlântico | foto_video | 6.500 | captacao | evento |
| Videoclipe "Horizonte" | Soundscape | video | 18.000 | edicao | outro |
| Reel Gastronómico Q1 | Restaurante Oceano | video | 1.200 | edicao | experiencia |
| Filmagem Aérea Empreendimento | Vista Mar | video | 2.800 | captacao | outro |
| Vídeo Institucional Fitness | Academia Fitness | video | 3.600 | edicao | experiencia |
| Motion Graphics Apresentação | TechFlow | video | 3.200 | edicao | outro |
| Book Fotográfico Produtos | Cervejaria Minho | fotografia | 550 | edicao | experiencia |
| Vídeo Corporativo 3min | Hotel Marina | video | 5.500 | captacao | hotel |
| Drone Event Highlight | Eventos Atlântico | video | 1.800 | edicao | evento |
| Animação 2D Explainer | TechFlow | video | 5.500 | captacao | outro |

---

### 3. Leads (6 leads em diferentes estágios)

| Nome | Empresa | Status | Valor Estimado (€) | Fonte |
|------|---------|--------|-------------------|-------|
| Carlos Neves | Hotel Palácio | proposta | 8.000 | Website |
| Inês Martins | Vinhos do Douro | qualificado | 4.500 | Referência |
| Bruno Oliveira | Festival Summer | negociacao | 15.000 | Instagram |
| Clara Ribeiro | E-commerce ModaFlow | contactado | 2.000 | LinkedIn |
| André Pinto | Construtora Horizonte | novo | 6.000 | Website |
| Joana Carvalho | Academia Dance | proposta | 3.500 | Referência |

---

### 4. Eventos de Calendário (8 eventos)

| Título | Tipo | Data | Projecto |
|--------|------|------|----------|
| Sessão Marina Resort | shoot | +2 dias | Institucional Marina |
| Captação Cervejaria | shoot | +5 dias | Ensaio Cervejaria |
| Gala Atlântico | shoot | +7 dias | Cobertura Gala |
| Entrega Final Videoclipe | delivery | +10 dias | Videoclipe Horizonte |
| Reunião Hotel Palácio | meeting | +1 dia | - |
| Filmagem Drone Vista Mar | shoot | +3 dias | Filmagem Aérea |
| Entrega Reel Q1 | delivery | +4 dias | Reel Gastronómico |
| Call TechFlow | meeting | +6 dias | Motion Graphics |

---

### 5. Pagamentos (Receber e Pagar)

#### A Receber:
| Descrição | Valor (€) | Status | Vencimento |
|-----------|-----------|--------|------------|
| 50% Institucional Marina | 2.250 | pendente | +15 dias |
| Videoclipe Horizonte - Final | 9.000 | pendente | +30 dias |
| Cobertura Gala - Sinal | 3.250 | pago | -5 dias |
| Reel Gastronómico | 1.200 | pendente | +7 dias |
| Filmagem Vista Mar | 2.800 | pago | -10 dias |

#### A Pagar (Equipa):
| Colaborador | Valor (€) | Projecto | Status |
|-------------|-----------|----------|--------|
| Carlos Drone (Freelancer) | 450 | Filmagem Vista Mar | pendente |
| Editor João | 1.200 | Videoclipe Horizonte | pago |
| Motion Designer Ana | 800 | TechFlow | pendente |

---

### 6. Colunas Kanban (se não existirem)

#### Captação:
1. Agendamento
2. Pré-produção
3. Em captação
4. Material recebido

#### Edição:
1. Na fila
2. Primeiro corte
3. Revisão cliente
4. Ajustes finais
5. Entregue

---

### 7. Tarefas/Checklist (5-10 tarefas por projecto)

| Projecto | Tarefa | Status | Assignee |
|----------|--------|--------|----------|
| Videoclipe Horizonte | Sync áudio multitrack | done | Admin |
| Videoclipe Horizonte | Color grading | in_progress | Admin |
| Videoclipe Horizonte | Efeitos visuais | pending | - |
| Motion TechFlow | Animação intro | done | Admin |
| Motion TechFlow | Icons animados | in_progress | Admin |
| Reel Oceano | Selecção takes | done | Admin |
| Reel Oceano | Montagem 60s | in_progress | Admin |

---

### 8. Mensagens de Chat (Conversas de Projecto)

Criar 2-3 conversas com mensagens:

**Projecto: Videoclipe Horizonte**
- "Primeiro corte pronto para review"
- "Cliente adorou! Pequenos ajustes na transição do minuto 2"
- "Ajustes feitos, a exportar versão final"

**Projecto: Motion TechFlow**
- "Briefing recebido, a começar storyboard"
- "Paleta de cores aprovada pelo cliente"

---

## Ordem de Execução SQL

```text
1. Criar Clientes
   └── 8 INSERT INTO clients

2. Criar Colunas Kanban (se não existirem)
   └── 4 colunas captação + 5 colunas edição

3. Criar Projectos
   └── 12 INSERT INTO projects (com client_id e column_id)

4. Criar Leads
   └── 6 INSERT INTO clients (com lead_status)

5. Criar Eventos Calendário
   └── 8 INSERT INTO calendar_events

6. Criar Pagamentos
   └── 8 INSERT INTO payments

7. Criar Tarefas
   └── 15-20 INSERT INTO tasks

8. Criar Conversas e Mensagens
   └── 2 INSERT INTO conversations + 5-10 mensagens
```

---

## Secção Técnica: SQL Scripts

### Script 1: Clientes

```sql
INSERT INTO clients (workspace_id, name, company, email, nif, phone, city, country, tags, lead_status, converted_at, is_active)
VALUES
('ffd33759-8c83-4fc3-8e9d-7bf16ba9fe92', 'Ana Silva', 'Hotel Marina Resort', 'ana.silva@marinahotel.pt', '501234567', '+351912345001', 'Cascais', 'Portugal', ARRAY['VIP', 'Recorrente'], 'ganho', NOW() - INTERVAL '60 days', true),
('ffd33759-8c83-4fc3-8e9d-7bf16ba9fe92', 'Pedro Santos', 'Cervejaria Artesanal Minho', 'pedro@cervejariaminho.pt', '502345678', '+351912345002', 'Braga', 'Portugal', ARRAY['Premium'], 'ganho', NOW() - INTERVAL '45 days', true),
...
```

### Script 2: Projectos (com valores realistas)

```sql
INSERT INTO projects (workspace_id, name, client_id, type, category, agreed_value, current_phase, priority, shoot_date, delivery_date, captacao_column_id, edicao_column_id, created_by)
VALUES
('ffd33759-8c83-4fc3-8e9d-7bf16ba9fe92', 'Institucional Marina Resort 2025', <client_id>, 'video', 'hotel', 4500, 'edicao', 'alta', NOW() - INTERVAL '5 days', NOW() + INTERVAL '15 days', NULL, <column_id>, '697806bf-89b2-4ad6-af64-eaf0796a34c4'),
...
```

### Script 3: Pagamentos

```sql
INSERT INTO payments (workspace_id, project_id, client_id, amount, is_receivable, status, due_date, description, currency)
VALUES
('ffd33759-8c83-4fc3-8e9d-7bf16ba9fe92', <project_id>, <client_id>, 2250, true, 'pendente', NOW() + INTERVAL '15 days', '50% Institucional Marina Resort', 'EUR'),
...
```

---

## Resultado Esperado

Após inserção dos dados:

| Módulo | Quantidade | Descrição |
|--------|------------|-----------|
| **Dashboard** | KPIs reais | Receita ~€55k, 12 projectos, gráficos |
| **Kanban Captação** | 5 cartões | Em várias colunas |
| **Kanban Edição** | 7 cartões | Em várias colunas |
| **Calendário** | 8 eventos | Próximas 2 semanas |
| **Clientes** | 8 clientes | Com projectos associados |
| **Leads** | 6 leads | Pipeline visual |
| **Pagamentos** | 8 registos | Gráficos receita/despesa |
| **Chat** | 2 conversas | Mensagens de exemplo |
| **Relatórios** | Dados para 6 meses | Gráficos históricos |

---

## Notas Importantes

1. **Valores em EUR** - Convertidos de R$ usando factor ~5.5
2. **Datas relativas** - Usamos `NOW() + INTERVAL` para dados actuais
3. **User ID único** - Todos os registos associados ao super admin
4. **Workspace específico** - Apenas no workspace "Agencia"
5. **Dados realistas** - Baseados na tabela de preços fornecida

