import { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceOption {
  id: string;
  name: string;
}

interface ImportContactsModalProps {
  open: boolean;
  onClose: () => void;
  workspaces: WorkspaceOption[];
  onImport: (emails: string[], workspaceId: string, role: string) => Promise<{ success: number; failed: number }>;
}

const roleOptions = [
  { value: 'editor', label: 'Editor' },
  { value: 'captacao', label: 'Captação' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'visualizador', label: 'Visualizador' },
];

export function ImportContactsModal({ open, onClose, workspaces, onImport }: ImportContactsModalProps) {
  const { toast } = useToast();
  const [inputMethod, setInputMethod] = useState<'paste' | 'csv'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedRole, setSelectedRole] = useState('editor');
  const [isImporting, setIsImporting] = useState(false);
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState(0);
  const [invalid, setInvalid] = useState(0);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const parseEmails = (text: string) => {
    // Split by comma, semicolon, space, or newline
    const rawEmails = text
      .split(/[,;\s\n]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);

    const valid: string[] = [];
    const seen = new Set<string>();
    let dups = 0;
    let inv = 0;

    rawEmails.forEach(email => {
      if (!emailRegex.test(email)) {
        inv++;
        return;
      }
      if (seen.has(email)) {
        dups++;
        return;
      }
      seen.add(email);
      valid.push(email);
    });

    setParsedEmails(valid);
    setDuplicates(dups);
    setInvalid(inv);
  };

  const handleTextChange = (text: string) => {
    setPastedText(text);
    parseEmails(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPastedText(content);
      parseEmails(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedEmails.length === 0) {
      toast({
        title: 'Sem emails',
        description: 'Adicione pelo menos um email válido',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedWorkspace) {
      toast({
        title: 'Workspace obrigatório',
        description: 'Selecione um workspace',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    
    try {
      const result = await onImport(parsedEmails, selectedWorkspace, selectedRole);
      
      toast({
        title: 'Importação concluída',
        description: `${result.success} convites enviados, ${result.failed} falharam`,
      });

      if (result.success > 0) {
        handleClose();
      }
    } catch (error) {
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu um erro ao enviar os convites',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setPastedText('');
    setParsedEmails([]);
    setDuplicates(0);
    setInvalid(0);
    setSelectedWorkspace('');
    setSelectedRole('editor');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Contactos
          </DialogTitle>
          <DialogDescription>
            Importe uma lista de emails para enviar convites em massa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as 'paste' | 'csv')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste">Colar Emails</TabsTrigger>
              <TabsTrigger value="csv">Upload CSV</TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-2">
              <Label>Emails (separados por vírgula, espaço ou nova linha)</Label>
              <Textarea
                placeholder="email1@exemplo.com, email2@exemplo.com..."
                value={pastedText}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={5}
              />
            </TabsContent>

            <TabsContent value="csv" className="space-y-2">
              <Label>Ficheiro CSV</Label>
              <Input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
              />
              {pastedText && (
                <div className="text-sm text-muted-foreground">
                  Ficheiro carregado com sucesso
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Preview Stats */}
          {pastedText && (
            <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {parsedEmails.length} válidos
              </Badge>
              {duplicates > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {duplicates} duplicados
                </Badge>
              )}
              {invalid > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <X className="h-3 w-3" />
                  {invalid} inválidos
                </Badge>
              )}
            </div>
          )}

          {/* Workspace Selection */}
          <div className="space-y-2">
            <Label>Workspace destino</Label>
            <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar workspace..." />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={parsedEmails.length === 0 || !selectedWorkspace || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A enviar...
                </>
              ) : (
                <>Enviar {parsedEmails.length} Convites</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
