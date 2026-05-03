

# Criar 3 cards no Kanban da Edição — The Dispatcher Maio 2026

## Resumo
Criar 3 projetos para o cliente **The Dispatcher** (Maio 2026), cada um com o **script frame-a-frame completo** estruturado em formato tabela timestamp/scene/descrição nas notas internas — exatamente como o exemplo da imagem partilhada.

## Estrutura do script em cada card

Cada `internal_notes` seguirá este formato consistente:

```
═══════════════════════════════════════
🎬 [NOME DO REEL] — 15s
═══════════════════════════════════════

📋 SCRIPT FRAME-A-FRAME

┌─────────┬──────────────┬─────────────────────────────────────┐
│ TEMPO   │ SCENE        │ DESCRIÇÃO                           │
├─────────┼──────────────┼─────────────────────────────────────┤
│ 0–2s    │ SCROLL STOP  │ [Hook visual + som]                 │
│ 2–5s    │ [SCENE 2]    │ [Footage + text overlay]            │
│ 5–9s    │ [SCENE 3]    │ [Footage + text overlay]            │
│ 9–13s   │ [SCENE 4]    │ [Footage + text overlay]            │
│ 13–15s  │ CTA          │ [Fundo, texto, logo]                │
└─────────┴──────────────┴─────────────────────────────────────┘

🎨 DIREÇÃO DE ARTE
- Tipografia: Oswald Bold (overlays)
- Paleta: branco / laranja #FFA955 / creme #F4F0EA
- Logo: Dispatcher canto inferior direito (CTA)

🎵 ÁUDIO
[Notas sobre música/som]

📝 COPIES (A/B/C)
A: [...]
B: [...]
C: [...]

#️⃣ HASHTAGS
[lista de hashtags]

📦 FOOTAGE
[Origem do material — TempoVip, etc.]
```

## Cards a criar

| # | Nome | Data | Hook |
|---|---|---|---|
| 1 | **Dispatcher Maio — Reel Baleares** | 03/05/2026 | "Dive wild, sail free, eat well." |
| 2 | **Dispatcher Maio — Meet the Owner: Sidecar Lisboa** | 07/05/2026 | "Lisbon, differently." |
| 3 | **Dispatcher Maio — Dispatcher Invites: Travel Designer** | 10/05/2026 | "72 hours in the Iberian Peninsula…" |

Cada card terá o seu próprio script frame-a-frame extraído do briefing `.docx`, no formato acima.

## Execução técnica

1. **Parse do `.docx`** já carregado para extrair o conteúdo exato de cada Reel (script, copies, hashtags, footage notes).
2. **Query** à `kanban_columns` para obter o `id` da primeira coluna (`position = 0`) da fase `edicao` do workspace ativo.
3. **3 INSERTs** na tabela `projects`:
   - `client_id`: `e14f0a43-849e-48ae-b14e-11b4fcda8202` (The Dispatcher)
   - `current_phase`: `'edicao'`
   - `edicao_column_id`: coluna inicial da Edição
   - `delivery_date`: 2026-05-03 / 2026-05-07 / 2026-05-10
   - `internal_notes`: script frame-a-frame completo no formato acima
   - `category`: `'Reel'`

## Resultado
Ao recarregar `/app/edicao`, os 3 cards aparecem na primeira coluna da Edição. Ao abrir cada card, o editor encontra o script estruturado em tabela tempo/scene/descrição (igual à imagem), seguido de direção de arte, áudio, copies, hashtags e fonte de footage — tudo o que precisa para produzir.

