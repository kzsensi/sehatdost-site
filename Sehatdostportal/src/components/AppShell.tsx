import { ReactNode, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Topbar } from "@/components/Topbar";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/verify": "New Eligibility Verification",
  "/result": "Eligibility Result",
  "/claims": "Claims",
  "/assistant": "AI Assistant",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/history": "Verification History",
  "/policies": "Policy Management",
  "/policy-upload": "Policy Upload Center",
  "/procedures": "Procedure Management",
  "/diseases": "Disease Management",
  "/hospitals": "Hospitals",
  "/hospital-config": "Hospital Configuration",
  "/hospital-users": "Hospital Users",
};

export function AppShell({ children, requireRole }: { children: ReactNode; requireRole?: "super_admin" | "hospital_admin" | "claims_executive" }) {
  return (
    <AuthProvider>
      <Gate requireRole={requireRole}>{children}</Gate>
    </AuthProvider>
  );
}

function Gate({ children, requireRole }: { children: ReactNode; requireRole?: "super_admin" | "hospital_admin" | "claims_executive" }) {
  const { loading, session, roles, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const title = TITLES[path] ?? "SEHAT DOST AI";

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const denied = requireRole && !roles.includes(requireRole) && !roles.includes("super_admin");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title={title} />
          <main className="flex-1 p-4 lg:p-6">
            <div key={path} className="animate-fade-in-up">
              {!hasAnyRole ? (
                <NoRoleCard />
              ) : denied ? (
                <DeniedCard />
              ) : (
                children
              )}
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}

function NoRoleCard() {
  return (
    <Card className="mx-auto mt-12 max-w-xl p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning-foreground">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Awaiting role assignment</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your account has been created but no role has been assigned yet. Please contact your administrator to grant access.
      </p>
    </Card>
  );
}

function DeniedCard() {
  return (
    <Card className="mx-auto mt-12 max-w-xl p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Access denied</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        You don't have permission to view this page. If you believe this is a mistake, contact your administrator.
      </p>
    </Card>
  );
}
