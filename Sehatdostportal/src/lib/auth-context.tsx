import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "hospital_admin" | "claims_executive";

export type Hospital = {
  id: string;
  hospital_code: string;
  hospital_name: string;
  hospital_type: string | null;
  city: string | null;
  state: string | null;
  status: string;
};

export type HospitalConfig = {
  id: string;
  hospital_id: string;
  all_policies: boolean;
  all_specialties: boolean;
  all_disease_categories: boolean;
  all_procedure_categories: boolean;
  enabled_policy_ids: string[];
  enabled_specialties: string[];
  enabled_disease_categories: string[];
  enabled_procedure_categories: string[];
};

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: { id: string; full_name: string | null; email: string | null; hospital_id: string | null } | null;
  roles: AppRole[];
  hospital: Hospital | null;
  hospitalConfig: HospitalConfig | null;
  isSuperAdmin: boolean;
  isHospitalAdmin: boolean;
  isClaimsExecutive: boolean;
  hasAnyRole: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthContextValue["profile"]>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [hospitalConfig, setHospitalConfig] = useState<HospitalConfig | null>(null);

  const loadContext = useCallback(async (uid: string | null) => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      setHospital(null);
      setHospitalConfig(null);
      return;
    }
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, hospital_id").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(prof ?? null);
    setRoles((roleRows ?? []).map((r) => r.role as AppRole));
    if (prof?.hospital_id) {
      const [{ data: hosp }, { data: cfg }] = await Promise.all([
        supabase.from("hospitals").select("*").eq("id", prof.hospital_id).maybeSingle(),
        supabase.from("hospital_config").select("*").eq("hospital_id", prof.hospital_id).maybeSingle(),
      ]);
      setHospital((hosp as Hospital) ?? null);
      setHospitalConfig((cfg as HospitalConfig) ?? null);
    } else {
      setHospital(null);
      setHospitalConfig(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadContext(session?.user?.id ?? null);
  }, [loadContext, session?.user?.id]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadContext(data.session?.user?.id ?? null).finally(() => mounted && setLoading(false));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // Defer Supabase calls so they don't block the auth callback.
      setTimeout(() => { loadContext(s?.user?.id ?? null); }, 0);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadContext]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    session,
    user: session?.user ?? null,
    profile,
    roles,
    hospital,
    hospitalConfig,
    isSuperAdmin: roles.includes("super_admin"),
    isHospitalAdmin: roles.includes("hospital_admin"),
    isClaimsExecutive: roles.includes("claims_executive"),
    hasAnyRole: roles.length > 0,
    refresh,
    signOut,
  }), [loading, session, profile, roles, hospital, hospitalConfig, refresh, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
