-- =========================================================
-- Role enum
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'hospital_admin', 'claims_executive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- Hospitals
-- =========================================================
CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_code text NOT NULL UNIQUE,
  hospital_name text NOT NULL,
  hospital_type text,
  city text,
  state text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hospital_code_format CHECK (hospital_code ~ '^[A-Z0-9_]{2,64}$')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER hospitals_updated_at
BEFORE UPDATE ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Immutability for hospital_code
CREATE OR REPLACE FUNCTION public.enforce_hospital_code_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.hospital_code IS DISTINCT FROM OLD.hospital_code THEN
    RAISE EXCEPTION 'hospital_code is immutable';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER hospitals_code_immutable
BEFORE UPDATE ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.enforce_hospital_code_immutable();

-- =========================================================
-- Profiles
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- User roles
-- =========================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, hospital_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- App config (super admin only)
-- =========================================================
CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_config (key, value) VALUES ('owner_email', '');

-- =========================================================
-- Hospital config
-- =========================================================
CREATE TABLE public.hospital_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL UNIQUE REFERENCES public.hospitals(id) ON DELETE CASCADE,
  all_policies boolean NOT NULL DEFAULT true,
  all_specialties boolean NOT NULL DEFAULT true,
  all_disease_categories boolean NOT NULL DEFAULT true,
  all_procedure_categories boolean NOT NULL DEFAULT true,
  enabled_policy_ids uuid[] NOT NULL DEFAULT '{}',
  enabled_specialties text[] NOT NULL DEFAULT '{}',
  enabled_disease_categories text[] NOT NULL DEFAULT '{}',
  enabled_procedure_categories text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_config TO authenticated;
GRANT ALL ON public.hospital_config TO service_role;

ALTER TABLE public.hospital_config ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER hospital_config_updated_at
BEFORE UPDATE ON public.hospital_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Add hospital_id + created_by to eligibility_checks
-- =========================================================
ALTER TABLE public.eligibility_checks
  ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eligibility_checks_hospital ON public.eligibility_checks(hospital_id);

-- =========================================================
-- Security definer helpers
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.current_hospital_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hospital_id FROM public.profiles WHERE id = auth.uid();
$$;

-- =========================================================
-- Signup trigger: create profile + maybe grant super_admin
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_email_val text;
  super_exists boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT value INTO owner_email_val FROM public.app_config WHERE key = 'owner_email';

  IF owner_email_val IS NOT NULL AND owner_email_val <> '' AND lower(owner_email_val) = lower(NEW.email) THEN
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') INTO super_exists;
    IF NOT super_exists THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- RLS: hospitals
-- =========================================================
CREATE POLICY "hospitals_super_admin_all"
  ON public.hospitals FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "hospitals_member_select"
  ON public.hospitals FOR SELECT TO authenticated
  USING (id = public.current_hospital_id());

-- =========================================================
-- RLS: profiles
-- =========================================================
CREATE POLICY "profiles_self_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_super_admin_all"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "profiles_hospital_admin_read"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    hospital_id IS NOT NULL
    AND hospital_id = public.current_hospital_id()
    AND public.has_role(auth.uid(), 'hospital_admin'::public.app_role)
  );

CREATE POLICY "profiles_hospital_admin_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    hospital_id IS NOT NULL
    AND hospital_id = public.current_hospital_id()
    AND public.has_role(auth.uid(), 'hospital_admin'::public.app_role)
  )
  WITH CHECK (
    hospital_id = public.current_hospital_id()
    AND public.has_role(auth.uid(), 'hospital_admin'::public.app_role)
  );

-- =========================================================
-- RLS: user_roles
-- =========================================================
CREATE POLICY "user_roles_self_select"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_super_admin_all"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "user_roles_hospital_admin_select"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    hospital_id IS NOT NULL
    AND hospital_id = public.current_hospital_id()
    AND public.has_role(auth.uid(), 'hospital_admin'::public.app_role)
  );

CREATE POLICY "user_roles_hospital_admin_insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    role <> 'super_admin'
    AND hospital_id = public.current_hospital_id()
    AND public.has_role(auth.uid(), 'hospital_admin'::public.app_role)
  );

