
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
DROP INDEX IF EXISTS idx_search_index_content_trgm;
DROP INDEX IF EXISTS idx_search_index_title_trgm;
CREATE INDEX idx_search_index_content_trgm ON public.search_index USING gin(content extensions.gin_trgm_ops);
CREATE INDEX idx_search_index_title_trgm ON public.search_index USING gin(title extensions.gin_trgm_ops);
