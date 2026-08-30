import Image from "next/image";
import type { ReactNode } from "react";

type IconName =
  | "clock"
  | "shield"
  | "users"
  | "network"
  | "search"
  | "scan"
  | "file"
  | "send"
  | "activity"
  | "spark"
  | "globe"
  | "language"
  | "map"
  | "check";

const positioning = "AI-powered claims workflow system for hospitals";

const problemPoints = [
  {
    icon: "clock",
    title: "Delayed discharge",
    body: "Patients can spend extra time waiting while approvals and documents move between teams."
  },
  {
    icon: "shield",
    title: "Claim errors",
    body: "Small documentation gaps can create repeated checks, queries, and avoidable rework."
  },
  {
    icon: "users",
    title: "Staff workload",
    body: "TPA desk and billing teams spend valuable time on repetitive manual tasks."
  },
  {
    icon: "network",
    title: "Lack of coordination",
    body: "Claim information often sits across portals, files, calls, and internal follow-ups."
  }
] satisfies Array<{ icon: IconName; title: string; body: string }>;

const solutionSteps = [
  {
    icon: "search",
    title: "Eligibility Check",
    body: "Check basic scheme or policy details at the start of the workflow."
  },
  {
    icon: "scan",
    title: "Document Validation",
    body: "Review required documents and flag missing information before submission."
  },
  {
    icon: "file",
    title: "Claim Preparation",
    body: "Organize claim details into a guided, easier-to-review packet."
  },
  {
    icon: "send",
    title: "Submission Support",
    body: "Help staff prepare and move claims through the right submission steps."
  },
  {
    icon: "activity",
    title: "Status Tracking",
    body: "Keep staff informed on claim progress, queries, and next actions."
  }
] satisfies Array<{ icon: IconName; title: string; body: string }>;

const features = [
  {
    icon: "search",
    title: "Easy to use interface",
    body: "A clear workspace for busy hospital teams handling claims every day."
  },
  {
    icon: "check",
    title: "Guided workflows",
    body: "Step-by-step claim flows help staff know what to prepare and review."
  },
  {
    icon: "language",
    title: "Multilingual support",
    body: "Designed to support frontline teams working across Indian languages."
  },
  {
    icon: "network",
    title: "Works with existing systems",
    body: "Built to fit into hospital processes without forcing teams to start over."
  }
] satisfies Array<{ icon: IconName; title: string; body: string }>;

const impactItems = [
  {
    icon: "clock",
    title: "Faster claim processing",
    body: "Guided steps help teams move claims with fewer manual handoffs."
  },
  {
    icon: "file",
    title: "Reduced documentation errors",
    body: "Early checks help staff spot missing or inconsistent information."
  },
  {
    icon: "activity",
    title: "Improved discharge timelines",
    body: "Better claim readiness can support smoother discharge coordination."
  },
  {
    icon: "users",
    title: "Better visibility for staff",
    body: "Teams can see status, pending work, and next steps more clearly."
  }
] satisfies Array<{ icon: IconName; title: string; body: string }>;

const ecosystemPoints = [
  {
    icon: "check",
    title: "PM-JAY workflows",
    body: "Designed with public scheme workflows and hospital documentation needs in mind."
  },
  {
    icon: "file",
    title: "Hospital processes",
    body: "Supports practical claim preparation, review, and follow-up routines."
  },
  {
    icon: "map",
    title: "Operational challenges",
    body: "Built for teams working with limited time, staff, and system visibility."
  }
] satisfies Array<{ icon: IconName; title: string; body: string }>;

const differentiators = [
  {
    icon: "globe",
    title: "India-first approach",
    body: "Designed around Indian hospital claims workflows and everyday operating constraints."
  },
  {
    icon: "check",
    title: "PM-JAY ready",
    body: "Built with public scheme workflows, package checks, and pre-authorization steps in mind."
  },
  {
    icon: "language",
    title: "Multilingual",
    body: "Helps make guided claim workflows easier for frontline teams to adopt."
  },
  {
    icon: "map",
    title: "Designed for Tier 2/3 hospitals",
    body: "Created for hospitals where teams need simple tools and practical onboarding."
  }
] satisfies Array<{ icon: IconName; title: string; body: string }>;

const team: Array<{
  name: string;
  role: string;
  detail: string;
  image: string;
}> = [
  {
    name: "Mr. Shashi Kumar",
    role: "Founder, CEO",
    detail: "Mentor and educator with healthcare operations and leadership experience.",
    image: "/team-shashi-kumar.png"
  },
  {
    name: "Dr. Ruchi Singh Gaur",
    role: "Co-Founder, COO",
    detail: "CEO, Unity Critical Care, with direct hospital operations experience.",
    image: "/team-ruchi-singh-gaur.png"
  },
  {
    name: "Ms. Richa Prasad",
    role: "Advisor",
    detail: "Hospital operations leader focused on practical process improvement.",
    image: "/team-richa-prasad.png"
  },
  {
    name: "Mr. Kaushal Kishore",
    role: "CFO",
    detail: "Compliance and governance experience supporting responsible growth.",
    image: "/team-kaushal-kishore.png"
  },
  {
    name: "Mr. Rahul Deo Pandey",
    role: "CTO",
    detail: "Senior software developer with product and systems delivery experience.",
    image: "/team-rahul-deo-pandey.png"
  }
];

