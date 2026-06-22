import { useState } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useAccounts } from '@/hooks/useAccounts';
import { transferService } from '@/services/transferService';

export function TransferDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { accounts } = useAccounts();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const reset = () => {
    setFromId('');
    setToId('');
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount) || 0;
    if (!fromId || !toId) {
      toast({ title: 'Selecione as contas', variant: 'destructive' });
      return;
    }
    try {
      setIsSubmitting(true);
      await transferService.create({
        from_account_id: fromId,
        to_account_id: toId,
        amount: value,
        description,
        date,
      });
      toast({ title: 'Transferência registrada!', description: 'Os saldos foram atualizados.' });
      reset();
      setOpen(false);
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Não foi possível transferir.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <ArrowLeftRight className="w-4 h-4" />
      <span className="hidden sm:inline">Transferir</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="glass border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ArrowLeftRight className="w-5 h-5" />
            Transferência entre contas
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label>De</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Conta de origem" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} disabled={a.id === toId}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Para</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Conta de destino" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} disabled={a.id === fromId}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-amount">Valor (R$)</Label>
            <Input
              id="transfer-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-secondary/50 border-border/50 font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-date">Data</Label>
            <Input
              id="transfer-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-desc">Descrição (opcional)</Label>
            <Input
              id="transfer-desc"
              placeholder="Ex: Transferência para reserva"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 font-semibold">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Transferir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
