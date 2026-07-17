import { useState, useEffect } from 'react';
import { Bell, Mail, DollarSign, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SPENDING_ALERT_THRESHOLD } from '@/lib/constants';

export function NotificationSettings() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('notification_email, spending_limit')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setEmail(data.notification_email ?? user.email ?? '');
        setLimit(data.spending_limit ? String(data.spending_limit) : '');
      } else {
        setEmail(user.email ?? '');
      }
    }
    load();
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          notification_email: email || null,
          spending_limit: limit ? Number(limit) : null,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({ title: 'Configurações salvas!', description: 'Você receberá alertas no email informado.' });
      setOpen(false);
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="border-border bg-muted/40 hover:bg-muted" title="Notificações">
          <Bell className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-400" />
            Notificações por Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label className="text-foreground/80 flex items-center gap-2">
              <Mail className="h-4 w-4 text-purple-400" />
              Email para notificações
            </Label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-400" />
              Limite de gastos mensais (R$)
            </Label>
            <Input
              type="number"
              placeholder="Ex: 3000"
              value={limit}
              onChange={e => setLimit(e.target.value)}
              min="0"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Você receberá um alerta quando seus gastos passarem de {Math.round(SPENDING_ALERT_THRESHOLD * 100)}% deste valor.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground font-medium mb-1">Você receberá:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Alerta quando gastos atingirem {Math.round(SPENDING_ALERT_THRESHOLD * 100)}% do limite</li>
              <li>• Resumo mensal no último dia do mês</li>
            </ul>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !email}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
