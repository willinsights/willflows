import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

interface AuthorizationDetails {
  client?: { name?: string; client_name?: string; redirect_uri?: string };
  redirect_uri?: string;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
}
interface OAuthResult { data: AuthorizationDetails | null; error: { message: string } | null }
interface OAuthApi {
  getAuthorizationDetails(id: string): Promise<OAuthResult>;
  approveAuthorization(id: string, options?: { skipBrowserRedirect: boolean }): Promise<OAuthResult>;
  denyAuthorization(id: string, options?: { skipBrowserRedirect: boolean }): Promise<OAuthResult>;
}
// Retain the installed SDK methods; only the beta namespace's typing is adapted.
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const id = params.get('authorization_id') ?? '';
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const next = window.location.pathname + window.location.search + window.location.hash;

  useEffect(() => {
    let active = true;
    if (loading) return;
    setDetails(null);
    setError(null);
    if (!id) { setError('Este pedido de conexão é inválido. Inicie novamente a conexão no assistente.'); return; }
    if (!user) { navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true }); return; }
    (async () => {
      try {
        if (!oauth) throw new Error('Autorização indisponível');
        const { data, error } = await oauth.getAuthorizationDetails(id);
        if (!active) return;
        if (error || !data) throw new Error('Pedido indisponível');
        const target = data.redirect_url ?? data.redirect_to;
        if (target && !data.client) { window.location.assign(target); return; }
        if (!data.client) throw new Error('Cliente inválido');
        setDetails(data);
      } catch {
        if (active) setError('Não foi possível abrir este pedido. Ele pode ter expirado; tente novamente ou reinicie a conexão no assistente.');
      }
    })();
    return () => { active = false; };
  }, [id, user, loading, navigate, next, attempt]);

  async function decide(approve: boolean) {
    if (busy || !details || !id) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth.approveAuthorization(id, { skipBrowserRedirect: true })
        : await oauth.denyAuthorization(id, { skipBrowserRedirect: true });
      const target = data?.redirect_url ?? data?.redirect_to;
      if (error || !target) throw new Error('Não foi possível concluir');
      window.location.assign(target);
    } catch {
      setError(approve ? 'Não foi possível autorizar a conexão. Tente novamente.' : 'Não foi possível cancelar a conexão. Tente novamente.');
      setBusy(false);
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? 'Assistente';
  const scopes = details?.scopes ?? details?.scope?.split(' ').filter(Boolean) ?? [];
  const scopeLabels: Record<string, string> = { openid: 'Identificar sua conta', email: 'Compartilhar seu e-mail', profile: 'Compartilhar seu perfil básico' };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <Helmet><title>Conectar assistente · WillFlow</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <section className="w-full max-w-lg space-y-6 rounded-lg border border-border bg-card p-6 sm:p-8">
        <Logo className="h-9" />
        <div className="space-y-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="break-words text-2xl font-semibold">Conectar {clientName} ao WillFlow</h1>
          {user && <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="break-all text-muted-foreground">{user.email}</span><Button variant="ghost" size="sm" disabled={busy} onClick={async () => { await signOut(); navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true }); }}>Trocar conta</Button></div>}
        </div>
        {error && <div role="alert" className="space-y-3"><p className="text-sm text-destructive">{error}</p>{!details && id && <Button variant="outline" onClick={() => setAttempt(a => a + 1)}>Tentar novamente</Button>}</div>}
        {!details && !error && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Carregando pedido…</div>}
        {details && <>
          <p className="text-sm">{clientName} poderá consultar seus estúdios e projetos como você, sem alterar dados.</p>
          {(details.redirect_uri || details.client?.redirect_uri) && <p className="break-all text-xs text-muted-foreground">Destino: {details.redirect_uri || details.client?.redirect_uri}</p>}
          {scopes.length > 0 && <ul className="space-y-2 text-sm">{scopes.map(scope => <li key={scope}>{scopeLabels[scope] ?? `Permissão adicional solicitada: ${scope}`}</li>)}</ul>}
          <p className="text-sm text-muted-foreground">As permissões da sua conta continuam valendo. Valores financeiros, contatos de clientes e ações de exclusão ou pagamento não são disponibilizados.</p>
          <div className="flex flex-col gap-2 sm:flex-row"><Button className="flex-1" disabled={busy} onClick={() => decide(true)}>{busy ? 'Aguarde…' : 'Autorizar conexão'}</Button><Button className="flex-1" variant="outline" disabled={busy} onClick={() => decide(false)}>Cancelar conexão</Button></div>
        </>}
        <Button variant="link" asChild><Link to="/app">Voltar ao WillFlow</Link></Button>
      </section>
    </main>
  );
}
