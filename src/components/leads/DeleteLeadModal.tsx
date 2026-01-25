import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { Lead } from '@/hooks/useLeads';

interface DeleteLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  leads?: Lead[];
  onConfirm: () => Promise<void>;
}

export function DeleteLeadModal({
  open,
  onOpenChange,
  lead,
  leads,
  onConfirm,
}: DeleteLeadModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
    onOpenChange(false);
  };

  const isBulk = leads && leads.length > 0;
  const count = isBulk ? leads.length : 1;

  if (!lead && !isBulk) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {isBulk ? `Eliminar ${count} Leads?` : 'Eliminar Lead?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {isBulk ? (
              <>
                Esta ação é irreversível. Os <strong>{count} leads selecionados</strong> serão
                removidos permanentemente do sistema.
                {count <= 5 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {leads.map((l) => (
                      <li key={l.id} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                        {l.name}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                Esta ação é irreversível. O lead <strong>"{lead?.name}"</strong> será
                removido permanentemente do sistema.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? 'Eliminando...' : isBulk ? `Eliminar ${count}` : 'Eliminar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
