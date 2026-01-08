import { useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Pencil, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { CategoryForm } from './CategoryForm';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import type { Category, CategoryFormData } from '@/types/transaction';

const CategoryItem = memo(function CategoryItem({
  category,
  onUpdate,
  onDelete,
  isUserCategory,
}: {
  category: Category;
  onUpdate: (id: string, data: CategoryFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isUserCategory: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${category.color}20` }}
        >
          <CategoryIcon
            icon={category.icon}
            className="w-4 h-4"
            style={{ color: category.color }}
          />
        </div>
        <div>
          <p className="font-medium text-sm">{category.name}</p>
          <p className="text-xs text-muted-foreground">
            {category.type === 'entrada' ? 'Entrada' : 'Saída'}
          </p>
        </div>
      </div>

      {isUserCategory && (
        <div className="flex items-center gap-1">
          <CategoryForm
            onSubmit={async () => {}}
            onUpdate={onUpdate}
            editCategory={category}
            open={editOpen}
            onOpenChange={setEditOpen}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="w-4 h-4" />
              </Button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir "{category.name}"? Transações usando esta categoria não serão excluídas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(category.id)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </motion.div>
  );
});

export const CategoryManager = memo(function CategoryManager() {
  const [open, setOpen] = useState(false);
  const { 
    categories, 
    createCategory, 
    updateCategory, 
    deleteCategory,
    getUserCategories,
    getSystemCategories,
  } = useCategories();
  const { toast } = useToast();

  const userCategories = getUserCategories();
  const systemCategories = getSystemCategories();

  const handleCreate = useCallback(async (data: CategoryFormData) => {
    try {
      await createCategory(data);
      toast({ title: 'Categoria criada!', description: 'Sua categoria foi adicionada.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível criar a categoria.', variant: 'destructive' });
    }
  }, [createCategory, toast]);

  const handleUpdate = useCallback(async (id: string, data: CategoryFormData) => {
    try {
      await updateCategory(id, data);
      toast({ title: 'Categoria atualizada!', description: 'As alterações foram salvas.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar a categoria.', variant: 'destructive' });
    }
  }, [updateCategory, toast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteCategory(id);
      toast({ title: 'Categoria excluída', description: 'A categoria foi removida.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir a categoria.', variant: 'destructive' });
    }
  }, [deleteCategory, toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Categorias</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Gerenciar Categorias
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="mb-4">
            <CategoryForm onSubmit={handleCreate} />
          </div>

          <Tabs defaultValue="user" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="user">Minhas ({userCategories.length})</TabsTrigger>
              <TabsTrigger value="system">Sistema ({systemCategories.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="user" className="flex-1 overflow-y-auto mt-4">
              {userCategories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma categoria personalizada</p>
                  <p className="text-sm">Crie suas próprias categorias acima</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {userCategories.map((cat) => (
                      <CategoryItem
                        key={cat.id}
                        category={cat}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        isUserCategory
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="system" className="flex-1 overflow-y-auto mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Categorias do sistema são pré-definidas e não podem ser editadas.
              </p>
              <div className="space-y-2">
                {systemCategories.map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    category={cat}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    isUserCategory={false}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
});
