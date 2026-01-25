import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, Phone, Mail, Users, MessageSquare, Video, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface CreateCommunicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    type: string;
    subject: string;
    description?: string;
    contact_date: string;
    meet_url?: string;
  }) => Promise<boolean>;
}

const communicationTypes = [
  { value: 'call', label: 'Chamada', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Reunião', icon: Users },
  { value: 'other', label: 'Outro', icon: MessageSquare },
];

export function CreateCommunicationModal({
  open,
  onOpenChange,
  onSubmit,
}: CreateCommunicationModalProps) {
  const { currentWorkspace } = useWorkspace();
  const { connection: googleConnection } = useGoogleCalendar();
  
  const [type, setType] = useState('call');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${Math.floor(now.getMinutes() / 30) * 30 === 0 ? '00' : '30'}`;
  });
  const [loading, setLoading] = useState(false);
  const [autoCreateMeet, setAutoCreateMeet] = useState(false);
  const [creatingMeet, setCreatingMeet] = useState(false);

  // Gerar opções de hora (intervalos de 30 minutos)
  const timeOptions = Array.from({ length: 24 }, (_, h) => [
    `${h.toString().padStart(2, '0')}:00`,
    `${h.toString().padStart(2, '0')}:30`,
  ]).flat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    setLoading(true);
    
    // Combinar data + hora
    const contactDateTime = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    contactDateTime.setHours(hours, minutes, 0, 0);
    
    // Calcular end time (1 hora depois por padrão)
    const endDateTime = new Date(contactDateTime);
    endDateTime.setHours(endDateTime.getHours() + 1);
    
    let meetUrl: string | undefined;
    
    // Criar Google Meet se solicitado
    if (type === 'meeting' && autoCreateMeet && currentWorkspace?.id) {
      setCreatingMeet(true);
      try {
        const { data, error } = await supabase.functions.invoke('create-google-meet', {
          body: {
            workspaceId: currentWorkspace.id,
            title: `Reunião: ${subject.trim()}`,
            startAt: contactDateTime.toISOString(),
            endAt: endDateTime.toISOString(),
            description: description.trim() || undefined,
          },
        });
        
        if (!error && data?.meetUrl) {
          meetUrl = data.meetUrl;
        }
      } catch (err) {
        console.error('Error creating Google Meet:', err);
      } finally {
        setCreatingMeet(false);
      }
    }
    
    const success = await onSubmit({
      type,
      subject: subject.trim(),
      description: description.trim() || undefined,
      contact_date: contactDateTime.toISOString(),
      meet_url: meetUrl,
    });

    if (success) {
      setType('call');
      setSubject('');
      setDescription('');
      setDate(new Date());
      setTime(`${new Date().getHours().toString().padStart(2, '0')}:00`);
      setAutoCreateMeet(false);
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Comunicação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {communicationTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <t.icon className="h-4 w-4" />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Discussão sobre novo projeto"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy', { locale: pt }) : 'Data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Hora" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Google Meet Toggle */}
          {type === 'meeting' && googleConnection?.is_connected && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-600" />
                <Label htmlFor="auto-meet" className="cursor-pointer text-sm">
                  Criar Google Meet automaticamente
                </Label>
              </div>
              <Switch
                id="auto-meet"
                checked={autoCreateMeet}
                onCheckedChange={setAutoCreateMeet}
              />
            </div>
          )}
          
          {type === 'meeting' && !googleConnection?.is_connected && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Conecte o Google Calendar nas definições para criar links Meet automaticamente
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes da comunicação..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || creatingMeet || !subject.trim()}>
              {creatingMeet ? 'Criando Meet...' : loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
