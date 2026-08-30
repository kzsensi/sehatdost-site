
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS assigned_by uuid;
