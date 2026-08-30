import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FilePlus2, ClipboardList, Bot, BarChart3, Settings,
  Stethoscope, ShieldCheck, UploadCloud, History, Activity, HeartPulse,
  Building2, SlidersHorizontal, Users,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth, type AppRole } from "@/lib/auth-context";

type Item = { title: string; url: string; icon: typeof LayoutDashboard; roles: AppRole[] };

const ALL_ITEMS: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "hospital_admin", "claims_executive"] },
  { title: "New Verification", url: "/verify", icon: FilePlus2, roles: ["hospital_admin", "claims_executive"] },
  { title: "Verification History", url: "/history", icon: History, roles: ["super_admin", "hospital_admin", "claims_executive"] },
  { title: "Claims", url: "/claims", icon: ClipboardList, roles: ["hospital_admin", "claims_executive"] },
  { title: "AI Assistant", url: "/assistant", icon: Bot, roles: ["super_admin", "hospital_admin", "claims_executive"] },
  { title: "Analytics", url: "/analytics", icon: BarChart3, roles: ["super_admin", "hospital_admin"] },
  { title: "Hospitals", url: "/hospitals", icon: Building2, roles: ["super_admin"] },
  { title: "Hospital Configuration", url: "/hospital-config", icon: SlidersHorizontal, roles: ["hospital_admin"] },
  { title: "Hospital Users", url: "/hospital-users", icon: Users, roles: ["hospital_admin"] },
  { title: "Policy Management", url: "/policies", icon: ShieldCheck, roles: ["super_admin"] },
  { title: "Policy Upload Center", url: "/policy-upload", icon: UploadCloud, roles: ["super_admin"] },
  { title: "Procedure Management", url: "/procedures", icon: Activity, roles: ["super_admin"] },
  { title: "Disease Management", url: "/diseases", icon: HeartPulse, roles: ["super_admin"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["super_admin", "hospital_admin"] },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { roles } = useAuth();
  const items = ALL_ITEMS.filter((i) => i.roles.some((r) => roles.includes(r)));

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-teal shadow-glow">
            <Stethoscope className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-display font-bold text-sidebar-foreground">SEHAT DOST AI</span>
            <span className="text-[10px] leading-tight text-sidebar-foreground/60">Simplifying Claims. Amplifying Care.</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = path === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-sidebar-primary text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:hidden">
        <div className="rounded-lg bg-sidebar-accent p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sidebar-accent-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" /> SEHAT AI Engine
          </div>
          <div className="mt-1 text-[11px] text-sidebar-foreground/60">
            Multi-tenant access control · IRDAI · NHA · PM-JAY
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
