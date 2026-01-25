import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { LEAD_SOURCES, type Lead } from '@/hooks/useLeads';

interface ParsedLead {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  lead_source?: string;
  estimated_value?: number;
  notes?: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

interface ImportLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLeads: Lead[];
  onImport: (leads: Omit<ParsedLead, 'isValid' | 'isDuplicate' | 'errors'>[]) => Promise<{ success: number; failed: number }>;
}

const HEADER_MAP: Record<string, string> = {
  'nome': 'name', 'name': 'name',
  'email': 'email', 'e-mail': 'email', 'correio': 'email',
  'telefone': 'phone', 'phone': 'phone', 'tel': 'phone', 'telemovel': 'phone', 'telemóvel': 'phone',
  'empresa': 'company', 'company': 'company', 'companhia': 'company',
  'origem': 'lead_source', 'source': 'lead_source', 'fonte': 'lead_source',
  'valor': 'estimated_value', 'value': 'estimated_value', 'valor_estimado': 'estimated_value',
  'notas': 'notes', 'notes': 'notes', 'observacoes': 'notes', 'observações': 'notes',
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ImportLeadsModal({ open, onOpenChange, existingLeads, onImport }: ImportLeadsModalProps) {
  const [tab, setTab] = useState<'paste' | 'upload'>('paste');
  const [textContent, setTextContent] = useState('');
  const [defaultSource, setDefaultSource] = useState('outro');
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const existingEmails = useMemo(() => {
    return new Set(existingLeads.map(l => l.email?.toLowerCase()).filter(Boolean));
  }, [existingLeads]);

  const validateLead = (lead: Partial<ParsedLead>): ParsedLead => {
    const errors: string[] = [];
    
    if (!lead.name?.trim()) {
      errors.push('Nome obrigatório');
    }
    
    if (lead.email && !emailRegex.test(lead.email)) {
      errors.push('Email inválido');
    }

    const isDuplicate = lead.email ? existingEmails.has(lead.email.toLowerCase()) : false;

    return {
      name: lead.name?.trim() || '',
      email: lead.email?.trim() || undefined,
      phone: lead.phone?.trim() || undefined,
      company: lead.company?.trim() || undefined,
      lead_source: lead.lead_source || defaultSource,
      estimated_value: lead.estimated_value,
      notes: lead.notes?.trim() || undefined,
      isValid: errors.length === 0,
      isDuplicate,
      errors,
    };
  };

  const parseCSV = (content: string): ParsedLead[] => {
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/["']/g, ''));
    const columnIndices: Record<string, number> = {};

    headers.forEach((header, index) => {
      const mappedKey = HEADER_MAP[header];
      if (mappedKey && columnIndices[mappedKey] === undefined) {
        columnIndices[mappedKey] = index;
      }
    });

    return lines.slice(1).map(line => {
      const values = line.split(/[,;\t]/).map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      const lead: Partial<ParsedLead> = {};
      
      if (columnIndices.name !== undefined) lead.name = values[columnIndices.name];
      if (columnIndices.email !== undefined) lead.email = values[columnIndices.email];
      if (columnIndices.phone !== undefined) lead.phone = values[columnIndices.phone];
      if (columnIndices.company !== undefined) lead.company = values[columnIndices.company];
      if (columnIndices.lead_source !== undefined) lead.lead_source = values[columnIndices.lead_source];
      if (columnIndices.notes !== undefined) lead.notes = values[columnIndices.notes];
      if (columnIndices.estimated_value !== undefined) {
        const val = parseFloat(values[columnIndices.estimated_value]);
        if (!isNaN(val)) lead.estimated_value = val;
      }

      return validateLead(lead);
    });
  };

  const parseSimpleText = (content: string): ParsedLead[] => {
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      const parts = line.split(/[,;\t]/).map(p => p.trim());
      
      const lead: Partial<ParsedLead> = { name: parts[0] };
      
      parts.slice(1).forEach(part => {
        if (emailRegex.test(part)) {
          lead.email = part;
        } else if (/^[\d\s+()-]+$/.test(part) && part.length >= 9) {
          lead.phone = part;
        } else if (!lead.company && part.length > 2) {
          lead.company = part;
        }
      });

      return validateLead(lead);
    });
  };

  const handleParse = () => {
    const content = textContent.trim();
    if (!content) return;

    const firstLine = content.split('\n')[0].toLowerCase();
    const hasHeaders = Object.keys(HEADER_MAP).some(h => firstLine.includes(h));

    const parsed = hasHeaders ? parseCSV(content) : parseSimpleText(content);
    setParsedLeads(parsed);
    
    const validIds = new Set(parsed.map((l, i) => l.isValid && !l.isDuplicate ? i : -1).filter(i => i >= 0));
    setSelectedIds(validIds);
    setShowPreview(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTextContent(content);
      setTab('paste');
    };
    reader.readAsText(file);
  };

  const handleToggleSelect = (index: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const validIds = new Set(parsedLeads.map((l, i) => l.isValid ? i : -1).filter(i => i >= 0));
      setSelectedIds(validIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleImport = async () => {
    const leadsToImport = parsedLeads
      .filter((_, i) => selectedIds.has(i))
      .map(({ isValid, isDuplicate, errors, ...lead }) => lead);

    if (leadsToImport.length === 0) return;

    setImporting(true);
    try {
      const result = await onImport(leadsToImport);
      if (result.success > 0) {
        handleClose();
      }
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setTextContent('');
    setParsedLeads([]);
    setSelectedIds(new Set());
    setShowPreview(false);
    onOpenChange(false);
  };

  const stats = useMemo(() => {
    const valid = parsedLeads.filter(l => l.isValid && !l.isDuplicate).length;
    const duplicates = parsedLeads.filter(l => l.isDuplicate).length;
    const invalid = parsedLeads.filter(l => !l.isValid).length;
    const selected = selectedIds.size;
    const totalValue = parsedLeads
      .filter((_, i) => selectedIds.has(i))
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

    return { valid, duplicates, invalid, selected, totalValue };
  }, [parsedLeads, selectedIds]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Leads</DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4 flex-1">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'paste' | 'upload')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste">
                  <FileText className="h-4 w-4 mr-2" />
                  Colar Texto
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-4">
                <div>
                  <Label>Cole os dados dos leads (CSV ou texto simples)</Label>
                  <Textarea
                    placeholder={`Formato CSV:\nnome,email,telefone,empresa,origem,valor_estimado\nJoão Silva,joao@email.pt,912345678,Empresa X,instagram,5000\n\nOu formato simples:\nJoão Silva, joao@email.pt, 912345678\nMaria Santos, maria@email.pt`}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <span className="text-primary hover:underline">Clique para seleccionar</span>
                    {' '}ou arraste um ficheiro CSV
                  </Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Formatos suportados: CSV, TXT (máx. 100 leads)
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div>
              <Label>Origem padrão (para leads sem origem especificada)</Label>
              <Select value={defaultSource} onValueChange={setDefaultSource}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map(source => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {stats.valid} válidos
              </Badge>
              <Badge variant="outline" className="gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                {stats.duplicates} duplicados
              </Badge>
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="h-3 w-3 text-destructive" />
                {stats.invalid} inválidos
              </Badge>
              {stats.totalValue > 0 && (
                <Badge variant="secondary">
                  Valor total: €{stats.totalValue.toLocaleString('pt-PT')}
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={stats.selected === stats.valid + stats.duplicates}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedLeads.map((lead, index) => (
                    <TableRow
                      key={index}
                      className={!lead.isValid ? 'opacity-50' : lead.isDuplicate ? 'bg-amber-500/10' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(index)}
                          onCheckedChange={() => handleToggleSelect(index)}
                          disabled={!lead.isValid}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {lead.name || <span className="text-destructive">—</span>}
                      </TableCell>
                      <TableCell>{lead.email || '—'}</TableCell>
                      <TableCell>{lead.phone || '—'}</TableCell>
                      <TableCell>{lead.company || '—'}</TableCell>
                      <TableCell>
                        {!lead.isValid ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {lead.errors[0]}
                          </Badge>
                        ) : lead.isDuplicate ? (
                          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            Duplicado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-emerald-500 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Válido
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2">
          {showPreview && (
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Voltar
            </Button>
          )}
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          {!showPreview ? (
            <Button onClick={handleParse} disabled={!textContent.trim()}>
              Pré-visualizar
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={stats.selected === 0 || importing}>
              {importing ? 'A importar...' : `Importar ${stats.selected} Lead${stats.selected !== 1 ? 's' : ''}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
