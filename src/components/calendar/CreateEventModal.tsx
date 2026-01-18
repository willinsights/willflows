import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, Clock, MapPin, Video, FileText, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: {
    title: string;
    description?: string;
    start_at: string;
    end_at?: string;
    all_day: boolean;
    location?: string;
    event_type: string;
    video_call_url?: string;
    is_private?: boolean;
  }) => Promise<any>;
  initialDate?: Date;
  initialHour?: number;
}

export function CreateEventModal({
  open,
  onOpenChange,
  onSubmit,
  initialDate,
  initialHour,
}: CreateEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(initialDate || new Date());
  const [startTime, setStartTime] = useState(
    initialHour ? `${initialHour.toString().padStart(2, '0')}:00` : '09:00'
  );
  const [endTime, setEndTime] = useState(
    initialHour ? `${(initialHour + 1).toString().padStart(2, '0')}:00` : '10:00'
  );
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [videoCallUrl, setVideoCallUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setIsSubmitting(true);
    try {
      const startAt = allDay
        ? format(date, "yyyy-MM-dd'T'00:00:00")
        : `${format(date, 'yyyy-MM-dd')}T${startTime}:00`;
      
      const endAt = allDay
        ? format(date, "yyyy-MM-dd'T'23:59:59")
        : `${format(date, 'yyyy-MM-dd')}T${endTime}:00`;

      const result = await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        start_at: startAt,
        end_at: endAt,
        all_day: allDay,
        location: location.trim() || undefined,
        event_type: eventType,
        video_call_url: videoCallUrl.trim() || undefined,
        is_private: isPrivate,
      });

      if (result) {
        // Reset form
        setTitle('');
        setDescription('');
        setDate(new Date());
        setStartTime('09:00');
        setEndTime('10:00');
        setAllDay(false);
        setLocation('');
        setEventType('meeting');
        setVideoCallUrl('');
        setIsPrivate(false);
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate time options
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Novo Evento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do evento"
              required
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Reunião</SelectItem>
                <SelectItem value="reminder">Lembrete</SelectItem>
                <SelectItem value="deadline">Prazo</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Data</Label>
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
                  {date ? format(date, "d 'de' MMMM, yyyy", { locale: pt }) : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={pt}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="all-day" className="cursor-pointer">Dia inteiro</Label>
            <Switch
              id="all-day"
              checked={allDay}
              onCheckedChange={setAllDay}
            />
          </div>

          {/* Private Event Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="is-private" className="cursor-pointer">Evento Privado</Label>
            </div>
            <Switch
              id="is-private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>
          {isPrivate && (
            <p className="text-xs text-muted-foreground -mt-2">
              Este evento só será visível para si.
            </p>
          )}

          {/* Time Selection */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Início
                </Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Fim
                </Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Localização
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Escritório, Hotel ABC..."
            />
          </div>

          {/* Video Call URL */}
          {eventType === 'meeting' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                Link de Videochamada
              </Label>
              <Input
                value={videoCallUrl}
                onChange={(e) => setVideoCallUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Descrição
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'A criar...' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
