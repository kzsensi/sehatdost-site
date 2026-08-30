import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Loader2, UserPlus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/hospital-users")({ component: () => <AppShell requireRole="hospital_admin"><HospitalUsersPage /></AppShell> });

type Profile = { id: string; full_name: string | null; email: string | null; hospital_id: string | null };
type RoleRow = { id: string; user_id: string; role: "super_admin" | "hospital_admin" | "claims_executive"; hospital_id: string | null };

function HospitalUsersPage() {
  const { hospital } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<"hospital_admin" | "claims_executive">("claims_executive");

  const load = async () => {
    if (!hospital) return;
    setLoading(true);
    const [{ data: profs }, { data: rrs }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, hospital_id").eq("hospital_id", hospital.id),
      supabase.from("user_roles").select("id, user_id, role, hospital_id").eq("hospital_id", hospital.id),
    ]);
    setProfiles((profs ?? []) as Profile[]);
    setRoles((rrs ?? []) as RoleRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [hospital?.id]);

  const assignByEmail = async () => {
    if (!hospital) return;
    if (!email.trim()) return toast.error("Email is required");
    // Find user by email via profiles
    const { data: prof, error: pe } = await supabase.from("profiles").select("id, hospital_id").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (pe) return toast.error("Lookup failed", { description: pe.message });
    if (!prof) return toast.error("No user with that email. Ask them to sign up first.");
    // Attach hospital
    if (prof.hospital_id !== hospital.id) {
      const { error: ue } = await supabase.from("profiles").update({ hospital_id: hospital.id }).eq("id", prof.id);
      if (ue) return toast.error("Could not attach user to hospital", { description: ue.message });
    }
    const { error: re } = await supabase.from("user_roles").insert({ user_id: prof.id, role: newRole, hospital_id: hospital.id });
    if (re && !re.message.includes("duplicate")) return toast.error("Role assignment failed", { description: re.message });
    toast.success("User added to hospital");
    setOpen(false); setEmail("");
    load();
  };

  const removeRole = async (id: string) => {
    if (!confirm("Remove this role?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error("Remove failed", { description: error.message });
    toast.success("Removed"); load();
  };

  const rolesByUser = new Map<string, RoleRow[]>();
  roles.forEach((r) => { const arr = rolesByUser.get(r.user_id) ?? []; arr.push(r); rolesByUser.set(r.user_id, arr); });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Users className="h-3.5 w-3.5" /> {hospital?.hospital_code ?? "—"}
          </div>
          <h1 className="font-display text-3xl font-bold">Hospital Users</h1>
          <p className="text-sm text-muted-foreground">Assign hospital admin or claims executive roles to users already registered in the platform.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2 bg-gradient-primary text-primary-foreground"><UserPlus className="h-4 w-4" /> Add user</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign role</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>User email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@hospital.in" /></div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as "hospital_admin" | "claims_executive")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospital_admin">Hospital Admin</SelectItem>
                    <SelectItem value="claims_executive">Claims Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">User must have signed up first. They'll be linked to this hospital.</p>
            </div>
            <DialogFooter><Button onClick={assignByEmail}>Assign</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>
        ) : profiles.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No users in this hospital yet.</div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const ur = rolesByUser.get(p.id) ?? [];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name ?? "—"}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ur.length === 0 && <span className="text-xs text-muted-foreground">No role</span>}
                        {ur.map((r) => (
                          <Badge key={r.id} variant="outline" className="gap-1 capitalize">
                            {r.role.replace("_", " ")}
                            <button onClick={() => removeRole(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></button>
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
