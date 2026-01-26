import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FileText, CheckCircle, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { SignaturePad } from '@/components/contracts/SignaturePad';
import { usePublicContract } from '@/hooks/useContracts';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import DOMPurify from 'dompurify';

export default function ContractSign() {
  const { token } = useParams<{ token: string }>();
  const { contract, loading, error, signContract } = usePublicContract(token);
  
  const [signerName, setSignerName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const handleSign = async (signatureData: string) => {
    if (!signerName.trim() || !acceptedTerms) return;
    
    setSigning(true);
    const success = await signContract(signerName.trim(), signatureData);
    setSigning(false);
    
    if (success) {
      setSigned(true);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">A carregar contrato...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Contrato Indisponível</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Already signed
  if (contract?.status === 'signed' || signed) {
    return (
      <>
        <Helmet>
          <title>Contrato Assinado | WillFlow</title>
        </Helmet>
        
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Contrato Assinado com Sucesso!</h1>
            <p className="text-muted-foreground mb-6">
              {signed 
                ? 'A sua assinatura foi registada. Obrigado!'
                : `Este contrato foi assinado em ${contract?.signed_at ? format(new Date(contract.signed_at), "d 'de' MMMM 'de' yyyy", { locale: pt }) : ''}.`
              }
            </p>
            <div className="p-4 rounded-xl bg-card border text-left">
              <p className="text-sm text-muted-foreground mb-1">Contrato</p>
              <p className="font-medium">{contract?.title}</p>
              {contract?.client_signed_name && (
                <>
                  <p className="text-sm text-muted-foreground mt-3 mb-1">Assinado por</p>
                  <p className="font-medium">{contract.client_signed_name}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!contract) return null;

  return (
    <>
      <Helmet>
        <title>{contract.title} | Assinatura Digital</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-1">{contract.title}</h1>
            <p className="text-muted-foreground">
              Por favor, leia atentamente e assine no final
            </p>
          </div>

          {/* Contract Info */}
          <div className="p-4 rounded-xl bg-card/80 backdrop-blur-sm border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Cliente</p>
                <p className="font-medium">{contract.client?.name}</p>
              </div>
              {contract.client?.company && (
                <div>
                  <p className="text-muted-foreground">Empresa</p>
                  <p className="font-medium">{contract.client.company}</p>
                </div>
              )}
              {contract.total_value && (
                <div>
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(contract.total_value)}
                  </p>
                </div>
              )}
              {contract.expires_at && (
                <div>
                  <p className="text-muted-foreground">Válido até</p>
                  <p className="font-medium">
                    {format(new Date(contract.expires_at), "d MMM yyyy", { locale: pt })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contract Content - Sanitized for XSS prevention */}
          <div className="p-6 rounded-xl bg-white border shadow-sm">
            <div 
              className="prose prose-sm max-w-none whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(contract.content, {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'span'],
                  ALLOWED_ATTR: ['class']
                })
              }}
            />
          </div>

          {/* Payment Terms */}
          {contract.payment_terms && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm font-medium text-amber-700 mb-1">Condições de Pagamento</p>
              <p className="text-sm">{contract.payment_terms}</p>
            </div>
          )}

          <Separator />

          {/* Signature Section */}
          <div className="p-6 rounded-xl bg-card/80 backdrop-blur-sm border space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Assinatura Digital
            </h2>

            {/* Signer Name */}
            <div className="space-y-2">
              <Label htmlFor="signerName">Nome Completo do Signatário *</Label>
              <Input
                id="signerName"
                placeholder="Digite o seu nome completo"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
              />
            </div>

            {/* Terms Acceptance */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              />
              <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                Li e aceito todos os termos e condições descritos neste contrato. 
                Compreendo que esta assinatura digital tem o mesmo valor legal que uma assinatura manuscrita.
              </label>
            </div>

            {/* Signature Pad */}
            <div className="space-y-2">
              <Label>Assinatura *</Label>
              <SignaturePad 
                onSign={handleSign}
                disabled={!signerName.trim() || !acceptedTerms || signing}
              />
              {(!signerName.trim() || !acceptedTerms) && (
                <p className="text-xs text-muted-foreground">
                  Preencha o nome e aceite os termos para poder assinar.
                </p>
              )}
            </div>

            {signing && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">A processar assinatura...</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Powered by WillFlow • Documento gerado electronicamente
          </p>
        </div>
      </div>
    </>
  );
}
