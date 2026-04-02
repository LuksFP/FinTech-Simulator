
-- 1. Make transactions.user_id NOT NULL (set default to prevent issues)
ALTER TABLE public.transactions ALTER COLUMN user_id SET NOT NULL;

-- 2. Drop and recreate UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions"
ON public.transactions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Remove transactions from realtime to prevent cross-user data leaks
ALTER PUBLICATION supabase_realtime DROP TABLE public.transactions;
