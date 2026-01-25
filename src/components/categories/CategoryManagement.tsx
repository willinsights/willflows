import { useState } from 'react';
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCategories, Category } from '@/hooks/useCategories';

interface CategoryManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colorOptions = [
  '#8224e3', '#3b82f6', '#00E5E5', '#f59e0b', 
  '#ef4444', '#ec4899', '#6366f1', '#22d3ee'
];

export function CategoryManagement({ open, onOpenChange }: CategoryManagementProps) {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('#8224e3');

  const resetForm = () => {
    setName('');
    setColor('#8224e3');
    setIsCreating(false);
    setEditingCategory(null);
  };

  const handleStartEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setColor(category.color);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setFormLoading(true);
    
    if (editingCategory) {
      await updateCategory(editingCategory.id, name.trim(), color);
    } else {
      await createCategory(name.trim(), color);
    }
    
    setFormLoading(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    
    setFormLoading(true);
    await deleteCategory(deletingCategory.id);
    setFormLoading(false);
    setDeletingCategory(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerir Categorias</DialogTitle>
            <DialogDescription>
              Crie, edite ou elimine categorias do workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category List */}
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma categoria criada
              </p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {categories.map((category) => (
                  <div 
                    key={category.id} 
                    className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.color }} 
                      />
                      <span className="font-medium text-sm">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleStartEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingCategory(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create/Edit Form */}
            {(isCreating || editingCategory) && (
              <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="categoryName">
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                  </Label>
                  <Input
                    id="categoryName"
                    placeholder="Nome da categoria"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`w-8 h-8 rounded-full transition-all ${
                          color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={formLoading || !name.trim()}>
                    {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingCategory ? 'Guardar' : 'Criar'}
                  </Button>
                </div>
              </form>
            )}

            {/* Add Button */}
            {!isCreating && !editingCategory && (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleStartCreate}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar a categoria "{deletingCategory?.name}"? 
              Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
