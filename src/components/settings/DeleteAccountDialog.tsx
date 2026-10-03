import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Props {
  deleteAccountModalOpen: boolean;
  setDeleteAccountModalOpen: (v: boolean) => void;
  deleteAccountConfirmText: string;
  setDeleteAccountConfirmText: (v: string) => void;
  handleDeleteAccount: () => void;
  deletingAccount: boolean;
}

export function DeleteAccountDialog({ deleteAccountModalOpen, setDeleteAccountModalOpen, deleteAccountConfirmText, setDeleteAccountConfirmText, handleDeleteAccount, deletingAccount }: Props) {
  return (
      <AlertDialog open={deleteAccountModalOpen} onOpenChange={setDeleteAccountModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Eliminar Conta Permanentemente</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta ação é <strong>irreversível</strong>. Todos os seus dados, incluindo:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Perfil e preferências</li>
                <li>Workspaces onde é o único admin (serão eliminados)</li>
                <li>Projetos e tarefas associados</li>
                <li>Histórico de pagamentos</li>
              </ul>
              <p className="font-medium pt-2">
                Para confirmar, escreva <span className="text-destructive">ELIMINAR</span> abaixo:
              </p>
              <Input
                value={deleteAccountConfirmText}
                onChange={(e) => setDeleteAccountConfirmText(e.target.value.toUpperCase())}
                placeholder="Escreva ELIMINAR"
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteAccountConfirmText('')}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteAccountConfirmText !== 'ELIMINAR'}
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A eliminar...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Conta
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  );
}
