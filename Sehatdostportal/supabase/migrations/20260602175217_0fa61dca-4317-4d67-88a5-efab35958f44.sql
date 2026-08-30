
-- Allow anon (public, no-auth) access to eligibility_checks to match app's existing pattern.
DROP POLICY IF EXISTS "Authenticated users can create eligibility checks" ON public.eligibility_checks;
DROP POLICY IF EXISTS "Users can view their own eligibility checks" ON public.eligibility_checks;

CREATE POLICY "Anyone can insert eligibility checks"
  ON public.eligibility_checks FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can view eligibility checks"
  ON public.eligibility_checks FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can delete eligibility checks"
  ON public.eligibility_checks FOR DELETE TO anon, authenticated USING (true);

GRANT SELECT, INSERT, DELETE ON public.eligibility_checks TO anon, authenticated;
GRANT ALL ON public.eligibility_checks TO service_role;
