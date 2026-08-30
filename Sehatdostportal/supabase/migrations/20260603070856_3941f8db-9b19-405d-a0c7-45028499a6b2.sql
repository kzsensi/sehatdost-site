CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.disease_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_code text NOT NULL UNIQUE,
  disease_name text NOT NULL,
  short_name text,
  specialty text,
  category text,
  synonyms text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  icd10_code text,
  chronic_flag boolean NOT NULL DEFAULT false,
  critical_illness_flag boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.disease_master TO anon, authenticated;
GRANT ALL ON public.disease_master TO service_role;

ALTER TABLE public.disease_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Diseases viewable by everyone" ON public.disease_master FOR SELECT USING (true);
CREATE POLICY "Anyone can insert diseases" ON public.disease_master FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update diseases" ON public.disease_master FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete diseases" ON public.disease_master FOR DELETE USING (true);

CREATE INDEX idx_disease_name ON public.disease_master (disease_name);
CREATE INDEX idx_disease_specialty ON public.disease_master (specialty);
CREATE INDEX idx_disease_category ON public.disease_master (category);
CREATE INDEX idx_disease_icd10 ON public.disease_master (icd10_code);
CREATE INDEX idx_disease_synonyms_gin ON public.disease_master USING GIN (synonyms);
CREATE INDEX idx_disease_keywords_gin ON public.disease_master USING GIN (keywords);
CREATE INDEX idx_disease_name_trgm ON public.disease_master USING GIN (disease_name gin_trgm_ops);

CREATE TRIGGER trg_disease_updated_at
BEFORE UPDATE ON public.disease_master
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();