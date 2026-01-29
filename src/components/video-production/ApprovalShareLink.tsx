import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Link, Copy, Check, RefreshCw, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVideoApproval, VideoApprovalToken } from '@/hooks/useVideoApproval';
import { useToast } from '@/hooks/use-toast';

interface ApprovalShareLinkProps {
  taskId: string;
  workspaceId: string;
  className?: string;
}

export function ApprovalShareLink({ taskId, workspaceId, className }: ApprovalShareLinkProps) {
  const { token, generateToken, revokeToken, getApprovalUrl } = useVideoApproval(taskId);
  const { toast } = useToast();
  
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateToken(
        workspaceId,
        clientName || undefined,
        clientEmail || undefined,
        expiresInDays ? parseInt(expiresInDays) : undefined
      );
      setShowGenerateModal(false);
      setClientName('');
      setClientEmail('');
    } catch (error) {
      // Error handled in hook
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!token) return;
    
    const url = getApprovalUrl(token.token);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: 'Link copiado!' });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const approvalUrl = token ? getApprovalUrl(token.token) : null;

  return (
    <div className={cn("space-y-3", className)}>
      {token && approvalUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Link de aprovação ativo</span>
          </div>

          {/* Link display */}
          <div className="flex items-center gap-2">
            <Input
              value={approvalUrl}
              readOnly
              className="text-sm font-mono bg-muted"
            />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(approvalUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          {/* Token info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>
              {token.client_name && <span>Cliente: {token.client_name}</span>}
            </div>
            <div className="flex items-center gap-2">
              {token.expires_at && (
                <span>Expira: {new Date(token.expires_at).toLocaleDateString('pt-PT')}</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-destructive"
                onClick={revokeToken}
              >
                <X className="h-3 w-3 mr-1" />
                Revogar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setShowGenerateModal(true)}
        >
          <Link className="h-4 w-4 mr-2" />
          Gerar link de aprovação
        </Button>
      )}

      {/* Generate modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar link de aprovação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome do cliente (opcional)</Label>
              <Input
                id="clientName"
                placeholder="Ex: João Silva"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email do cliente (opcional)</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="cliente@email.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expirar em (dias)</Label>
              <Input
                id="expires"
                type="number"
                placeholder="7"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para não expirar
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'A gerar...' : 'Gerar link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
