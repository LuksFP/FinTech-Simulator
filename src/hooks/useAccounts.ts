import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { assertValid, accountSchema, uuidSchema } from '@/lib/validation';
import { apiRateLimiter } from '@/lib/rateLimiter';

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment';

export interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;          // saldo inicial (editável)
  current_balance: number;  // saldo atual = inicial +/- transações +/- transferências
  color: string;
  icon: string;
  is_default: boolean;
}

export interface BankAccountFormData {
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon: string;
  is_default: boolean;
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccounts([]); return; }

      // Lê da view account_balances (saldo computado), respeitando RLS.
      const { data, error: fetchError } = await supabase
        .from('account_balances')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setAccounts((data ?? []).map((a) => ({
        id: a.id ?? '',
        user_id: a.user_id ?? user.id,
        name: a.name ?? '',
        type: (a.type ?? 'checking') as AccountType,
        balance: Number(a.initial_balance ?? 0),
        current_balance: Number(a.current_balance ?? 0),
        color: a.color ?? '#64748b',
        icon: a.icon ?? 'wallet',
        is_default: a.is_default ?? false,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();

    // Saldo depende de bank_accounts, transactions e transfers — escuta os três.
    const channel = supabase
      .channel('account-balances-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, fetchAccounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchAccounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, fetchAccounts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAccounts]);

  const createAccount = useCallback(async (formData: BankAccountFormData): Promise<BankAccount> => {
    const { allowed } = apiRateLimiter.check('account:create');
    if (!allowed) throw new Error('Muitas requisições. Aguarde um momento.');

    assertValid(accountSchema, formData);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    if (formData.is_default) {
      await (supabase.from('bank_accounts' as any).update({ is_default: false }).eq('user_id', user.id));
    }

    const { data, error: insertError } = await (supabase
      .from('bank_accounts' as any)
      .insert({
        user_id: user.id,
        name: formData.name.trim(),
        type: formData.type,
        balance: formData.balance,
        color: formData.color,
        icon: formData.icon,
        is_default: formData.is_default,
      })
      .select('*')
      .single());

    if (insertError) throw insertError;

    const row = data as BankAccount;
    // Conta nova não tem movimento ainda: saldo atual = saldo inicial.
    const created: BankAccount = { ...row, balance: Number(row.balance), current_balance: Number(row.balance) };
    // Optimistic: adiciona imediatamente, desmarcar default das outras se necessário
    setAccounts(prev => {
      const updated = formData.is_default ? prev.map(a => ({ ...a, is_default: false })) : prev;
      return [...updated, created].sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name));
    });
    return created;
  }, []);

  const updateAccount = useCallback(async (id: string, formData: Partial<BankAccountFormData>): Promise<BankAccount> => {
    assertValid(uuidSchema, id);

    if (Object.keys(formData).length > 0) {
      const partial = accountSchema.partial();
      assertValid(partial, formData);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    if (formData.is_default) {
      await (supabase.from('bank_accounts' as any).update({ is_default: false }).eq('user_id', user.id).neq('id', id));
    }

    const updatePayload: Record<string, unknown> = {};
    if (formData.name !== undefined) updatePayload.name = formData.name.trim();
    if (formData.type !== undefined) updatePayload.type = formData.type;
    if (formData.balance !== undefined) updatePayload.balance = formData.balance;
    if (formData.color !== undefined) updatePayload.color = formData.color;
    if (formData.icon !== undefined) updatePayload.icon = formData.icon;
    if (formData.is_default !== undefined) updatePayload.is_default = formData.is_default;

    const { data, error: updateError } = await (supabase
      .from('bank_accounts' as any)
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single());

    if (updateError) throw updateError;

    const row = data as BankAccount;
    const newInitial = Number(row.balance);
    // Optimistic: substitui no state. Ajusta o saldo atual pelo delta do inicial;
    // o realtime corrige com o valor exato logo em seguida.
    let updated: BankAccount = { ...row, balance: newInitial, current_balance: newInitial };
    setAccounts(prev => {
      const base = formData.is_default ? prev.map(a => ({ ...a, is_default: a.id === id })) : prev;
      return base.map(a => {
        if (a.id !== id) return a;
        updated = { ...a, ...row, balance: newInitial, current_balance: a.current_balance + (newInitial - a.balance) };
        return updated;
      });
    });
    return updated;
  }, []);

  const deleteAccount = useCallback(async (id: string): Promise<void> => {
    assertValid(uuidSchema, id);
    // Optimistic: remove imediatamente
    setAccounts(prev => prev.filter(a => a.id !== id));
    try {
      const { error: deleteError } = await (supabase.from('bank_accounts' as any).delete().eq('id', id));
      if (deleteError) throw deleteError;
    } catch (err) {
      fetchAccounts(); // reverte se falhar
      throw err;
    }
  }, [fetchAccounts]);

  const setDefault = useCallback(async (id: string): Promise<void> => {
    assertValid(uuidSchema, id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Optimistic: marca default imediatamente
    setAccounts(prev => prev.map(a => ({ ...a, is_default: a.id === id })));

    await (supabase.from('bank_accounts' as any).update({ is_default: false }).eq('user_id', user.id));

    const { error: updateError } = await (supabase
      .from('bank_accounts' as any)
      .update({ is_default: true })
      .eq('id', id));

    if (updateError) {
      fetchAccounts(); // reverte se falhar
      throw updateError;
    }
  }, [fetchAccounts]);

  return { accounts, isLoading, error, fetchAccounts, createAccount, updateAccount, deleteAccount, setDefault };
}
