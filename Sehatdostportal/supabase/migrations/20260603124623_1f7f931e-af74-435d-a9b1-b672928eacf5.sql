
-- Fix mutable search_path on enforce_hospital_code_immutable
CREATE OR REPLACE FUNCTION public.enforce_hospital_code_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.hospital_code IS DISTINCT FROM OLD.hospital_code THEN
    RAISE EXCEPTION 'hospital_code is immutable';
  END IF;
  RETURN NEW;
END $$;

-- Revoke EXECUTE on SECURITY DEFINER functions from public (covers anon and all default roles)
REVOKE EXECUTE ON FUNCTION public.current_hospital_id() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;

-- Revoke EXECUTE on SECURITY DEFINER functions from anon explicitly
REVOKE EXECUTE ON FUNCTION public.current_hospital_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- Revoke EXECUTE on handle_new_user from authenticated (trigger-only, not for end-user invocation)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Ensure authenticated retains EXECUTE on RLS helper functions (required for policy evaluation)
GRANT EXECUTE ON FUNCTION public.current_hospital_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Ensure service_role retains EXECUTE on all functions for admin/edge-function use
GRANT EXECUTE ON FUNCTION public.current_hospital_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_hospital_code_immutable() TO service_role;
