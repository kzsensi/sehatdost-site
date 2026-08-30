CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    updated_at = now();

  SELECT btrim(value) INTO owner_email_val
  FROM public.app_config
  WHERE key = 'owner_email';

  IF owner_email_val IS NOT NULL
     AND owner_email_val <> ''
     AND lower(owner_email_val) = lower(btrim(NEW.email)) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE role = 'super_admin'::public.app_role
    ) INTO super_exists;

    IF NOT super_exists THEN
      INSERT INTO public.user_roles (user_id, role, hospital_id)
      VALUES (NEW.id, 'super_admin'::public.app_role, NULL);
    END IF;
  END IF;

  RETURN NEW;
END
$function$;