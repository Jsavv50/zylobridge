import { useAuth } from "@/_core/hooks/useAuth";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { VOCATION_ICONS, VOCATION_KEYS, VOCATION_LABELS, type VocationKey } from "@shared/vocations";
import { ArrowRight, Briefcase, CheckCircle, Shield, Users, Zap } from "lucide-react";
import { Link } from "wouter";

const LOGO_URL = "/ZYLO.png";

const CAPABILITIES = [
  { icon: Briefcase, title: "Marketplace workflows", description: "Create opportunities, discover services, and manage work in one place." },
  { icon: Users, title: "Role-safe workspaces", description: "Purpose-built journeys for clients, professionals, enterprises, and administrators." },
  { icon: Shield, title: "Verification controls", description: "Structured verification requests and protected document-review workflows." },
  { icon: Zap, title: "Connected operations", description: "Messaging, notifications, hiring, and project activity designed to stay connected." },
];

const CLIENT_STEPS = [
  { step: "01", title: "Post your need", description: "Describe the work, set the budget, select a vocation, and publish when ready." },
  { step: "02", title: "Review qualified interest", description: "Compare applications, profiles, and proposal details in a controlled workflow." },
  { step: "03", title: "Hire and coordinate", description: "Manage communication, project activity, and payment milestones from the platform." },
];

const PROFESSIONAL_STEPS = [
  { step: "01", title: "Build your profile", description: "Present your vocation, work history, qualifications, portfolio, and availability." },
  { step: "02", title: "Discover relevant work", description: "Browse marketplace opportunities by vocation, location, budget, and project context." },
  { step: "03", title: "Apply with confidence", description: "Submit your proposal, communicate securely, and track the hiring journey." },
];

function PrimaryCallToAction() {
  const { isAuthenticated, user } = useAuth();
  const buttonStyle = { background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href="/sign-in"><Button size="lg" className="h-12 px-8 text-base font-bold" style={buttonStyle}>Post a Job <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        <Link href="/marketplace"><Button variant="outline" size="lg" className="h-12 border-white/15 bg-transparent px-8 text-base font-bold text-gray-300 hover:border-violet-500/40 hover:text-white">Browse Jobs</Button></Link>
      </div>
    );
  }
  if (user?.role === "SUPER_ADMIN" || user?.role === "admin") return <Link href="/dashboard/admin"><Button size="lg" className="h-12 px-8 text-base font-bold" style={buttonStyle}>Admin Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>;
  if (user?.userType === "client") return <Link href="/dashboard/client"><Button size="lg" className="h-12 px-8 text-base font-bold" style={buttonStyle}>Post a Job <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>;
  if (user?.userType === "professional") return <Link href="/marketplace"><Button size="lg" className="h-12 px-8 text-base font-bold" style={buttonStyle}>Find Work <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>;
  if (user?.userType === "enterprise") return <Link href="/dashboard/enterprise"><Button size="lg" className="h-12 px-8 text-base font-bold" style={buttonStyle}>Open Workspace <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>;
  return <Link href="/onboarding"><Button size="lg" className="h-12 px-8 text-base font-bold" style={buttonStyle}>Complete Setup <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>;
}

