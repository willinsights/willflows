

# Auditoria Completa do Sistema WillFlow

## 1. SEGURANCA (Prioridade Alta)

### 1.1 Funcao `notify_chat_message` sem `search_path` definido
A funcao `notify_chat_message` e SECURITY DEFINER mas nao tem `SET search_path = 'public'`, o que a torna vulneravel a ataques de search_path hijacking. E a unica funcao com este problema.

**Correcao:** Recriar a funcao com `SET search_path = 'public'`.

### 1.2 Politicas RLS permissivas (USING true / WITH CHECK true)
O linter detectou 4 politicas com `true`:
- `beta_waitlist` - INSERT com `WITH CHECK (true)` -- aceitavel (formulario publico)
- `blog_share_analytics` - INSERT com `WITH CHECK (true)` -- aceitavel (analytics publico)
- `contract_views` - INSERT com `WITH CHECK (true)` -- aceitavel (views publicas)
- `push_notification_queue` - ALL com `USING (true) / WITH CHECK (true)` -- **PROBLEMA**: permite qualquer utilizador autenticado manipular a fila de push. Deve ser restrito a `service_role` ou verificar `auth.uid()`.

**Correcao:** Restringir a politica `push_notification_queue` para verificar `is_service_role()` ou remover acesso para roles normais.

### 1.3 Anon key exposta no `robots.txt`
O sitemap reference no robots.txt expoe o URL completo do projeto backend incluindo o ref ID (`wppfmyseeigsdqutkgyc`). Embora nao seja critico (a anon key e publica por design), e boa pratica minimizar a exposicao.

### 1.4 Anon key hardcoded na funcao `update_blog_cron_schedule`
A funcao SQL `update_blog_cron_schedule` tem a anon key do projeto hardcoded no corpo da funcao. Se alguem tiver acesso de leitura a definicao das funcoes, pode obter esta chave.

**Correcao:** Mover para um secret/variavel de ambiente na edge function ou usar `service_role` key via vault.

---

## 2. PERFORMANCE (Prioridade Media)

### 2.1 `React.StrictMode` nao esta ativo
O `main.tsx` nao usa `React.StrictMode`. Embora nao afete producao, ajuda a detectar problemas durante o desenvolvimento.

### 2.2 Query Client staleTime muito alto
O `staleTime` de 10 minutos no `query-client.ts` pode fazer com que os utilizadores vejam dados desatualizados frequentemente. Considerar reduzir para 5 minutos ou implementar invalidacao mais agressiva em acoes criticas.

### 2.3 Console.logs excessivos em producao
Encontrados 187+ `console.log` em 7 ficheiros, especialmente em `useMessages.ts` e `usePushNotifications.ts`. Estes deviam ser removidos ou condicionados a `import.meta.env.DEV`.

**Correcao:** Substituir `console.log` por `console.debug` condicionado a DEV mode, ou remover completamente os logs de debug.

### 2.4 PWA manifest com icone unico para dois tamanhos
O mesmo ficheiro `pwa-icon.png` e usado para 192x192 e 512x512 com `purpose: 'any maskable'`. Deve-se ter icones separados para cada tamanho e separar `any` de `maskable`.

---

## 3. SEO (Prioridade Media)

### 3.1 Paginas publicas sem `noindex` em rotas protegidas
As rotas `/admin/*` nao estao bloqueadas no `robots.txt` nem usam `noindex`. Embora exijam autenticacao, e boa pratica adiciona-las ao `robots.txt`.

**Correcao:** Adicionar `Disallow: /admin/` ao `robots.txt`.

### 3.2 Landing page bem otimizada
A landing page ja tem:
- Schemas JSON-LD (SoftwareApplication, HowTo, FAQPage)
- Open Graph e Twitter cards
- Canonical URL
- SEOHead centralizado para outras paginas

### 3.3 Sitemap dinamico via edge function
Ja existe uma edge function `/sitemap` referenciada no robots.txt. Verificar se esta atualizada e inclui todas as paginas publicas (features, comparisons, blog posts).

---

## 4. DESIGN E RESPONSIVIDADE (Prioridade Baixa)

### 4.1 Layout mobile bem separado
O sistema ja tem componentes mobile dedicados (`MobileAppLayout`, `MobileKPICarousel`, etc.) e usa `useIsMobile()` consistentemente.

### 4.2 `key={index}` em listas dinamicas
Encontrados 70+ usos de `key={index}` em 12 ficheiros. Em listas estaticas (FAQs, features) e aceitavel, mas em listas dinamicas como `ImportLeadsModal` e `ChatContextPanel` pode causar bugs de re-render.

**Correcao:** Usar IDs unicos onde disponivel (ex: `key={link.id}` em vez de `key={index}`).

### 4.3 Glass morphism e design system consistente
O design system esta bem organizado com variaveis CSS para light/dark mode, glass effects, e cores kanban. Nao ha problemas de inconsistencia visual significativos.

---

## 5. FUNCIONALIDADES (Prioridade Baixa)

### 5.1 `dangerouslySetInnerHTML` protegido
Todos os 5 usos de `dangerouslySetInnerHTML` estao protegidos com `DOMPurify.sanitize()`. Nenhum risco aqui.

### 5.2 Erro de handler no `notify_payment_event`
A funcao `notify_payment_event` usa `role IN ('admin', 'editor')` que e um check hardcoded de role, contradizendo o sistema de permissoes dinamico. Deveria usar `has_workspace_permission`.

**Correcao:** Atualizar para usar o sistema de permissoes dinamico.

---

## Resumo de Acoes

| Prioridade | Area | Acao |
|-----------|------|------|
| Alta | Seguranca | Adicionar `search_path` a `notify_chat_message` |
| Alta | Seguranca | Restringir politica RLS de `push_notification_queue` |
| Media | Performance | Limpar/condicionar console.logs (187 ocorrencias) |
| Media | SEO | Adicionar `/admin/` ao `robots.txt` |
| Media | Seguranca | Hardcoded role checks em triggers (`notify_payment_event`) |
| Baixa | Performance | Separar icones PWA por tamanho |
| Baixa | Design | Substituir `key={index}` por IDs unicos em listas dinamicas |

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| Migracao SQL | Recriar `notify_chat_message` com `SET search_path = 'public'` |
| Migracao SQL | Atualizar politica RLS de `push_notification_queue` |
| Migracao SQL | Atualizar `notify_payment_event` para usar permissoes dinamicas |
| `public/robots.txt` | Adicionar `Disallow: /admin/` |
| `src/hooks/useMessages.ts` | Remover/condicionar console.logs |
| `src/hooks/usePushNotifications.ts` | Remover/condicionar console.logs |
| `vite.config.ts` | Separar icones PWA |

