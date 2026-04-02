
-- Fix 1: Make chat-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Fix 2: Drop the overly permissive SELECT policy and replace with ownership check
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;
CREATE POLICY "Users can view their own chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Fix 3: Add missing UPDATE policy on chat_history
CREATE POLICY "Users can update their own chat history"
ON public.chat_history FOR UPDATE
USING (auth.uid() = user_id);
