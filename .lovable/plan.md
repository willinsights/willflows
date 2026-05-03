
# Fechar contas Rafaela — Abril 2026

## ✅ Já feito (read-only)
Excel gerado em `/mnt/documents/Pagamento_Rafaela_Abril2026.xlsx` com duas secções:

**Secção 1 — Entregues em abril (a pagar agora) — 11 projetos · 420,00 €**

| Cliente | Projeto | Valor |
|---|---|---|
| Deccana | Your Proposal in 24H | 30 € |
| The Dispatcher | 4 - Castelos de Portugal | 30 € |
| TempoVip Portugal | 3 - Destination Azores, PT | 30 € |
| TempoVip Espanha | 1 - Slow travel & longer stays - ES | 30 € |
| TempoVip Marrocos | 2 - Our favorite boutique hotels - Morocco | 30 € |
| Deccana | Culinary Italy Journey | 30 € |
| Deccana | Lake Como Highlight | 30 € |
| Sardinia Bespoke | 24 Hours: From Request to Proposal | 30 € |
| TempoVip Portugal | Hotel Spatia Comporta | 60 € |
| TempoVip Portugal | Cavalos na Areia - Comporta 2026 | 60 € * |
| TempoVip Portugal | Sidecar Sintra 2026 | 60 € |

**Secção 2 — Pendentes da lista da Rafaela já regularizados no sistema (referência) — 219,67 €**
11 itens (R4 Espanha Insiders, 4× Eleggia, 5× Amazorial, P8 Restaurant Guide) já com `paid_at` registado em março/abril.

## 📋 Ações a executar (precisam de modo build)

1. **Atualizar valor** do projeto "Cavalos na Areia - Comporta 2026" (`project_team` id `fcd4edf9-...`) de `NULL` para `60,00 €`.

2. **Marcar como pago** os 11 registos de `project_team` da secção 1 — set `payment_status='pago'` e `paid_at = now()`:
   - `89c11835`, `f014eeb5`, `467bf643`, `65fbd3e9`, `c7bfd46c`, `2204c138`, `1a27642e`, `1d1ed47b`, `fa486421`, `fcd4edf9`, `67dd286c`

3. Decisão da Rafaela sobre a Secção 2 (já regularizados) fica em aberto — confirmar com ela depois de ver o Excel.

<lov-artifact path="Pagamento_Rafaela_Abril2026.xlsx" mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></lov-artifact>
