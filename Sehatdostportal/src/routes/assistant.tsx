import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Send, Sparkles, User, FileText, ShieldCheck, Pill, Activity } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/assistant")({
  component: AssistantPage,
});

type Msg = { role: "user" | "ai"; text: string; card?: { title: string; items: string[] } };

const initial: Msg[] = [
  {
    role: "ai",
    text: "Hi there 👋 I'm SEHAT AI Copilot — your insurance & claims intelligence partner. I can decode PM-JAY packages, IRDAI circulars, TPA workflows and 1800+ insurance policy frameworks. What case are we working on?",
  },
];

const prompts = [
  { icon: ShieldCheck, label: "Is CABG covered under PM-JAY?" },
  { icon: FileText, label: "Pre-auth documents for HDFC Ergo?" },
  { icon: Pill, label: "Day-care exclusions in Star Health" },
  { icon: Activity, label: "Average TAT for Niva Bupa claims" },
];

function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text:
            "I'm looking that up for you. For the most accurate coverage details, please verify the latest policy wording with the insurer's TPA before proceeding with pre-authorization.",
        },
      ]);
    }, 700);
  };

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="flex h-[calc(100vh-9rem)] flex-col overflow-hidden border-border/60 shadow-card">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b bg-gradient-card px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Bot className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
              </div>
              <div>
                <div className="text-sm font-semibold">SEHAT AI Copilot</div>
                <div className="text-xs text-muted-foreground">Insurance & claims intelligence · Online</div>
              </div>
            </div>
            <Badge variant="outline" className="border-secondary/40 bg-secondary/10 text-secondary-foreground">
              <Sparkles className="mr-1 h-3 w-3" /> SEHAT AI Engine
            </Badge>
          </div>

          {/* Chat body */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${m.role === "user" ? "bg-muted" : "bg-gradient-primary text-primary-foreground"}`}>
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] ${m.role === "user" ? "" : ""}`}>
                  {m.role === "user" ? (
                    <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-card">
                      {m.text}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm leading-relaxed text-foreground">{m.text}</div>
                      {m.card && (
                        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card p-4">
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                            <ShieldCheck className="h-3.5 w-3.5" /> {m.card.title}
                          </div>
                          <ul className="space-y-1.5 text-sm">
                            {m.card.items.map((it) => (
                              <li key={it} className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> {it}
                              </li>
                            ))}
                          </ul>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t bg-card p-3"
          >
            <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-1.5 shadow-card focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about policies, packages, exclusions, documents..."
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button type="submit" size="icon" className="h-9 w-9 bg-gradient-primary text-primary-foreground">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              AI suggestions are for guidance — always confirm with insurer's TPA before finalizing claims.
            </p>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 p-5 shadow-card">
            <h3 className="text-sm font-semibold">Suggested prompts</h3>
            <p className="text-xs text-muted-foreground">Try one to get started</p>
            <div className="mt-4 space-y-2">
              {prompts.map((p) => (
                <button
                  key={p.label}
                  onClick={() => send(p.label)}
                  className="group flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left text-sm transition-smooth hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <p.icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 leading-snug">{p.label}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden border-secondary/30 bg-gradient-teal p-5 text-white shadow-elegant">
            <Sparkles className="h-5 w-5" />
            <h4 className="mt-3 font-display text-lg font-bold">Knowledge base</h4>
            <p className="mt-1 text-sm text-white/85">
              Trained on insurance policies, NHA package masters, TPA workflows, IRDAI circulars and hospital claim rules — updated weekly.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["IRDAI", "NHA", "PM-JAY", "1800+ policies"].map((t) => (
                <span key={t} className="rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-medium backdrop-blur">{t}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
