## Hospital Configuration & Access Control Module (final)

Build multi-tenant access control on top of the existing shared masters (Policy, Disease, Procedure). Hospitals share the global catalogs but each hospital admin configures which subset is enabled, and verification history is scoped per hospital. Super Admin sees everything.

### 1. Authentication (Lovable Cloud / Supabase Auth)

- Enable email/password + Google OAuth.
- New routes:
  - `/auth` — Login + Sign Up tabs, "Forgot password" link.
  - `/reset-password` — handles `type=recovery`, calls `supabase.auth.updateUser({ password })`.
- Topbar: current user email, "Change Password" dialog, Logout.
- Move existing app routes under `_authenticated/` (gated by integration-managed layout). Landing `/` stays public.

### 2. Database

Tables (with GRANTs + RLS):

- `app_role` enum: `super_admin`, `hospital_admin`, `claims_executive`.
- `hospitals(id, hospital_code text unique NOT NULL, hospital_name, hospital_type, city, state, status, created_at, updated_at)`.
  - `hospital_code` is **immutable**: BEFORE UPDATE trigger raises if changed.
  - Format check: uppercase letters, digits, underscore (e.g. `APOLLO_MUMBAI`).
- `profiles(id=user_id, full_name, hospital_id nullable, created_at, updated_at)` — auto-created via `on_auth_user_created` trigger.
- `user_roles(id, user_id, role, hospital_id nullable, unique(user_id, role, hospital_id))`.
- `app_config(key text primary key, value text)` — seeded with `owner_email` (default empty).
- `hospital_config(id, hospital_id unique, enabled_policy_ids uuid[], enabled_specialties text[], enabled_disease_categories text[], enabled_procedure_categories text[], all_policies bool default true, all_specialties bool default true, all_disease_categories bool default true, all_procedure_categories bool default true)`.
- Add `hospital_id uuid` + `created_by uuid` to existing `eligibility_checks`.

Security definer functions (`SECURITY DEFINER`, `set search_path = public`):
- `public.has_role(_user_id uuid, _role app_role) returns boolean`
- `public.current_hospital_id() returns uuid`
- `public.is_super_admin() returns boolean`

#### Super admin bootstrap

- No "first user wins."
- `app_config.owner_email` is seeded empty. The deploying super admin sets it (via SQL) **before** signing up.
- `on_auth_user_created` trigger:
  1. Insert into `profiles`.
  2. If `NEW.email = app_config.owner_email` AND no super_admin exists yet → insert `super_admin` row into `user_roles`.
  3. Otherwise no role (user is roleless until a super_admin assigns one).
- Roleless users see an "Awaiting role assignment" placeholder; RLS blocks all data.

RLS:
- `hospitals`: super_admin all; others SELECT own hospital.
- `profiles`: own row; super_admin all; hospital_admin same-hospital read.
- `user_roles`: own SELECT; super_admin manage all; hospital_admin manage same-hospital non-super_admin grants.
- `hospital_config`: super_admin all; hospital_admin manage own; claims_executive SELECT own.
- `eligibility_checks`: super_admin all; hospital users SELECT/INSERT where `hospital_id = current_hospital_id()`.
- Masters (`policies`, `policy_data`, `disease_master`, `procedure_master`): SELECT for any authenticated user; write only super_admin. (Replaces current permissive policies.)
- `app_config`: **SELECT, INSERT, UPDATE, DELETE all restricted to super_admin only.** Hospital Admin and Claims Executive cannot read owner_email or any other global config.

### 3. Frontend

- `src/lib/auth-context.tsx` hook exposing `{ user, profile, roles, hospital, hospitalConfig, isSuperAdmin, isHospitalAdmin, isClaimsExecutive, refresh }`, subscribed to `onAuthStateChange`.
- `AppSidebar` filtered by role:
  - Super Admin: Dashboard, Policy Management, Policy Upload, Procedure Management, Disease Management, Hospitals, Verification History, Analytics, Settings.
  - Hospital Admin: Dashboard, New Verification, Verification History, Hospital Configuration, Hospital Users, Settings.
  - Claims Executive: Dashboard, New Verification, Verification History.
- New routes (under `_authenticated/`):
  - `/hospitals` (super admin): CRUD hospitals. `hospital_code` editable only on create; read-only on edit; uppercase/underscore validation.
  - `/hospital-config` (hospital admin): toggle enabled policies/specialties/disease categories/procedure categories with "Enable All" master switches.
  - `/hospital-users` (hospital admin): list hospital profiles, assign role, remove.
- `/verify`: apply hospital config filters to policy/disease/procedure pickers (skip when `all_*` true or user is super_admin). On submit, persist `hospital_id` + `created_by`.
- `/history`: RLS handles scoping; show "Hospital: <code> — <name>" header.
- Roleless users: "Awaiting role assignment" card on every protected page.

### 4. Out of scope

Existing eligibility engine, matching libraries, PDF/AI summary, autocompletes — untouched aside from input filtering on `/verify`.

### Technical notes

- Single migration: enum, tables, GRANTs, RLS, security definer functions, signup trigger, hospital_code immutability trigger, seed `app_config('owner_email','')`, and policy replacement for master tables.
- `app_config` is super-admin-only end-to-end (no anon/authenticated grants beyond service_role).
- All role/hospital checks inside RLS go through SECURITY DEFINER functions to avoid recursion.
