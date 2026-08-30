CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.procedure_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_code TEXT NOT NULL UNIQUE,
  procedure_name TEXT NOT NULL,
  short_name TEXT,
  specialty TEXT,
  category TEXT,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  inpatient_required BOOLEAN NOT NULL DEFAULT false,
  daycare_possible BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  icd_codes TEXT[] NOT NULL DEFAULT '{}',
  cpt_codes TEXT[] NOT NULL DEFAULT '{}',
  pmjay_package_code TEXT,
  tpa_package_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_procedure_master_specialty ON public.procedure_master(specialty);
CREATE INDEX idx_procedure_master_category ON public.procedure_master(category);
CREATE INDEX idx_procedure_master_status ON public.procedure_master(status);
CREATE INDEX idx_procedure_master_name_trgm ON public.procedure_master USING gin (procedure_name gin_trgm_ops);
CREATE INDEX idx_procedure_master_synonyms ON public.procedure_master USING gin (synonyms);
CREATE INDEX idx_procedure_master_keywords ON public.procedure_master USING gin (keywords);

GRANT SELECT ON public.procedure_master TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedure_master TO authenticated;
GRANT ALL ON public.procedure_master TO service_role;

ALTER TABLE public.procedure_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Procedures viewable by everyone" ON public.procedure_master FOR SELECT USING (true);
CREATE POLICY "Anyone can insert procedures" ON public.procedure_master FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update procedures" ON public.procedure_master FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete procedures" ON public.procedure_master FOR DELETE USING (true);
