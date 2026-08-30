import { useState } from "react";
import { LogOut, KeyRound, ChevronDown, Loader2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function Topbar({ title }: { title: string }) {
  const { user, profile, hospital, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const initials = (profile?.full_name || user?.email || "?").slice(0, 2).toUpperCase();
  const roleLabel = roles[0]?.replace("_", " ") ?? "No role";

  const changePassword = async () => {
    if (pwd !== confirm) return toast.error("Passwords do not match");
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error("Could not change password", { description: error.message });
    toast.success("Password updated");
    setOpen(false); setPwd(""); setConfirm("");
  };

  const doSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <SidebarTrigger />
      <div className="flex flex-col">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        <p className="hidden text-xs text-muted-foreground sm:block">Powered by SEHAT AI Engine</p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 shadow-card hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gradient-primary text-xs text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex sm:flex-col sm:leading-tight">
                <span className="text-xs font-semibold">{profile?.full_name ?? user?.email}</span>
                <span className="text-[10px] text-muted-foreground">{hospital?.hospital_name ?? "—"}</span>
              </div>
              <Badge variant="secondary" className="hidden bg-success/10 capitalize text-success xl:inline-flex">{roleLabel}</Badge>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-xs font-medium">{user?.email}</div>
              {hospital && <div className="mt-0.5 text-[10px] text-muted-foreground">{hospital.hospital_code}</div>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <KeyRound className="mr-2 h-4 w-4" /> Change password
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Change password</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Confirm password</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={changePassword} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={doSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
