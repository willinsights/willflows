

# Plano: Configurar Credenciais Google Próprias (White-Label)

## Objectivo

Fazer com que o ecrã de autenticação do Google mostre o **nome da sua empresa** (WillFlow) em vez de "Lovable" quando os utilizadores:
1. Fazem login com Google
2. Conectam o Google Calendar

---

## Configuração Actual

| Funcionalidade | Estado Actual | Credenciais |
|---------------|---------------|-------------|
| **Login com Google** | Usa credenciais Lovable (mostra "Lovable") | Geridas pelo Lovable Cloud |
| **Google Calendar** | Já usa credenciais próprias ✅ | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |

---

## Passos de Configuração

### Parte 1: Configurar Projecto no Google Cloud Console

1. Aceda à [Google Cloud Console](https://console.cloud.google.com/)

2. Crie um projecto ou seleccione o existente ("WillFlow" ou similar)

3. Vá a **APIs & Services → OAuth consent screen**:
   - **App name**: WillFlow (ou o nome da sua empresa)
   - **User support email**: O seu email
   - **Authorized domains**: Adicione `willflow.app` e `lovable.app`
   - **Developer contact email**: O seu email

4. Em **Scopes**, adicione:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   - `.../auth/calendar` (para o Calendar)
   - `.../auth/calendar.events` (para o Calendar)

5. Vá a **APIs & Services → Credentials**:
   - Clique em **Create Credentials → OAuth Client ID**
   - Seleccione **Web application**
   - **Name**: WillFlow Web App

---

### Parte 2: Configurar URIs de Redirect

No Google Cloud Console, adicione estes **Authorized redirect URIs**:

**Para Login com Google (Lovable Cloud):**
```
https://wppfmyseeigsdqutkgyc.supabase.co/auth/v1/callback
```

**Para Google Calendar (Edge Function):**
```
https://wppfmyseeigsdqutkgyc.supabase.co/functions/v1/google-calendar-sync?action=callback
```

---

### Parte 3: Configurar Login com Google (BYOK)

1. No Lovable, abra o **Backend Dashboard**:

2. Navegue para: **Users → Authentication Settings → Sign In Methods → Google**

3. Desactive a opção "Use Lovable managed credentials"

4. Introduza as credenciais do Google Cloud Console:
   - **Client ID**: O valor do OAuth Client ID
   - **Client Secret**: O valor do OAuth Client Secret

5. Guarde as alterações

---

### Parte 4: Verificar Credenciais do Google Calendar

As credenciais do Google Calendar já estão configuradas via secrets:
- `GOOGLE_CLIENT_ID` ✅
- `GOOGLE_CLIENT_SECRET` ✅

**Importante**: Pode usar o **mesmo Client ID e Secret** para ambas as funcionalidades, desde que ambos os redirect URIs estejam configurados no Google Cloud Console.

---

## Resultado Esperado

| Ecrã | Antes | Depois |
|------|-------|--------|
| Login com Google | Mostra "Lovable quer aceder..." | Mostra "WillFlow quer aceder..." |
| Conectar Google Calendar | Já mostra nome correcto | Mostra "WillFlow quer aceder..." |

---

## Verificação Final

Após configurar, teste:

1. **Logout** da aplicação
2. Clique em **"Entrar com Google"**
3. Verifique que o popup mostra o nome da sua empresa
4. Vá às **Definições → Google Calendar**
5. Clique em **"Conectar Google Calendar"**
6. Verifique que o popup mostra o nome da sua empresa

---

## Notas Importantes

- Se a app ainda estiver em modo "Testing" no Google Cloud Console, apenas emails adicionados como test users podem fazer login
- Para produção, submeta a app para verificação do Google (pode demorar alguns dias)
- Enquanto estiver em "Testing", utilizadores verão um aviso "App não verificada" - podem clicar em "Avançar" → "Ir para WillFlow (não seguro)" para continuar

