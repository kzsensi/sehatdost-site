-- Fix privilege escalation: hospital_admin can only assign roles to users whose profile is in the same hospital
DROP POLICY IF EXISTS user_roles_hospital_admin_insert ON public.user_roles;
CREATE POLICY user_roles_hospital_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    role <> 'super_admin'::public.app_role
    AND hospital_id = public.current_hospital_id()
    AND public.has_role(auth.uid(), 'hospital_admin'::public.app_role)
    AND user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.hospital_id = public.current_hospital_id()
    )
  );

-- Add UPDATE policy for eligibility_checks scoped to hospital
CREATE POLICY eligibility_hospital_update ON public.eligibility_checks
  FOR UPDATE TO authenticated
  USING (hospital_id IS NOT NULL AND hospital_id = public.current_hospital_id())
  WITH CHECK (hospital_id = public.current_hospital_id());
