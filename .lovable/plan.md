## Problema

Vários utilizadores reportam que cards no Kanban (Captação/Edição/Finalizados) só ficam sincronizados depois de "minutos" — uns veem alterações antes dos outros. A causa raiz não é falta de Realtime (todas as tabelas relevantes já estão em `supabase_realtime`), mas sim **a ausência de resincronização quando o canal Realtime cai ou quando o separador esteve em segundo plano**.

### Diagnóstico

Em `src/hooks/kanban/useKanbanData.ts`:

1. O fetch inicial é guardado em estado local e só é refeito quando `workspace_id`/`phase`/`isCollaborator` mudam (`lastFetchedKeyRef` bloqueia repetições).
2. Não há *refetch on focus* nem *on visibility change*. Se o browser suspende a aba (mobile, separador em background), as mensagens Realtime que cheguem nesse intervalo perdem-se e nada força um resync ao regressar.
3. O canal Supabase Realtime não tem handler para `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED` — quando a ligação WebSocket cai (rede instável, sleep do laptop, proxy), o cliente reconecta mas o nosso código não dispara `silentRefresh` para apanhar o que se perdeu.
4. Não existe *poll* de segurança. Sem qualquer rede de proteção, basta um evento perdido para o utilizador ficar com o quadro desatualizado até navegar para outra fase e voltar.

O mesmo padrão existe em outras subscrições (notificações, mensagens), mas o foco do utilizador é o Kanban, por isso a correção concentra-se aí — o hook é partilhado e basta corrigir uma vez.

## O que vai mudar

Tudo concentrado em `src/hooks/kanban/useKanbanData.ts`, sem mexer em lógica de negócio (drag/drop, permissões, entregas). Apenas a camada de "manter o estado atualizado".

### 1. Resync ao voltar à aba / ganhar foco
Adicionar listeners globais que chamam `silentRefresh` (debounced) quando:
- `document.visibilitychange` passa a `visible`
- `window.focus`
- `window.online` (regresso da ligação)

### 2. Resync ao reconectar o canal Realtime
No `.subscribe((status) => ...)`, quando o status passar de erro para `SUBSCRIBED` novamente, disparar `silentRefresh()`. Tratar também `CHANNEL_ERROR`, `TIMED_OUT` e `CLOSED` com log e retry implícito do Supabase.

### 3. Poll de segurança
*Heartbeat* a cada **60 segundos** que chama `silentRefresh` apenas se a aba estiver visível. Custo desprezável (uma RPC por minuto por utilizador ativo) e garante consistência mesmo que tudo o resto falhe.

### 4. Remover bloqueio de refetch quando os parâmetros não mudam
`lastFetchedKeyRef` continua a evitar duplicação no *mount*, mas `silentRefresh` deve poder correr sempre que for chamado pelos novos triggers (focus/visibility/poll). Já é o caso — só precisa ficar claro que `isFetchingRef` é a única proteção contra chamadas concorrentes.

### Detalhes técnicos

```text
useKanbanData (hook)
 ├─ fetchColumnsData()                  (já existe)
 ├─ silentRefresh()                     (já existe; reutilizado)
 ├─ debouncedSilentRefresh (300ms)      (já existe)
 │
 ├─ NOVO: useEffect [currentWorkspace?.id]
 │    addEventListener('visibilitychange', onVisible)
 │    addEventListener('focus', onFocus)
 │    addEventListener('online', onOnline)
 │    setInterval(pollIfVisible, 60_000)
 │    cleanup → remove tudo
 │
 └─ Canal Realtime
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && wasDisconnected) silentRefresh()
        if (status === 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED') wasDisconnected = true
      })
```

Notas:
- Todos os triggers passam por `debouncedSilentRefresh` para evitar 3 RPCs simultâneos quando o utilizador volta à aba.
- Mantém-se a *echo suppression* atual: não causa o problema entre utilizadores (só ignora eventos do próprio writer).
- Nenhuma alteração à BD ou às policies — Realtime já está corretamente ativado para `projects`, `kanban_columns`, `tasks`, `task_checklists`, `project_team`.

## Fora do âmbito

- Não mexo no Chat, Notificações, ou outras páginas — se quiseres aplicar o mesmo padrão lá, faz-se num passo seguinte.
- Não altero RLS, RPC `get_kanban_board`, nem o esquema da BD.
- Sem alterações visuais.

## Como validar

1. Abrir o Kanban em dois browsers/utilizadores diferentes.
2. Mover um card no utilizador A → aparece em B em <1s (cenário base, já funciona quando o canal está saudável).
3. Em B, mudar de aba durante 2 minutos enquanto A move cards. Voltar à aba — o quadro deve refletir o estado real imediatamente (≤300ms).
4. Em B, desligar Wi-Fi 30s, ligar de novo — `silentRefresh` deve disparar ao reconectar.
5. Deixar B inativo 70s sem qualquer ação no canal — o poll de 60s deve manter o quadro fresco.