const navItems = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "Features", href: "#features" },
  { label: "Why", href: "#why" },
  { label: "Team", href: "#team" }
];

function Icon({ name }: { name: IconName }) {
  const common = {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.85,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true
  };

  const paths: Record<IconName, ReactNode> = {
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    shield: <path d="M12 3 5 6v6c0 4.5 2.9 7.4 7 9 4.1-1.6 7-4.5 7-9V6l-7-3Z" />,
    users: (
      <>
        <path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4" />
        <circle cx="12" cy="9" r="3" />
        <path d="M20 19c0-1.7-1-3.1-2.5-3.7" />
        <path d="M6.5 15.3C5 15.9 4 17.3 4 19" />
      </>
    ),
    network: (
      <>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="7" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="m8 7 8 0M7.3 8.2l3.5 7.5M16.8 9.1l-3.7 6.6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </>
    ),
    scan: (
      <>
        <path d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M7 21H5a2 2 0 0 1-2-2v-2M17 21h2a2 2 0 0 0 2-2v-2" />
        <path d="M7 12h10M9 8h6M9 16h4" />
      </>
    ),
    file: (
      <>
        <path d="M7 3h7l4 4v14H7V3Z" />
        <path d="M14 3v5h4M9 13h6M9 17h4" />
      </>
    ),
    send: (
      <>
        <path d="m4 12 16-8-6 16-3-7-7-1Z" />
        <path d="m11 13 4-4" />
      </>
    ),
    activity: <path d="M3 12h4l2.5-6 5 12L17 12h4" />,
    spark: (
      <>
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z" />
      </>
    ),
    language: (
      <>
        <path d="M4 5h8M8 3v2M10 5c-.5 3-2.5 5.5-6 7" />
        <path d="M5 9c1.2 1.5 2.6 2.6 4.5 3.3" />
        <path d="M14 21l4-9 4 9M15.3 18h5.4" />
      </>
    ),
    map: (
      <>
        <path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    )
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function SectionHeader({
  eyebrow,
  title,
  copy,
  align = "center"
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ocean">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {copy ? (
        <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">{copy}</p>
      ) : null}
    </div>
  );
}

