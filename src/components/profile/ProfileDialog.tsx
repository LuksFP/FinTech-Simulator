import { useState, useEffect, useCallback } from 'react';
import { User, Loader2, KeyRound, Save } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { safeStringSchema } from '@/lib/validation';
import { strongPasswordSchema } from '@/lib/passwordStrength';

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ name, email }: { name: string; email: string }) {
  const initials = name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
    : email.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2 mb-6">
      <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold select-none shadow-lg">
        {initials}
      </div>
      <p className="text-sm text-muted-foreground">{email}</p>
    </div>
  );
}

// ─── Perfil Tab ────────────────────────────────────────────────────────────────

function PerfilTab({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) return;

        if (!cancelled) {
          setEmail(user.email ?? '');
          setUserId(user.id);
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!cancelled) {
          setFullName(profile?.full_name ?? '');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userId) return;

      setIsSaving(true);
      try {
        const trimmed = fullName.trim();
        if (trimmed) {
          const result = safeStringSchema(2, 100, 'Nome').safeParse(trimmed);
          if (!result.success) throw new Error(result.error.errors[0].message);
        }

        const { error } = await supabase.from('profiles').upsert(
          { user_id: userId, full_name: trimmed || null },
          { onConflict: 'user_id' }
        );

        if (error) throw error;

        toast({ title: 'Perfil salvo!', description: 'Suas informações foram atualizadas.' });
        onClose();
      } catch (err) {
        toast({
          title: 'Erro ao salvar',
          description: err instanceof Error ? err.message : 'Ocorreu um erro inesperado.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [userId, fullName, toast, onClose]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <UserAvatar name={fullName} email={email} />

      <div className="space-y-2">
        <Label htmlFor="profile-fullname">Nome completo</Label>
        <Input
          id="profile-fullname"
          type="text"
          placeholder="Seu nome completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-email">E-mail</Label>
        <Input
          id="profile-email"
          type="email"
          value={email}
          readOnly
          disabled
          className="opacity-60 cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">
          O e-mail não pode ser alterado por aqui.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isSaving}
        className="w-full bg-gradient-primary text-primary-foreground"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Salvar perfil
          </>
        )}
      </Button>
    </form>
  );
}

// ─── Segurança Tab ─────────────────────────────────────────────────────────────

function SegurancaTab({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const validate = useCallback(() => {
    const next: typeof errors = {};
    const pwResult = strongPasswordSchema.safeParse(newPassword);
    if (!pwResult.success) {
      next.newPassword = pwResult.error.errors[0].message;
    }
    if (newPassword !== confirmPassword) {
      next.confirmPassword = 'As senhas não coincidem.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [newPassword, confirmPassword]);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setIsSaving(true);
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) throw error;

        toast({ title: 'Senha alterada!', description: 'Sua senha foi atualizada com sucesso.' });
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      } catch (err) {
        toast({
          title: 'Erro ao alterar senha',
          description: err instanceof Error ? err.message : 'Ocorreu um erro inesperado.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [newPassword, validate, toast, onClose]
  );

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50 mb-2">
        <KeyRound className="w-5 h-5 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium">Alterar senha</p>
          <p className="text-xs text-muted-foreground">
            Escolha uma senha forte com pelo menos 6 caracteres.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="security-new-password">Nova senha</Label>
        <Input
          id="security-new-password"
          type="password"
          placeholder="••••••••"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
          }}
          autoComplete="new-password"
        />
        {errors.newPassword && (
          <p className="text-xs text-destructive">{errors.newPassword}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="security-confirm-password">Confirmar nova senha</Label>
        <Input
          id="security-confirm-password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword)
              setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          autoComplete="new-password"
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSaving || !newPassword || !confirmPassword}
        className="w-full bg-gradient-primary text-primary-foreground"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Alterar senha
          </>
        )}
      </Button>
    </form>
  );
}

// ─── Main Dialog ───────────────────────────────────────────────────────────────

export function ProfileDialog() {
  const [open, setOpen] = useState(false);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="border-white/20 bg-white/5 hover:bg-white/10"
          aria-label="Meu perfil"
        >
          <User className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Minha Conta
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="perfil" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="seguranca">Segurança</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <PerfilTab onClose={handleClose} />
          </TabsContent>

          <TabsContent value="seguranca">
            <SegurancaTab onClose={handleClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