function JourneyColumn({ accent, label, icon: Icon, steps }: {
  accent: "violet" | "cyan";
  label: string;
  icon: typeof Briefcase;
  steps: typeof CLIENT_STEPS;
}) {
  const theme = accent === "violet" ? "border-violet-500/25 bg-violet-500/10 text-violet-300" : "border-cyan-500/25 bg-cyan-500/10 text-cyan-300";
  return (
    <div>
      <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme}`}><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="space-y-6">
        {steps.map((item) => <div key={item.step} className="flex gap-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${theme}`}>{item.step}</div><div><h3 className="mb-1 font-semibold text-white">{item.title}</h3><p className="text-sm leading-relaxed text-gray-400">{item.description}</p></div></div>)}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" /><div className="absolute right-0 top-20 h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-3xl" /></div>
          <div className="container relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <div className="mb-8 flex items-center gap-3 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-2"><img src={LOGO_URL} alt="ZYLOBRIDGE" className="h-7 w-7 object-contain" /><span className="text-sm font-semibold tracking-wide text-violet-300">ZYLOBRIDGE MARKETPLACE</span></div>
            <h1 className="mb-6 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Connect with <span style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>skilled professionals</span></h1>
            <p className="mb-10 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">A structured marketplace for contractors, clients, enterprises, and skilled professionals to discover opportunities and coordinate work.</p>
            <PrimaryCallToAction />
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">{["Free to browse", "Role-based workspaces", "Protected workflows"].map((item) => <span key={item} className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" />{item}</span>)}</div>
          </div></div>
        </section>

        <section className="border-y border-white/5 bg-[#131a26]"><div className="container mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {CAPABILITIES.map(({ icon: Icon, title, description }) => <article key={title} className="text-center"><Icon className="mx-auto h-5 w-5 text-violet-400" /><h2 className="mt-3 font-bold text-white">{title}</h2><p className="mx-auto mt-1 max-w-48 text-xs leading-relaxed text-gray-500">{description}</p></article>)}
        </div></section>

        <section className="py-20"><div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center"><span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Specializations</span><h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Explore the vocation catalog</h2><p className="mx-auto mt-4 max-w-xl text-gray-400">Find and post work across an expanding selection of trade, field-service, logistics, creative, and professional services.</p></div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{VOCATION_KEYS.map((key) => <Link key={key} href={`/marketplace?vocation=${key}`}><div className="group flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-white/8 bg-[#131a26] p-5 text-center transition-all duration-200 hover:border-violet-500/30 hover:bg-[#1c2740]"><span className="text-3xl">{VOCATION_ICONS[key as VocationKey]}</span><span className="text-sm font-medium leading-tight text-gray-300 transition-colors group-hover:text-white">{VOCATION_LABELS[key as VocationKey]}</span></div></Link>)}</div>
        </div></section>

        <section className="bg-[#131a26] py-20"><div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mb-12 text-center"><span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Process</span><h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>How ZYLOBRIDGE works</h2></div><div className="grid gap-12 md:grid-cols-2"><JourneyColumn accent="violet" label="For contractors and clients" icon={Briefcase} steps={CLIENT_STEPS} /><JourneyColumn accent="cyan" label="For skilled professionals" icon={Zap} steps={PROFESSIONAL_STEPS} /></div></div></section>

        <section className="py-16"><div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="rounded-2xl border border-violet-500/15 bg-gradient-to-br from-[#131a26] to-[#1c2740] p-8 sm:p-10"><div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-start"><div><h2 className="mb-2 text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Built for controlled collaboration</h2><p className="max-w-md text-sm leading-relaxed text-gray-400">Zylobridge combines role-aware access, protected workflows, and structured marketplace operations for work that requires accountability.</p></div><div className="grid grid-cols-2 gap-3">{["Protected account sessions", "Verification workflows", "Escrow-ready payment flow", "Rate-limited API access"].map((item) => <div key={item} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-300"><CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />{item}</div>)}</div></div></div></div></section>

        <section className="bg-[#131a26] py-20"><div className="container mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8"><img src={LOGO_URL} alt="ZYLOBRIDGE" className="mx-auto mb-6 h-16 w-16 object-contain" /><h2 className="mb-4 text-3xl font-extrabold text-white sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Ready to get started?</h2><p className="mx-auto mb-8 max-w-md text-gray-400">Create an account to post work, build a professional presence, or set up an enterprise workspace.</p><div className="flex flex-col justify-center gap-4 sm:flex-row"><Link href="/sign-in"><Button size="lg" className="h-12 px-10 font-bold" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}>Join as Contractor <ArrowRight className="ml-2 h-4 w-4" /></Button></Link><Link href="/sign-in"><Button variant="outline" size="lg" className="h-12 border-white/15 bg-transparent px-10 font-bold text-gray-300 hover:border-violet-500/40 hover:text-white">Join as Professional</Button></Link></div></div></section>
      </main>
      <Footer />
    </div>
  );
}
