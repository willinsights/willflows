import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PendingItem {
  id: string;
  title: string;
}

interface ChecklistPendingAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingItems: PendingItem[];
  pendingTasksCount?: number;
  pendingChecklistsCount?: number;
  message?: string;
}

export function ChecklistPendingAlert({
  open,
  onOpenChange,
  pendingItems,
  pendingTasksCount = 0,
  pendingChecklistsCount = 0,
  message,
}: ChecklistPendingAlertProps) {
  const totalPending = pendingTasksCount + pendingChecklistsCount;
  const displayItems = pendingItems.slice(0, 8);
  const remainingCount = pendingItems.length - displayItems.length;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Checklist Incompleta
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {message || `Existem ${totalPending} item(ns) pendente(s) que precisam ser concluídos antes de entregar o projeto.`}
              </p>
              
              {displayItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Itens pendentes:</p>
                  <ScrollArea className="max-h-[200px]">
                    <ul className="space-y-1.5">
                      {displayItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/50 shrink-0" />
                          <span className="line-clamp-2">{item.title}</span>
                        </li>
                      ))}
                      {remainingCount > 0 && (
                        <li className="text-xs text-muted-foreground italic px-2 py-1">
                          ... e mais {remainingCount} item(ns)
                        </li>
                      )}
                    </ul>
                  </ScrollArea>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground border-t pt-2">
                Complete todos os itens do checklist antes de marcar o projeto como concluído.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="bg-warning text-warning-foreground hover:bg-warning/90">
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
