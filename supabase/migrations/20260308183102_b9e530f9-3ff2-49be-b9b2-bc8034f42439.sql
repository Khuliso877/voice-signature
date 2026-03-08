
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.connected_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL,
  source_name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.connected_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own sources" ON public.connected_sources FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sources" ON public.connected_sources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sources" ON public.connected_sources FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sources" ON public.connected_sources FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.search_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  title text,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.search_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own search index" ON public.search_index FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own search index" ON public.search_index FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own search index" ON public.search_index FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own search index" ON public.search_index FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_search_index_user_source ON public.search_index(user_id, source_type);
CREATE INDEX idx_search_index_content_trgm ON public.search_index USING gin(content gin_trgm_ops);
CREATE INDEX idx_search_index_title_trgm ON public.search_index USING gin(title gin_trgm_ops);

CREATE TRIGGER handle_connected_sources_updated_at BEFORE UPDATE ON public.connected_sources FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_search_index_updated_at BEFORE UPDATE ON public.search_index FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
