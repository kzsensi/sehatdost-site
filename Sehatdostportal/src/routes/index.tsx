import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Stethoscope, Mail, Lock, ArrowRight, ShieldCheck, Sparkles, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SEHAT DOST AI — Simplifying Claims. Amplifying Care." },
      {
        name: "description",
        content:
          "AI-powered patient insurance and Ayushman eligibility verification platform for hospitals.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/auth" });
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col justify-between p-8 lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-base font-bold tracking-tight">SEHAT DOST AI</span>
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
              Simplifying Claims. Amplifying Care.
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md py-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
            <Sparkles className="h-3 w-3 text-primary-glow" />
            Trusted by 240+ hospitals across India
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Welcome back.</h1>
          <p className="mt-3 text-muted-foreground">
            Verify patient insurance &amp; Ayushman Bharat (PM-JAY) eligibility instantly with the SEHAT AI Engine.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["IRDAI aligned", "NHA compliant", "PM-JAY ready"].map((b) => (
              <span key={b} className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
                <ShieldCheck className="h-3 w-3" /> {b}
              </span>
            ))}
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a className="text-xs font-medium text-primary hover:underline" href="#">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="group h-11 w-full bg-gradient-primary text-primary-foreground shadow-elegant transition-smooth hover:opacity-95"
            >
              Sign in to dashboard
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => navigate({ to: "/auth" })}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Sign in to continue
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in you agree to our{" "}
            <Link to="/" className="underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          © 2026 Sehat Dost Technologies · Made with care in India
        </div>
      </div>

      {/* Right: visual */}
      <div className="relative hidden overflow-hidden bg-gradient-hero lg:block">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            IRDAI aligned · NHA compliant · ISO 27001
          </div>

          <div className="space-y-8">
            <h2 className="font-display text-4xl font-bold leading-tight">
              Simplifying claims.
              <br />
              <span className="text-secondary">Amplifying care.</span>
            </h2>
            <p className="max-w-md text-white/80">
              Get real-time eligibility, approval probability, and AI recommendations for every
              patient — before treatment begins.
            </p>

            <div className="grid max-w-md gap-3">
              {[
                { icon: ShieldCheck, label: "98.4% verification accuracy" },
                { icon: Activity, label: "Avg. 12 seconds per check" },
                { icon: Sparkles, label: "1800+ insurance & Ayushman frameworks" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm italic text-white/90">
              "Sehat Dost cut our pre-auth time by 73%. Patients now get clarity before admission —
              not days after."
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                SD
              </div>
              <div className="text-xs">
                <div className="font-semibold">Hospital Administrator</div>
                <div className="text-white/70">Multi-specialty tertiary care network</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
