CREATE SEQUENCE IF NOT EXISTS public.claim_number_seq;

CREATE OR REPLACE FUNCTION public.next_claim_number()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'SD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.claim_number_seq')::text, 5, '0');
$$;

CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text NOT NULL UNIQUE DEFAULT public.next_claim_number(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id),
  eligibility_check_id uuid REFERENCES public.eligibility_checks(id),
  policy_id uuid REFERENCES public.policies(id),
  patient_name text NOT NULL,
  patient_age int,
  patient_gender text,
  patient_mobile text,
  procedure_name text,
  procedure_code text,
  disease_name text,
  icd10_code text,
  package_code text,
  claimed_amount numeric(12,2),
  approved_amount numeric(12,2),
  status text NOT NULL DEFAULT 'Submitted',
  current_step int NOT NULL DEFAULT 7,
  query_text text,
  rejection_reason text,
  is_demo boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  payment_released_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claims_status_check CHECK (status IN ('Submitted','Under Review','Query Raised','Additional Docs','Approved','Partially Approved','Rejected','Payment Released'))
);

CREATE TABLE public.claim_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  step int,
  step_label text,
  actor_role text,
  actor_id uuid,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.claim_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_name text,
  storage_path text,
  uploaded_by uuid,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_events TO authenticated;
GRANT ALL ON public.claim_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_documents TO authenticated;
GRANT ALL ON public.claim_documents TO service_role;

CREATE INDEX idx_claims_hospital_id ON public.claims(hospital_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_submitted_at ON public.claims(submitted_at);
CREATE INDEX idx_claim_events_claim_id ON public.claim_events(claim_id);
CREATE INDEX idx_claim_documents_claim_id ON public.claim_documents(claim_id);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY claims_super_admin_all ON public.claims FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY claims_hospital_select ON public.claims FOR SELECT TO authenticated
  USING (hospital_id IS NOT NULL AND hospital_id = public.current_hospital_id()
    AND (public.has_role(auth.uid(),'hospital_admin'::public.app_role) OR public.has_role(auth.uid(),'claims_executive'::public.app_role)));
CREATE POLICY claims_hospital_insert ON public.claims FOR INSERT TO authenticated
  WITH CHECK (hospital_id = public.current_hospital_id()
    AND (public.has_role(auth.uid(),'hospital_admin'::public.app_role) OR public.has_role(auth.uid(),'claims_executive'::public.app_role)));
CREATE POLICY claims_hospital_update ON public.claims FOR UPDATE TO authenticated
  USING (hospital_id IS NOT NULL AND hospital_id = public.current_hospital_id()
    AND (public.has_role(auth.uid(),'hospital_admin'::public.app_role) OR public.has_role(auth.uid(),'claims_executive'::public.app_role)))
  WITH CHECK (hospital_id = public.current_hospital_id());

CREATE POLICY claim_events_super_admin_all ON public.claim_events FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY claim_events_hospital_select ON public.claim_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_events.claim_id AND c.hospital_id = public.current_hospital_id()));
CREATE POLICY claim_events_hospital_insert ON public.claim_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_events.claim_id AND c.hospital_id = public.current_hospital_id()));
CREATE POLICY claim_events_hospital_update ON public.claim_events FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_events.claim_id AND c.hospital_id = public.current_hospital_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_events.claim_id AND c.hospital_id = public.current_hospital_id()));

CREATE POLICY claim_documents_super_admin_all ON public.claim_documents FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY claim_documents_hospital_select ON public.claim_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_documents.claim_id AND c.hospital_id = public.current_hospital_id()));
CREATE POLICY claim_documents_hospital_insert ON public.claim_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_documents.claim_id AND c.hospital_id = public.current_hospital_id()));
CREATE POLICY claim_documents_hospital_update ON public.claim_documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_documents.claim_id AND c.hospital_id = public.current_hospital_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_documents.claim_id AND c.hospital_id = public.current_hospital_id()));

CREATE TRIGGER claims_updated_at BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.log_claim_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.claim_events (claim_id, step, step_label, actor_id, from_status, to_status, created_at)
    VALUES (NEW.id, NEW.current_step, NEW.status, auth.uid(), OLD.status, NEW.status, now());
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER claims_status_change_log AFTER UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.log_claim_status_change();

REVOKE ALL ON FUNCTION public.log_claim_status_change() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.next_claim_number() FROM anon;
GRANT EXECUTE ON FUNCTION public.next_claim_number() TO authenticated, service_role;
GRANT USAGE ON SEQUENCE public.claim_number_seq TO authenticated, service_role;