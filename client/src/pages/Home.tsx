import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { VOCATION_LABELS, VOCATION_ICONS, VOCATION_KEYS, type VocationKey } from "@shared/vocations";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const LOGO_URL = "/ZYLO.png";

const PLATFORM_CAPABILITIES = [
  {
    icon: Briefcase,
    title: "Structured hiring",
    description: "Create work opportunities, receive applications, and manage the hiring decision in one workflow.",
  },
  {
    icon: Users,
    title: "Professional profiles",
    description: "Professionals can present their trade, skills, experience, availability, and credentials.",
  },
  {
    icon: MessageSquare,
    title: "Documented conversations",
    description: "Keep job-related communication connected to the work opportunity and its participants.",
  },
  {
    icon: ShieldCheck,
    title: "Verification workflow",
    description: "Submit trade documents for a platform review process before verification status is displayed.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create a clear opportunity",
    description: "Describe the work, location, budget, and trade discipline required for the project.",
  },
  {
    step: "02",
    title: "Review relevant applications",
    description: "Assess professional profiles, cover letters, availability, and proposed pricing before deciding.",
  },
  {
    step: "03",
    title: "Coordinate the engagement",
    description: "Use the connected workflow to progress the selected professional and manage the work lifecycle.",
  },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const primaryCta =
    user?.userType === "professional" ? "/marketplace" :
    user?.userType === "enterprise" ? "/dashboard/enterprise" :
    user?.userType === "unset" ? "/onboarding" :
    "/dashboard/client";
  const primaryLabel =
    user?.userType === "professional" ? "Find Work" :
    user?.userType === "enterprise" ? "Open Enterprise Dashboard" :
    user?.userType === "unset" ? "Complete Setup" :
    "Post a Job";

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
            <div className="absolute right-0 top-24 h-[360px] w-[360px] rounded-full bg-cyan-500/5 blur-3xl" />
          </div>
          <div className="container relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
              <div className="mb-8 flex items-center gap-3 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-2">
                <img src={LOGO_URL} alt="ZYLOBRIDGE" className="h-7 w-7 object-contain" />
                <span className="text-sm font-semibold tracking-wide text-violet-300">ZYLOBRIDGE MARKETPLACE</span>
              </div>
              <h1 className="mb-6 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Connect with <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">skilled professionals</span>
                <br /> for work that matters
              </h1>
              <p className="mb-10 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
                ZYLOBRIDGE connects contractors, organizations, and clients with skilled professionals through structured hiring, profiles, verification review, and job-focused communication.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href={isAuthenticated ? primaryCta : "/sign-in"}>
                  <Button size="lg" className="h-12 px-8 text-base font-bold" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}>
                    {isAuthenticated ? primaryLabel : "Get Started"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/marketplace">
                  <Button variant="outline" size="lg" className="h-12 border-white/15 bg-transparent px-8 text-base font-bold text-gray-300 hover:border-violet-500/40 hover:text-white">
                    Browse Jobs
                  </Button>
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
                {[
                  "Role-aware workflows",
                  "Skills-focused matching",
                  "Job-based communication",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-[#131a26] py-16">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Marketplace capabilities</p>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Built around accountable work relationships.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PLATFORM_CAPABILITIES.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-2xl border border-white/8 bg-[#0d1117] p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10"><Icon className="h-5 w-5 text-violet-300" /></div>
                  <h3 className="mb-2 font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Specializations</p>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Explore skilled work categories.</h2>
              <p className="mx-auto mt-4 max-w-xl text-gray-400">Search current opportunities by trade and use the marketplace to discover relevant work.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {VOCATION_KEYS.map((key) => (
                <Link key={key} href={`/marketplace?vocation=${key}`}>
                  <article className="group flex h-full flex-col items-center gap-3 rounded-xl border border-white/8 bg-[#131a26] p-5 text-center transition-colors hover:border-violet-500/30 hover:bg-[#1c2740]">
                    <span className="text-3xl">{VOCATION_ICONS[key as VocationKey]}</span>
                    <span className="text-sm font-medium leading-tight text-gray-300 transition-colors group-hover:text-white">{VOCATION_LABELS[key as VocationKey]}</span>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#131a26] py-20">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Workflow</p>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>A direct path from opportunity to engagement.</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {HOW_IT_WORKS.map((step) => (
                <article key={step.step} className="rounded-2xl border border-white/8 bg-[#0d1117] p-7">
                  <span className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-violet-500/25 bg-violet-500/15 text-xs font-bold text-violet-300">{step.step}</span>
                  <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <img src={LOGO_URL} alt="ZYLOBRIDGE" className="mx-auto mb-6 h-16 w-16 object-contain" />
            <h2 className="mb-4 text-3xl font-extrabold text-white sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Ready to build your next work relationship?</h2>
            <p className="mx-auto mb-8 max-w-md text-gray-400">Create an account to post opportunities, build a professional profile, or explore the marketplace.</p>
            <Link href="/sign-in"><Button size="lg" className="h-12 px-10 font-bold" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}>Create an account <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
