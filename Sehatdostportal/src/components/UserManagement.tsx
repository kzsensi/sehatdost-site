import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Shield, Trash2, UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type AppRole = "super_admin" | "hospital_admin" | "claims_executive";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  hospital_id: string | null;
  status: string | null;
  created_at: string;
};
type RoleRow = {
  id: string;
  user_id: string;
  role: AppRole;
  hospital_id: string | null;
  assigned_by: string | null;
  created_at: string;
};
type Hospital = { id: string; hospital_code: string; hospital_name: string };

const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  hospital_admin: "Hospital Admin",
  claims_executive: "Claims Executive",
};

export function UserManagement() {
  const { user: authUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [hospitalFilter, setHospitalFilter] = useState<string>("all");
  const [showRoleless, setShowRoleless] = useState(false);

  const [editing, setEditing] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, r, h] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, hospital_id, status, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("id, user_id, role, hospital_id, assigned_by, created_at"),
      supabase.from("hospitals").select("id, hospital_code, hospital_name").order("hospital_name"),
    ]);
    if (p.error) toast.error(p.error.message);
    setProfiles((p.data ?? []) as Profile[]);
    setRoles((r.data ?? []) as RoleRow[]);
    setHospitals((h.data ?? []) as Hospital[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const rolesByUser = useMemo(() => {
    const m = new Map<string, RoleRow[]>();
    for (const r of roles) {
      const list = m.get(r.user_id) ?? [];
      list.push(r);
      m.set(r.user_id, list);
    }
    return m;
  }, [roles]);

  const hospitalById = useMemo(() => new Map(hospitals.map((h) => [h.id, h])), [hospitals]);
  const profileByUserId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return profiles.filter((p) => {
      const userRoles = rolesByUser.get(p.id) ?? [];
      if (showRoleless && userRoles.length > 0) return false;
      if (roleFilter !== "all" && !userRoles.some((r) => r.role === roleFilter)) return false;
      if (hospitalFilter !== "all" && p.hospital_id !== hospitalFilter) return false;
      if (needle) {
        const hay = `${p.full_name ?? ""} ${p.email ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [profiles, rolesByUser, q, roleFilter, hospitalFilter, showRoleless]);

  const rolelessCount = useMemo(() => profiles.filter((p) => !(rolesByUser.get(p.id)?.length)).length, [profiles, rolesByUser]);

  return (
    <Card className="border-border/60 p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">User Management</h3>
          <p className="text-xs text-muted-foreground">Manage all platform users, hospitals and roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={showRoleless ? "default" : "outline"} className="cursor-pointer" onClick={() => setShowRoleless((v) => !v)}>
            Roleless queue ({rolelessCount})
          </Badge>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Refresh
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="hospital_admin">Hospital Admin</SelectItem>
            <SelectItem value="claims_executive">Claims Executive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
          <SelectTrigger><SelectValue placeholder="Hospital" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All hospitals</SelectItem>
            {hospitals.map((h) => (
              <SelectItem key={h.id} value={h.id}>{h.hospital_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Hospital</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Audit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No users match these filters.</TableCell></TableRow>
            ) : filtered.map((p) => {
              const userRoles = rolesByUser.get(p.id) ?? [];
              const hosp = p.hospital_id ? hospitalById.get(p.hospital_id) : null;
              const isSelf = p.id === authUser?.id;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name?.trim() || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                  <TableCell>
                    {userRoles.length === 0 ? (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600">No role</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {userRoles.map((r) => (
                          <Badge key={r.id} variant="secondary" className="gap-1"><Shield className="h-3 w-3" />{ROLE_LABEL[r.role]}</Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{hosp ? `${hosp.hospital_name}` : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "disabled" ? "destructive" : "outline"}>{p.status ?? "active"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {userRoles[0] ? (
                      <div>
                        <div>{new Date(userRoles[0].created_at).toLocaleDateString()}</div>
                        <div>by {userRoles[0].assigned_by ? (profileByUserId.get(userRoles[0].assigned_by)?.email ?? "system") : "self/system"}</div>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)} disabled={isSelf}>
                      <UserCog className="mr-1 h-3.5 w-3.5" /> Manage
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <EditUserDialog
        user={editing}
        hospitals={hospitals}
        existingRoles={editing ? (rolesByUser.get(editing.id) ?? []) : []}
        onClose={() => setEditing(null)}
        onSaved={async () => { setEditing(null); await load(); }}
        authUserId={authUser?.id ?? null}
      />
    </Card>
  );
}

function EditUserDialog({
  user, hospitals, existingRoles, onClose, onSaved, authUserId,
}: {
  user: Profile | null;
  hospitals: Hospital[];
  existingRoles: RoleRow[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  authUserId: string | null;
}) {
  const [hospitalId, setHospitalId] = useState<string>("none");
  const [role, setRole] = useState<AppRole | "none">("none");
  const [status, setStatus] = useState<string>("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setHospitalId(user.hospital_id ?? "none");
    setStatus(user.status ?? "active");
    setRole((existingRoles[0]?.role as AppRole) ?? "none");
  }, [user, existingRoles]);

  if (!user) return null;

  const save = async () => {
    setSaving(true);
    try {
      const nextHospitalId = hospitalId === "none" ? null : hospitalId;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ hospital_id: nextHospitalId, status })
        .eq("id", user.id);
      if (profErr) throw profErr;

      // Role sync: drop existing roles not matching, insert new one if needed.
      const targetRole = role === "none" ? null : role;
      const toDelete = existingRoles.filter((r) => r.role !== targetRole);
      if (toDelete.length) {
        const { error: delErr } = await supabase.from("user_roles").delete().in("id", toDelete.map((r) => r.id));
        if (delErr) throw delErr;
      }
      if (targetRole) {
        const already = existingRoles.find((r) => r.role === targetRole);
        if (!already) {
          const { error: insErr } = await supabase.from("user_roles").insert({
            user_id: user.id,
            role: targetRole,
            hospital_id: targetRole === "super_admin" ? null : nextHospitalId,
            assigned_by: authUserId,
          });
          if (insErr) throw insErr;
        } else if (targetRole !== "super_admin" && already.hospital_id !== nextHospitalId) {
          const { error: updErr } = await supabase
            .from("user_roles")
            .update({ hospital_id: nextHospitalId, assigned_by: authUserId })
            .eq("id", already.id);
          if (updErr) throw updErr;
        }
      }

      toast.success("User updated");
      await onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Update failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage user</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="font-medium">{user.full_name || user.email}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
          <div className="space-y-2">
            <Label>Hospital</Label>
            <Select value={hospitalId} onValueChange={setHospitalId}>
              <SelectTrigger><SelectValue placeholder="Select hospital" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No hospital</SelectItem>
                {hospitals.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.hospital_name} ({h.hospital_code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole | "none")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No role</SelectItem>
                <SelectItem value="claims_executive">Claims Executive</SelectItem>
                <SelectItem value="hospital_admin">Hospital Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            {role !== "none" && role !== "super_admin" && hospitalId === "none" && (
              <p className="text-xs text-amber-600">Hospital roles require a hospital assignment.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={save}
            disabled={saving || (role !== "none" && role !== "super_admin" && hospitalId === "none")}
            className="bg-gradient-primary text-primary-foreground shadow-elegant"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4 hidden" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
