
CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insurer_name TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  uin_number TEXT NOT NULL UNIQUE,
  policy_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.policy_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.eligibility_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
  patient_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.policies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO authenticated;
GRANT ALL ON public.policies TO service_role;

GRANT SELECT ON public.policy_data TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_data TO authenticated;
GRANT ALL ON public.policy_data TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eligibility_checks TO authenticated;
GRANT ALL ON public.eligibility_checks TO service_role;

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Policies are viewable by everyone" ON public.policies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert policies" ON public.policies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update policies" ON public.policies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete policies" ON public.policies FOR DELETE TO authenticated USING (true);

CREATE POLICY "Policy data viewable by everyone" ON public.policy_data FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage policy data" ON public.policy_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their own eligibility checks" ON public.eligibility_checks FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Authenticated users can create eligibility checks" ON public.eligibility_checks FOR INSERT TO authenticated WITH CHECK (true);