CREATE POLICY "user_roles_hospital_admin_delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    role <> 'super_admin'
    AND hospital_id = public.current_hospital_id()
    AND public.has_role(auth.uid(), 'hospital_admin'::public.app_role)
  );

-- =========================================================
-- RLS: app_config (super admin only)
-- =========================================================
CREATE POLICY "app_config_super_admin_all"
  ON public.app_config FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- =========================================================
-- RLS: hospital_config
-- =========================================================
CREATE POLICY "hospital_config_super_admin_all"
  ON public.hospital_config FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "hospital_config_admin_manage"
  ON public.hospital_config FOR ALL TO authenticated
  USING (
    hospital_id = public.current_hospital_id()
    AND public.has_role(auth.uid(), 'hospital_admin'::public.app_role)
  )
  WITH CHECK (
    hospital_id = public.current_hospital_id()
    AND public.has_role(auth.uid(), 'hospital_admin'::public.app_role)
  );

CREATE POLICY "hospital_config_member_read"
  ON public.hospital_config FOR SELECT TO authenticated
  USING (hospital_id = public.current_hospital_id());

-- =========================================================
-- RLS: eligibility_checks (replace permissive policies)
-- =========================================================
DROP POLICY IF EXISTS "Anyone can delete eligibility checks" ON public.eligibility_checks;
DROP POLICY IF EXISTS "Anyone can insert eligibility checks" ON public.eligibility_checks;
DROP POLICY IF EXISTS "Anyone can view eligibility checks" ON public.eligibility_checks;

CREATE POLICY "eligibility_super_admin_all"
  ON public.eligibility_checks FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "eligibility_hospital_select"
  ON public.eligibility_checks FOR SELECT TO authenticated
  USING (hospital_id IS NOT NULL AND hospital_id = public.current_hospital_id());

CREATE POLICY "eligibility_hospital_insert"
  ON public.eligibility_checks FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = public.current_hospital_id()
    AND created_by = auth.uid()
  );

CREATE POLICY "eligibility_hospital_delete"
  ON public.eligibility_checks FOR DELETE TO authenticated
  USING (
    hospital_id = public.current_hospital_id()
    AND public.has_role(auth.uid(), 'hospital_admin'::public.app_role)
  );

-- =========================================================
-- RLS: master tables — read for authenticated, write super_admin only
-- =========================================================
-- policies
DROP POLICY IF EXISTS "Anyone can delete policies" ON public.policies;
DROP POLICY IF EXISTS "Anyone can insert policies" ON public.policies;
DROP POLICY IF EXISTS "Anyone can update policies" ON public.policies;
DROP POLICY IF EXISTS "Policies are viewable by everyone" ON public.policies;

CREATE POLICY "policies_read_authenticated"
  ON public.policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "policies_write_super_admin"
  ON public.policies FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- policy_data
DROP POLICY IF EXISTS "Anyone can delete policy_data" ON public.policy_data;
DROP POLICY IF EXISTS "Anyone can insert policy_data" ON public.policy_data;
DROP POLICY IF EXISTS "Anyone can update policy_data" ON public.policy_data;
DROP POLICY IF EXISTS "Policy data viewable by everyone" ON public.policy_data;

CREATE POLICY "policy_data_read_authenticated"
  ON public.policy_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "policy_data_write_super_admin"
  ON public.policy_data FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- disease_master
DROP POLICY IF EXISTS "Anyone can delete diseases" ON public.disease_master;
DROP POLICY IF EXISTS "Anyone can insert diseases" ON public.disease_master;
DROP POLICY IF EXISTS "Anyone can update diseases" ON public.disease_master;
DROP POLICY IF EXISTS "Diseases viewable by everyone" ON public.disease_master;

CREATE POLICY "disease_master_read_authenticated"
  ON public.disease_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "disease_master_write_super_admin"
  ON public.disease_master FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- procedure_master
DROP POLICY IF EXISTS "Anyone can delete procedures" ON public.procedure_master;
DROP POLICY IF EXISTS "Anyone can insert procedures" ON public.procedure_master;
DROP POLICY IF EXISTS "Anyone can update procedures" ON public.procedure_master;
DROP POLICY IF EXISTS "Procedures viewable by everyone" ON public.procedure_master;

CREATE POLICY "procedure_master_read_authenticated"
  ON public.procedure_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "procedure_master_write_super_admin"
  ON public.procedure_master FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
