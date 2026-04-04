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
  balance: number;
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

      const { data, error: fetchError } = await (supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true }));

      if (fetchError) throw fetchError;

      setAccounts(((data as BankAccount[]) ?? []).map((a) => ({ ...a, balance: Number(a.balance) })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();

    const channel = supabase
      .channel('bank_accounts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, fetchAccounts)
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
      await (supabase.from('bank_accounts').update({ is_default: false }).eq('user_id', user.id));
    }

    const { data, error: insertError } = await (supabase
      .from('bank_accounts')
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

    const created = { ...(data as BankAccount), balance: Number((data as BankAccount).balance) };
    await fetchAccounts();
    return created;
  }, [fetchAccounts]);

  const updateAccount = useCallback(async (id: string, formData: Partial<BankAccountFormData>): Promise<BankAccount> => {
    assertValid(uuidSchema, id);

    // Validate only the provided fields
    if (Object.keys(formData).length > 0) {
      const partial = accountSchema.partial();
      assertValid(partial, formData);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    if (formData.is_default) {
      await (supabase.from('bank_accounts').update({ is_default: false }).eq('user_id', user.id).neq('id', id));
    }

    const updatePayload: Record<string, unknown> = {};
    if (formData.name !== undefined) updatePayload.name = formData.name.trim();
    if (formData.type !== undefined) updatePayload.type = formData.type;
    if (formData.balance !== undefined) updatePayload.balance = formData.balance;
    if (formData.color !== undefined) updatePayload.color = formData.color;
    if (formData.icon !== undefined) updatePayload.icon = formData.icon;
    if (formData.is_default !== undefined) updatePayload.is_default = formData.is_default;

    const { data, error: updateError } = await (supabase
      .from('bank_accounts')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single());

    if (updateError) throw updateError;

    const updated = { ...(data as BankAccount), balance: Number((data as BankAccount).balance) };
    await fetchAccounts();
    return updated;
  }, [fetchAccounts]);

  const deleteAccount = useCallback(async (id: string): Promise<void> => {
    assertValid(uuidSchema, id);

    const { error: deleteError } = await (supabase.from('bank_accounts').delete().eq('id', id));
    if (deleteError) throw deleteError;
    await fetchAccounts();
  }, [fetchAccounts]);

  const setDefault = useCallback(async (id: string): Promise<void> => {
    assertValid(uuidSchema, id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    await (supabase.from('bank_accounts').update({ is_default: false }).eq('user_id', user.id));

    const { error: updateError } = await (supabase
      .from('bank_accounts')
      .update({ is_default: true })
      .eq('id', id));

    if (updateError) throw updateError;
    await fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, isLoading, error, fetchAccounts, createAccount, updateAccount, deleteAccount, setDefault };
}