function Card({
  icon,
  title,
  body
}: {
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <article className="reveal group rounded-[1.5rem] border border-slate-200/80 bg-white p-7 shadow-[0_16px_50px_rgba(7,17,31,0.055)] transition duration-300 hover:-translate-y-1 hover:border-ocean/25 hover:shadow-[0_24px_70px_rgba(7,17,31,0.09)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ocean/10 text-ocean transition duration-300 group-hover:bg-ocean group-hover:text-white">
        <Icon name={icon} />
      </div>
      <h3 className="mt-6 text-lg font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}

export default function Home() {
  return (
    <main className="overflow-hidden bg-white">
      <section id="hero" className="relative min-h-[92svh] text-white">
        <Image
          src="/hero-slide.jpg"
          alt="AI-enabled hospital operations center"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(4,16,32,0.82)_0%,rgba(5,22,42,0.72)_48%,rgba(5,22,42,0.45)_100%),linear-gradient(180deg,rgba(4,16,32,0.18),rgba(4,16,32,0.74))]" />
        <header className="absolute left-0 right-0 top-0 z-20">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
            <a href="#hero" className="flex items-center">
              <Image
                src="/sehatdost-logo.svg"
                alt="SehatDost AI"
                width={316}
                height={64}
                className="h-10 w-auto sm:h-12"
                priority
              />
            </a>
            <div className="hidden items-center gap-7 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white/85 backdrop-blur md:flex">
              {navItems.map((item) => (
                <a key={item.label} href={item.href} className="transition hover:text-white">
                  {item.label}
                </a>
              ))}
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <a
                href="http://localhost:8080"
                className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.16]"
              >
                Dashboard
              </a>
              <a
                href="mailto:founders@sehatdost.ai?subject=Request%20Early%20Access%20-%20SehatDost%20AI"
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink shadow-lg transition hover:-translate-y-0.5 hover:bg-sky-50"
              >
                Request Early Access
              </a>
            </div>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-7xl items-center px-6 pb-16 pt-32 lg:px-8">
          <div className="max-w-4xl">
            <p className="hero-reveal inline-flex rounded-full border border-cyan-100/25 bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-50 backdrop-blur">
              {positioning}
            </p>
            <h1 className="hero-reveal mt-7 max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Simplifying Claims. Amplifying Care.
            </h1>
            <p className="hero-reveal mt-7 max-w-3xl text-lg leading-8 text-slate-100 sm:text-xl">
              SehatDost AI helps hospitals streamline insurance workflows,
              reduce errors, and improve discharge experiences.
            </p>
            <p className="hero-reveal mt-5 text-sm font-medium text-cyan-100">
              Currently in pilot phase. Launching soon.
            </p>
            <div className="hero-reveal mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="mailto:founders@sehatdost.ai?subject=Request%20Early%20Access%20-%20SehatDost%20AI"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-semibold text-ink shadow-xl transition hover:-translate-y-0.5 hover:bg-sky-50"
              >
                Request Early Access
              </a>
              <a
                href="#problem"
                className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.16]"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="section-pad bg-cloud">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            eyebrow="Problem"
            title="Healthcare claims are still manual and time-consuming"
            copy="Most hospitals still rely on manual processes across multiple systems."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {problemPoints.map((point) => (
              <Card key={point.title} {...point} />
            ))}
          </div>
        </div>
      </section>

      <section id="solution" className="section-pad bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            eyebrow="Solution"
            title="A simpler way to manage hospital claims"
            copy="SehatDost AI brings key claim processes into one guided workflow."
          />
          <div className="relative mt-14 lg:mt-16">
            <div className="absolute left-[10%] right-[10%] top-12 hidden h-px bg-gradient-to-r from-transparent via-ocean/20 to-transparent lg:block" />
            <div className="grid gap-5 lg:grid-cols-5">
              {solutionSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="reveal relative rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(7,17,31,0.055)] transition duration-300 hover:-translate-y-1 hover:border-ocean/25"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-ocean ring-8 ring-white">
                      <Icon name={step.icon} />
                    </div>
                    <span className="text-sm font-semibold text-slate-300">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 text-base font-semibold tracking-tight text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section-pad bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
            <div className="reveal">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ocean">
                Product
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Designed for everyday hospital operations
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
                Practical tools for claim teams who need clarity, consistency,
                and fewer manual follow-ups.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {features.map((feature) => (
                <Card key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="impact" className="section-pad bg-ink text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Expected Benefits
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Built to make claims work easier to manage
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg">
              During pilot and early rollout, the focus is on practical workflow
              improvements that hospital teams can trust.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {impactItems.map((item) => (
              <article
                key={item.title}
                className="reveal rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-7 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/[0.1]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-200">
                  <Icon name={item.icon} />
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="market" className="section-pad bg-cloud">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            eyebrow="India Healthcare"
            title="Built for India's healthcare ecosystem"
            copy="Designed keeping in mind PM-JAY workflows, hospital processes, and real operational challenges."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {ecosystemPoints.map((point) => (
              <Card key={point.title} {...point} />
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="section-pad bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            eyebrow="Why SehatDost AI"
            title="Grounded in how hospitals actually work"
            copy="A calm, practical approach to claims workflow support for Indian hospitals."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {differentiators.map((item) => (
              <Card key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="section-pad bg-cloud">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader
            eyebrow="Team"
            title="Team with experience in healthcare operations and technology"
            copy="A small team working closely with hospital partners to shape the product before launch."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {team.map((member) => (
              <article
                key={member.name}
                className="reveal flex h-full flex-col rounded-[1.5rem] border border-slate-300/80 bg-white p-7 text-center shadow-[0_18px_55px_rgba(7,17,31,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(7,17,31,0.14)]"
              >
                <div className="mx-auto flex h-36 w-36 items-end justify-center overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_14px_35px_rgba(7,17,31,0.14)]">
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={220}
                    height={220}
                    className="h-full w-full object-contain"
                  />
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-ink">
                  {member.name}
                </h3>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-ocean">
                  {member.role}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-600">{member.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="bg-ink px-6 py-24 text-white lg:px-8">
        <div className="reveal mx-auto max-w-4xl rounded-[1.75rem] border border-white/20 bg-white/[0.13] px-6 py-14 text-center shadow-[0_30px_100px_rgba(0,0,0,0.34)] backdrop-blur sm:px-10 lg:px-16">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
            Early Access
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Be among the first to try SehatDost AI
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            We're onboarding early hospital partners.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="mailto:founders@sehatdost.ai?subject=Request%20Early%20Access%20-%20SehatDost%20AI"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold text-ink shadow-xl transition hover:-translate-y-0.5 hover:bg-sky-50"
            >
              Request Early Access
            </a>
            <a
              href="mailto:founders@sehatdost.ai"
              className="text-sm font-semibold text-cyan-100 transition hover:text-white"
            >
              founders@sehatdost.ai
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <a href="#hero" className="flex items-center gap-3 text-ink">
            <Image
              src="/sehatdost-logo.svg"
              alt="SehatDost AI"
              width={260}
              height={53}
              className="h-9 w-auto"
            />
          </a>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <a href="mailto:founders@sehatdost.ai" className="hover:text-ocean">
              founders@sehatdost.ai
            </a>
            <a href="https://www.sehatdost.ai" className="hover:text-ocean">
              www.sehatdost.ai
            </a>
            <p>Copyright 2026 SehatDost AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
