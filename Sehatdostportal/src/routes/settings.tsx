import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Bell, Shield, Users, User, Cog, FileText, KeyRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserManagement } from "@/components/UserManagement";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

type SectionKey =
  | "platform"
  | "user_management"
  | "security_settings"
  | "audit_settings"
  | "hospital_profile"
  | "team_roles"
  | "notifications"
  | "security"
  | "personal_profile";

type Section = { key: SectionKey; label: string; icon: typeof Cog };

function SettingsPage() {
  const { isSuperAdmin, isHospitalAdmin, isClaimsExecutive, hospital } = useAuth();

  const sections: Section[] = useMemo(() => {
    if (isSuperAdmin) {
      const base: Section[] = [
        { key: "platform", label: "Platform Settings", icon: Cog },
        { key: "user_management", label: "User Management", icon: Users },
        { key: "security_settings", label: "Security Settings", icon: Shield },
        { key: "audit_settings", label: "Audit Settings", icon: FileText },
      ];
      // Only show Hospital Profile if super admin is attached to a hospital
      if (hospital) base.splice(1, 0, { key: "hospital_profile", label: "Hospital Profile", icon: Building2 });
      return base;
    }
    if (isHospitalAdmin) {
      return [
        { key: "hospital_profile", label: "Hospital Profile", icon: Building2 },
        { key: "team_roles", label: "Team & Roles", icon: Users },
        { key: "notifications", label: "Notifications", icon: Bell },
        { key: "security", label: "Security", icon: Shield },
      ];
    }
    // Claims Executive (or unrecognized) → personal-only
    return [
      { key: "personal_profile", label: "Personal Profile", icon: User },
      { key: "notifications", label: "Notifications", icon: Bell },
      { key: "security", label: "Security", icon: Shield },
    ];
  }, [isSuperAdmin, isHospitalAdmin, isClaimsExecutive, hospital]);

  const [active, setActive] = useState<SectionKey>(sections[0]?.key ?? "personal_profile");
  useEffect(() => {
    if (!sections.find((s) => s.key === active)) setActive(sections[0]?.key);
  }, [sections, active]);

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit border-border/60 p-2 shadow-card">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth ${active === s.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <s.icon className="h-4 w-4" /> {s.label}
            </button>
          ))}
        </Card>

        <div className="space-y-6">
          {active === "personal_profile" && <PersonalProfile />}
          {active === "hospital_profile" && <HospitalProfile />}
          {active === "platform" && <PlatformSettings />}
          {active === "user_management" && <UserManagement />}
          {active === "security_settings" && <Placeholder title="Security Settings" desc="Platform-wide security policies: SSO, password rules, session timeouts." />}
          {active === "audit_settings" && <Placeholder title="Audit Settings" desc="Configure audit log retention and export schedules." />}
          {active === "team_roles" && <Placeholder title="Team & Roles" desc="Invite hospital staff and assign roles within your hospital." />}
          {active === "notifications" && <NotificationsCard />}
          {active === "security" && <SecurityCard />}
        </div>
      </div>
    </AppShell>
  );
}

function PersonalProfile() {
  const { profile, user, refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const n = profile?.full_name?.trim();
    setFullName(n && !n.includes("@") ? n : "");
  }, [profile?.full_name]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    await refresh();
  };

  return (
    <Card className="border-border/60 p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Personal Profile</h3>
          <p className="text-xs text-muted-foreground">Update your display name. Email is managed via authentication.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile?.email ?? user?.email ?? ""} disabled />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-elegant">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Card>
  );
}

function HospitalProfile() {
  const { hospital } = useAuth();
  return (
    <Card className="border-border/60 p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Hospital Profile</h3>
          <p className="text-xs text-muted-foreground">This information appears on all patient verifications.</p>
        </div>
        {hospital?.status === "active" && (
          <Badge className="bg-success text-success-foreground hover:bg-success">Verified</Badge>
        )}
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label>Hospital Name</Label><Input defaultValue={hospital?.hospital_name ?? ""} placeholder="Hospital Name" /></div>
        <div className="space-y-2"><Label>Hospital Code</Label><Input defaultValue={hospital?.hospital_code ?? ""} placeholder="Code" disabled /></div>
        <div className="space-y-2"><Label>City</Label><Input defaultValue={hospital?.city ?? ""} placeholder="City" /></div>
        <div className="space-y-2"><Label>State</Label><Input defaultValue={hospital?.state ?? ""} placeholder="State" /></div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button className="bg-gradient-primary text-primary-foreground shadow-elegant">Save changes</Button>
      </div>
    </Card>
  );
}

function PlatformSettings() {
  return (
    <Card className="border-border/60 p-6 shadow-card">
      <h3 className="font-semibold">Platform Settings</h3>
      <p className="text-xs text-muted-foreground">Global SEHAT DOST AI platform configuration.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label>Platform Name</Label><Input defaultValue="SEHAT DOST AI" /></div>
        <div className="space-y-2"><Label>Support Email</Label><Input placeholder="support@example.in" /></div>
      </div>
    </Card>
  );
}

function NotificationsCard() {
  return (
    <Card className="border-border/60 p-6 shadow-card">
      <h3 className="font-semibold">Notification preferences</h3>
      <p className="text-xs text-muted-foreground">Choose how you want to be alerted.</p>
      <div className="mt-5 space-y-4">
        {[
          { t: "Claim approved", d: "Email + in-app", on: true },
          { t: "Pre-auth pending action", d: "Push + SMS", on: true },
          { t: "Weekly analytics digest", d: "Every Monday 9am", on: false },
        ].map((n) => (
          <div key={n.t} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
            <div>
              <div className="text-sm font-medium">{n.t}</div>
              <div className="text-xs text-muted-foreground">{n.d}</div>
            </div>
            <Switch defaultChecked={n.on} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function SecurityCard() {
  const sendReset = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.email) return toast.error("No email on file");
    const { error } = await supabase.auth.resetPasswordForEmail(data.user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  };
  return (
    <Card className="border-border/60 p-6 shadow-card">
      <h3 className="font-semibold">Security</h3>
      <p className="text-xs text-muted-foreground">Manage your account security.</p>
      <div className="mt-5 flex items-center justify-between rounded-xl border bg-card px-4 py-3">
        <div>
          <div className="text-sm font-medium">Password</div>
          <div className="text-xs text-muted-foreground">Send a reset link to your email.</div>
        </div>
        <Button variant="outline" onClick={sendReset}><KeyRound className="mr-2 h-4 w-4" />Reset password</Button>
      </div>
    </Card>
  );
}

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="border-border/60 p-6 shadow-card">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
      <div className="mt-4 text-sm text-muted-foreground">Coming soon.</div>
    </Card>
  );
}
