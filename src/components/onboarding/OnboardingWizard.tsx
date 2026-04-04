import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, PartyPopper, Target, User, Sparkles } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'myfinance_onboarding_done';
const TOTAL_STEPS = 4;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  hasTransactions: boolean;
  onComplete: () => void;
  upsertGoal: (amount: number, month: number, year: number) => Promise<void>;
}

// ─── Step Indicator ────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center py-4">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={[
            'block rounded-full transition-all duration-300',
            i < current
              ? 'w-6 h-2 bg-purple-500'
              : i === current
              ? 'w-6 h-2 bg-purple-400'
              : 'w-2 h-2 bg-muted-foreground/30',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const features = [
    { icon: '💳', text: 'Registre entradas e saídas com categorias' },
    { icon: '📊', text: 'Acompanhe gráficos e relatórios mensais' },
    { icon: '🎯', text: 'Defina metas e monitore seu progresso' },
    { icon: '🔔', text: 'Receba alertas de gastos excessivos' },
    { icon: '📈', text: 'Simule investimentos com juros compostos' },
  ];

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Bem-vindo ao MyFinance!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sua plataforma de controle financeiro inteligente.
            <br />
            Veja o que você pode fazer:
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {features.map(({ icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm">
            <span className="text-lg shrink-0">{icon}</span>
            <span className="text-foreground/80">{text}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onNext}
        className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90 transition-opacity"
      >
        Começar configuração
      </Button>
    </div>
  );
}

// ─── Step 2: Profile ──────────────────────────────────────────────────────────

function ProfileStep({ onNext }: { onNext: () => void }) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!fullName.trim()) {
        onNext();
        return;
      }

      setIsSaving(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) throw userError ?? new Error('Usuário não encontrado.');

        const { error } = await supabase.from('profiles').upsert(
          { user_id: user.id, full_name: fullName.trim() },
          { onConflict: 'user_id' }
        );

        if (error) throw error;

        onNext();
      } catch (err) {
        toast({
          title: 'Erro ao salvar nome',
          description: err instanceof Error ? err.message : 'Ocorreu um erro inesperado.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [fullName, onNext, toast]
  );

  return (
    <form onSubmit={handleSave} className="space-y-6 py-2">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
          <User className="w-7 h-7 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Configure seu perfil</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Como você gostaria de ser chamado?
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-name">Nome completo</Label>
        <Input
          id="onboarding-name"
          type="text"
          placeholder="Seu nome completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Você pode alterar isso mais tarde no seu perfil.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          className="flex-1 text-muted-foreground"
          onClick={onNext}
          disabled={isSaving}
        >
          Pular
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continuar'}
        </Button>
      </div>
    </form>
  );
}

// ─── Step 3: Goal ─────────────────────────────────────────────────────────────

function GoalStep({
  onNext,
  upsertGoal,
}: {
  onNext: () => void;
  upsertGoal: (amount: number, month: number, year: number) => Promise<void>;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const parsed = parseFloat(amount.replace(',', '.'));

      if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
        onNext();
        return;
      }

      setIsSaving(true);
      try {
        const now = new Date();
        await upsertGoal(parsed, now.getMonth() + 1, now.getFullYear());
        onNext();
      } catch (err) {
        toast({
          title: 'Erro ao salvar meta',
          description: err instanceof Error ? err.message : 'Ocorreu um erro inesperado.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [amount, onNext, upsertGoal, toast]
  );

  return (
    <form onSubmit={handleSave} className="space-y-6 py-2">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
          <Target className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Defina sua meta mensal</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Qual é seu objetivo de economia para este mês?
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-goal">Meta mensal (R$)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            R$
          </span>
          <Input
            id="onboarding-goal"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Você pode alterar sua meta a qualquer momento no dashboard.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          className="flex-1 text-muted-foreground"
          onClick={onNext}
          disabled={isSaving}
        >
          Pular
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90"
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Definir meta'}
        </Button>
      </div>
    </form>
  );
}

// ─── Step 4: Success ──────────────────────────────────────────────────────────

function SuccessStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <span className="absolute -top-1 -right-1 text-2xl" aria-hidden="true">
            🎉
          </span>
        </div>

        <div>
          <h2 className="text-xl font-bold">Tudo pronto!</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
            Sua conta está configurada. Comece adicionando sua primeira transação e acompanhe
            suas finanças em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PartyPopper className="w-4 h-4 text-yellow-400" />
          <span>Boas finanças! 🚀</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-center">
        {[
          { emoji: '💳', label: 'Adicione transações' },
          { emoji: '🎯', label: 'Monitore suas metas' },
          { emoji: '📊', label: 'Veja relatórios' },
          { emoji: '📈', label: 'Simule investimentos' },
        ].map(({ emoji, label }) => (
          <div
            key={label}
            className="p-3 rounded-lg bg-muted/30 border border-border/40 flex flex-col items-center gap-1"
          >
            <span className="text-xl">{emoji}</span>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={onComplete}
        className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90 transition-opacity font-semibold"
        size="lg"
      >
        Ir para o Dashboard
      </Button>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard({ hasTransactions, onComplete, upsertGoal }: OnboardingWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Auto-open for new users (no transactions + not already completed)
  useEffect(() => {
    const isDone = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!isDone && !hasTransactions) {
      setOpen(true);
    }
  }, [hasTransactions]);

  const handleNext = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
    onComplete();
  }, [onComplete]);

  // Prevent closing via overlay/Escape until the wizard is done
  const handleOpenChange = useCallback(
    (value: boolean) => {
      // Allow closing only from the final CTA (handleComplete)
      if (!value && step < TOTAL_STEPS - 1) return;
      if (!value) handleComplete();
    },
    [step, handleComplete]
  );

  const stepTitles = [
    'Bem-vindo ao MyFinance!',
    'Configure seu perfil',
    'Defina sua meta mensal',
    'Tudo pronto!',
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        // Prevent closing on outside click during onboarding
        onInteractOutside={(e) => {
          if (step < TOTAL_STEPS - 1) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (step < TOTAL_STEPS - 1) e.preventDefault();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <DialogDescription>
            Passo {step + 1} de {TOTAL_STEPS} da configuração inicial do MyFinance.
          </DialogDescription>
        </DialogHeader>

        <StepDots current={step} total={TOTAL_STEPS} />

        {step === 0 && <WelcomeStep onNext={handleNext} />}
        {step === 1 && <ProfileStep onNext={handleNext} />}
        {step === 2 && <GoalStep onNext={handleNext} upsertGoal={upsertGoal} />}
        {step === 3 && <SuccessStep onComplete={handleComplete} />}
      </DialogContent>
    </Dialog>
  );
}
