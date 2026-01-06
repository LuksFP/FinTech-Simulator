-- Create transaction type enum
CREATE TYPE public.transaction_type AS ENUM ('entrada', 'saida');

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  type transaction_type NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Since this is a demo/personal finance app without auth initially,
-- allow public access for simplicity (can be restricted later with auth)
CREATE POLICY "Allow public read access"
ON public.transactions
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access"
ON public.transactions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public delete access"
ON public.transactions
FOR DELETE
USING (true);

-- Enable realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;