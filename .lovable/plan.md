
# Plano: Configurar Google OAuth com Credenciais Próprias (White-Label)

## Problema Actual

Quando utiliza as credenciais geridas pelo Lovable ("Managed by Lovable"), os clientes veem a marca "Lovable" durante o login com Google. Isto não é ideal para um produto white-label como o WillFlow.

## Solução

Usar credenciais próprias (BYOK - Bring Your Own Key) da Google Cloud Console para que os clientes vejam apenas a sua marca durante o login.

---

## Passo a Passo

### 1. Criar Credenciais na Google Cloud Console

1. Aceda a [Google Cloud Console](https://console.cloud.google.com/)
2. Seleccione ou crie um projecto
3. Vá a **APIs & Services → Credentials**
4. Clique em **Create Credentials → OAuth client ID**
5. Escolha **Web application**

### 2. Configurar o Consent Screen

Em **APIs & Services → OAuth consent screen**:

| Campo | Valor |
|-------|-------|
| App name | **WillFlow** (ou o nome que quiser mostrar) |
| User support email | O seu email |
| App logo | Logo do WillFlow |
| Authorized domains | `willflow.app` e `lovable.app` |

**Scopes necessários:**
- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`  
- `openid`

### 3. Configurar Redirect URLs

Nas credenciais OAuth, adicione os seguintes **Authorized redirect URIs**:

```
https://wppfmyseeigsdqutkgyc.supabase.co/auth/v1/callback
```

### 4. Adicionar Credenciais no Lovable Cloud

No painel Backend:
1. Vá a **Users → Authentication Settings → Sign In Methods → Google**
2. Desactive "Managed by Lovable"
3. Insira o **Client ID** e **Client Secret** das novas credenciais

---

## Notas Importantes

### Credenciais Existentes

O projecto já tem secrets `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` configurados. Estes são usados para a **integração do Google Calendar**, não para login.

Para o login, as credenciais devem ser configuradas directamente nas **Authentication Settings** do Lovable Cloud, não como secrets.

### Resultado Final

Após a configuração:
- Os clientes verão "WillFlow" (ou o nome que definir) durante o login
- Sem qualquer referência ao Lovable
- Experiência totalmente white-label

---

## Próximos Passos

1. **Você**: Criar as credenciais na Google Cloud Console seguindo os passos acima
2. **Você**: Adicionar as credenciais nas Authentication Settings do Lovable Cloud
3. **Eu**: Testar o login para confirmar que funciona correctamente
