import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DeliverConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onConfirm: (deliveredAt: Date) => void;
  loading?: boolean;
}

export function DeliverConfirmDialog({
  open,
  onOpenChange,
  projectName,
  onConfirm,
  loading = false,
}: DeliverConfirmDialogProps) {
  const [deliveredAt, setDeliveredAt] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm(deliveredAt);
  };

  // Reset date when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDeliveredAt(new Date());
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Concluir Projeto</DialogTitle>
          <DialogDescription>
            Confirmar entrega de "{projectName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Data de Entrega</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !deliveredAt && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveredAt ? (
                    format(deliveredAt, "dd 'de' MMMM 'de' yyyy", { locale: pt })
                  ) : (
                    <span>Selecionar data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deliveredAt}
                  onSelect={(date) => {
                    if (date) {
                      setDeliveredAt(date);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Esta data será usada para os relatórios financeiros
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            <CheckCircle className="mr-2 h-4 w-4" />
            {loading ? 'A entregar...' : 'Confirmar Entrega'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
