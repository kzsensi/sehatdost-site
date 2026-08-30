
-- Drop existing insert/update/delete policies on policies to recreate them open to anon + authenticated
DROP POLICY IF EXISTS "Authenticated users can insert policies" ON public.policies;
DROP POLICY IF EXISTS "Authenticated users can update policies" ON public.policies;
DROP POLICY IF EXISTS "Authenticated users can delete policies" ON public.policies;

CREATE POLICY "Anyone can insert policies"
ON public.policies FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update policies"
ON public.policies FOR UPDATE
TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete policies"
ON public.policies FOR DELETE
TO anon, authenticated
USING (true);

-- policy_data: ensure insert/update/delete are allowed for anon + authenticated
DROP POLICY IF EXISTS "Authenticated users manage policy data" ON public.policy_data;

CREATE POLICY "Anyone can insert policy_data"
ON public.policy_data FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update policy_data"
ON public.policy_data FOR UPDATE
TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete policy_data"
ON public.policy_data FOR DELETE
TO anon, authenticated
USING (true);

-- Ensure Data API grants are in place
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO anon, authenticated;
GRANT ALL ON public.policies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_data TO anon, authenticated;
GRANT ALL ON public.policy_data TO service_role;
