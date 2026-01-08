-- Add user_id column to categories for user-specific categories
ALTER TABLE public.categories ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing categories to be system categories (user_id = null means system category)
-- System categories are visible to everyone, user categories only to the owner

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;

-- Create new RLS policies for categories
-- Users can view system categories (user_id is null) and their own categories
CREATE POLICY "Users can view system and own categories" 
ON public.categories 
FOR SELECT 
USING (user_id IS NULL OR auth.uid() = user_id);

-- Users can insert their own categories
CREATE POLICY "Users can insert own categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own categories (not system categories)
CREATE POLICY "Users can update own categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Users can delete their own categories (not system categories)
CREATE POLICY "Users can delete own categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid() = user_id AND user_id IS NOT NULL);