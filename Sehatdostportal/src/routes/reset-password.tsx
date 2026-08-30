import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — SEHAT DOST AI" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the recovery link is opened.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryReady(true);
    });
    // Also accept an existing session (user already clicked the link).
    supabase.auth.getSession().then(({ data }) => { if (data.session) setRecoveryReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error("Could not update password", { description: error.message });
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-hero p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-8 shadow-elegant">
        <h2 className="text-lg font-semibold">Set a new password</h2>
        {!recoveryReady && (
          <p className="text-xs text-muted-foreground">Waiting for the recovery link to be validated…</p>
        )}
        <div className="space-y-2">
          <Label htmlFor="np">New password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="np" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="h-11 pl-9" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp">Confirm password</Label>
          <Input id="cp" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} className="h-11" />
        </div>
        <Button type="submit" disabled={busy || !recoveryReady} className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-elegant">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
        </Button>
      </form>
    </div>
  );
}
