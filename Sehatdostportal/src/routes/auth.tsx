import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stethoscope, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SEHAT DOST AI" },
      { name: "description", content: "Sign in to SEHAT DOST AI to verify patient eligibility." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error("Sign in failed", { description: error.message });
    toast.success("Welcome back!");
    navigate({ to: "/dashboard", replace: true });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) return toast.error("Sign up failed", { description: error.message });
    toast.success("Account created", { description: "You can now sign in." });
    setTab("signin");
  };

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
    });
    if (res.error) {
      setBusy(false);
      toast.error("Google sign-in failed", { description: res.error.message });
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    });
    setBusy(false);
    if (error) return toast.error("Could not send reset email", { description: error.message });
    toast.success("Reset email sent", { description: "Check your inbox." });
    setForgotOpen(false);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-hero p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-8 shadow-elegant">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg font-bold leading-tight">SEHAT DOST AI</div>
            <div className="text-xs text-muted-foreground">Simplifying Claims. Amplifying Care.</div>
          </div>
        </div>

        {forgotOpen ? (
          <form onSubmit={resetPassword} className="space-y-4">
            <h2 className="text-lg font-semibold">Reset your password</h2>
            <p className="text-xs text-muted-foreground">We'll email you a link to set a new password.</p>
            <div className="space-y-2">
              <Label htmlFor="fEmail">Work email</Label>
              <Input id="fEmail" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="h-11 w-full bg-gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </Button>
            <button type="button" className="w-full text-center text-xs text-muted-foreground hover:underline" onClick={() => setForgotOpen(false)}>
              Back to sign in
            </button>
          </form>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pwd">Password</Label>
                    <button type="button" onClick={() => { setForgotEmail(email); setForgotOpen(true); }} className="text-xs font-medium text-primary hover:underline">
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 pl-9" />
                  </div>
                </div>
                <Button type="submit" disabled={busy} className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-elegant">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fname">Full name</Label>
                  <Input id="fname" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd2">Password</Label>
                  <Input id="pwd2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="h-11" />
                </div>
                <Button type="submit" disabled={busy} className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-elegant">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  After signup, an administrator must assign your role before you can use the app.
                </p>
              </form>
            </TabsContent>

            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>
            <Button type="button" variant="outline" onClick={google} disabled={busy} className="h-11 w-full">
              Continue with Google
            </Button>
          </Tabs>
        )}

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
