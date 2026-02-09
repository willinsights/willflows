

## Actualizar pagamentos de Janeiro com dados do Excel

### Resumo
Operacao de dados na base de dados para fechar Janeiro: marcar 65 projectos do Excel como pagos (cliente + colaboradores) e mover os restantes projectos pendentes de Janeiro para 28 de Fevereiro.

### Passo 1 -- Marcar 65 projectos como pagos (cliente)
Actualizar `client_payment_status = 'pago'` e `client_paid_at = now()` para todos os 65 projectos listados no Excel, incluindo:
- 9 projectos TempoVip (Hotel Lince, Cooking class, Matriarca, Chocopalha, etc.)
- 3 projectos The Dispatcher (Reels)
- 13 projectos Amazorial Luxury Brazil (Caiman, Pantanal, LILA, etc.)
- 20 projectos Bespoke Sardinia (Villa Las Tronas, Forte Village, etc.)
- 10 projectos Landzery (LLoA, Finniss, Tasmania, etc.)
- 1 projecto Pick off Tempovip (Christian Coelho)
- Barco Invictus, Walking tour, Cooking class, etc.

Nota: alguns ja estao marcados como pago -- o UPDATE nao causa problemas nesses.

### Passo 2 -- Marcar pagamentos de colaboradores como pagos
Actualizar `payment_status = 'pago'` na tabela `project_team` para todos os membros dos 65 projectos do Excel. Isto inclui:
- Rafaela Nunes (edicao)
- Morais (edicao)
- Christian Coelho (edicao)
- Savio Macedo (captacao)
- Luke Cavalcante (captacao)
- wilker oliveira (captacao)

### Passo 3 -- Mover projectos pendentes de Janeiro para Fevereiro
Os seguintes projectos NAO constam no Excel e vao ter `delivery_date` alterada para **2026-02-28**:
1. Teaser Redes Sociais - Rita (era 4/Jan)
2. Timelapse - Joao (era 9/Jan)
3. Sessao de Produto - Hotel (era 12/Jan)
4. Fotos Gastronomicas - Resort (era 14/Jan)
5. Video de Lancamento - Hotel (era 17/Jan)
6. Documentario - Sunset (era 21/Jan)
7. Ensaio Lifestyle - Pedro (era 27/Jan)
8. Retrato Corporativo - Hotel (era 28/Jan)
9. Captacao Dubai (era 29/Jan)
10. BIRIBEIRO_15012026 (era 30/Jan)
11. CHARLENE TEIXEIRA BRANDING (era 30/Jan)
12. Ciosp - Dra. Mariana Risemberg (era 30/Jan)
13. Ciosp - Dra. Juliani Tibolla (era 31/Jan)

Projectos ja pagos ou cancelados em Janeiro ficam como estao.

### Detalhe tecnico

Uma unica migracao SQL com 3 blocos:

**Bloco 1** -- UPDATE projects SET client_payment_status, client_paid_at para os 65 IDs do Excel

**Bloco 2** -- UPDATE project_team SET payment_status = 'pago' WHERE project_id IN (lista dos 65 IDs)

**Bloco 3** -- UPDATE projects SET delivery_date = '2026-02-28' para os 13 projectos pendentes de Janeiro

Sem alteracoes de codigo -- apenas dados na base de dados.

