import { useState, memo } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategoryIcon, iconOptions } from '@/components/icons/CategoryIcon';
import type { Category, CategoryFormData, TransactionType } from '@/types/transaction';

const colorOptions = [
  { value: '#10b981', label: 'Verde' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#f59e0b', label: 'Laranja' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#6366f1', label: 'Índigo' },
];

interface CategoryFormProps {
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onUpdate?: (id: string, data: CategoryFormData) => Promise<void>;
  editCategory?: Category;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CategoryForm = memo(function CategoryForm({
  onSubmit,
  onUpdate,
  editCategory,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CategoryFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(editCategory?.name || '');
  const [icon, setIcon] = useState(editCategory?.icon || 'tag');
  const [color, setColor] = useState(editCategory?.color || '#10b981');
  const [type, setType] = useState<TransactionType>(editCategory?.type || 'saida');

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;
  const isEditing = !!editCategory;

  const resetForm = () => {
    if (!isEditing) {
      setName('');
      setIcon('tag');
      setColor('#10b981');
      setType('saida');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const data: CategoryFormData = { name, icon, color, type };
      
      if (isEditing && onUpdate && editCategory) {
        await onUpdate(editCategory.id, data);
      } else {
        await onSubmit(data);
      }
      
      resetForm();
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && editCategory) {
      setName(editCategory.name);
      setIcon(editCategory.icon);
      setColor(editCategory.color);
      setType(editCategory.type);
    } else if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Categoria
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da categoria"
              required
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-6 gap-2">
              {iconOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIcon(opt.value)}
                  className={`p-2 rounded-lg border transition-all ${
                    icon === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <CategoryIcon icon={opt.value} className="w-5 h-5 mx-auto" style={{ color }} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    color === opt.value
                      ? 'border-foreground scale-105'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: opt.value }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${color}20` }}
            >
              <CategoryIcon icon={icon} className="w-5 h-5" style={{ color }} />
            </div>
            <span className="font-medium">{name || 'Preview'}</span>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Categoria'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
});
