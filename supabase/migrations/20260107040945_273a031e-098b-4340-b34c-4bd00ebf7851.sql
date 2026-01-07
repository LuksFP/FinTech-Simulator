-- Create categories table with predefined categories
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  type public.transaction_type NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories are public read
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

-- Insert predefined categories for entrada
INSERT INTO public.categories (name, icon, color, type) VALUES
  ('Salário', 'Wallet', '#22c55e', 'entrada'),
  ('Freelance', 'Briefcase', '#10b981', 'entrada'),
  ('Investimentos', 'TrendingUp', '#06b6d4', 'entrada'),
  ('Outros Ganhos', 'Plus', '#6b7280', 'entrada');

-- Insert predefined categories for saida
INSERT INTO public.categories (name, icon, color, type) VALUES
  ('Alimentação', 'UtensilsCrossed', '#f97316', 'saida'),
  ('Transporte', 'Car', '#3b82f6', 'saida'),
  ('Moradia', 'Home', '#8b5cf6', 'saida'),
  ('Saúde', 'Heart', '#ef4444', 'saida'),
  ('Lazer', 'Gamepad2', '#ec4899', 'saida'),
  ('Educação', 'GraduationCap', '#06b6d4', 'saida'),
  ('Outros Gastos', 'Package', '#6b7280', 'saida');

-- Add user_id and category_id to transactions
ALTER TABLE public.transactions 
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN category_id uuid REFERENCES public.categories(id);

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create financial goals table
CREATE TABLE public.financial_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_amount numeric NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Enable RLS on financial_goals
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- Financial goals policies
CREATE POLICY "Users can view own goals" ON public.financial_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.financial_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.financial_goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.financial_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Update transactions RLS policies for user-specific access
DROP POLICY IF EXISTS "Allow public delete access" ON public.transactions;
DROP POLICY IF EXISTS "Allow public insert access" ON public.transactions;
DROP POLICY IF EXISTS "Allow public read access" ON public.transactions;

CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();