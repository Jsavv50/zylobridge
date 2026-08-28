import { useEffect, useState, type ElementType, type KeyboardEvent } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FileText,
  Hammer,
  Handshake,
  HardHat,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  UserPlus,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/_core/hooks/useAuth";
import { VOCATION_CATEGORY_BY_KEY, VOCATION_ICONS, VOCATION_LABELS, type VocationKey } from "@shared/vocations";

type Journey = "hiring" | "professional";

type JourneyStep = {
  eyebrow: string;
  title: string;
  description: string;
  items?: string[];
  cta?: { label: string; href: string };
  icon: ElementType;
};

type FaqGroup = {
  category: string;
  items: Array<{ question: string; answer: string }>;
};

const hiringSteps: JourneyStep[] = [
  {
    eyebrow: "Step 01",
    title: "Create your account",
    description: "Create a ZYLOBRIDGE account and choose the Contractor / Client role during onboarding.",
    icon: UserPlus,
  },
  {
    eyebrow: "Step 02",
    title: "Post your project",
    description: "Give professionals the context they need to understand the opportunity and propose an informed rate.",
    items: ["Vocation", "Project description", "Location", "Budget", "Deadline", "Requirements"],
    cta: { label: "Post a Job", href: "/jobs/new" },
    icon: FileText,
  },
  {
    eyebrow: "Step 03",
    title: "Receive applications",
    description: "Professionals can apply with their profile, experience, verification status, proposed rate, cover letter, and available reputation history.",
    icon: Users,
  },
  {
    eyebrow: "Step 04",
    title: "Compare and select",
    description: "Review the evidence that matters: relevant experience, verification, application quality, proposed rate, ratings, and completed-work history where available.",
    cta: { label: "Find Professionals", href: "/talent" },
    icon: UserCheck,
  },
  {
    eyebrow: "Step 05",
    title: "Fund eligible work and start",
    description: "After the hiring relationship is confirmed, eligible project or milestone funding can be initiated through ZYLOBRIDGE’s supported payment flow before work begins.",
    cta: { label: "Open Escrow & Funding", href: "/payments" },
    icon: WalletCards,
  },
  {
    eyebrow: "Step 06",
    title: "Complete, release, and review",
    description: "Track the work, confirm satisfactory completion, authorize the applicable release, and leave a review tied to the completed engagement.",
    items: ["Mark complete", "Authorize release", "Leave a review"],
    icon: CheckCircle2,
  },
];

const professionalSteps: JourneyStep[] = [
  {
    eyebrow: "Step 01",
    title: "Create your professional profile",
    description: "Build a clear marketplace identity that helps hiring teams understand where, how, and in which vocation you work.",
    items: ["Vocation", "Skills", "Experience", "Location", "Rates", "Portfolio", "Certifications"],
    cta: { label: "Build Your Profile", href: "/profile" },
    icon: HardHat,
  },
  {
    eyebrow: "Step 02",
    title: "Submit credentials for verification",
    description: "Upload an eligible credential for review. Approved records can support a Verified badge on relevant marketplace surfaces.",
    cta: { label: "Start Verification", href: "/verification" },
    icon: BadgeCheck,
  },
  {
    eyebrow: "Step 03",
    title: "Discover opportunities",
    description: "Browse open jobs and use vocation, location, budget, urgency, and relevance filters to focus on suitable work.",
    cta: { label: "Browse Jobs", href: "/jobs" },
    icon: Search,
  },
  {
    eyebrow: "Step 04",
    title: "Apply with context",
    description: "Submit a tailored cover letter, proposed rate, and the relevant experience already represented in your profile.",
    icon: FileCheck2,
  },
  {
    eyebrow: "Step 05",
    title: "Move through the hiring pipeline",
    description: "A contractor may shortlist your application, schedule an interview, send an offer, and confirm the engagement through structured workflow states.",
    icon: Handshake,
  },
  {
    eyebrow: "Step 06",
    title: "Complete work and build reputation",
    description: "Use My Work and Messages to stay aligned, complete funded work, receive released payments, and build reputation through eligible reviews.",
    items: ["Work", "Completion", "Payment release", "Review"],
    cta: { label: "Open My Work", href: "/my-work" },
    icon: Star,
  },
];

const lifecycle = [
  { label: "Open", body: "A structured opportunity is published.", icon: FileText },
  { label: "Applications", body: "Professionals submit proposals and rates.", icon: Users },
  { label: "Selected", body: "A candidate advances through the hiring pipeline.", icon: UserCheck },
  { label: "Funded", body: "Eligible work is funded through a supported provider.", icon: LockKeyhole },
  { label: "In progress", body: "The engagement is active and coordinated in-platform.", icon: Hammer },
  { label: "Review", body: "Completion and deliverables are assessed.", icon: ClipboardCheck },
  { label: "Completed", body: "The project reaches its completed state.", icon: CheckCircle2 },
  { label: "Paid", body: "An authorized release is recorded.", icon: Banknote },
  { label: "Reviewed", body: "Eligible feedback contributes to reputation.", icon: Star },
];

const featuredVocations: VocationKey[] = [
  "electrician",
  "carpenter",
  "plumber",
  "mason_bricklayer",
  "painter",
  "flooring_tiler",
  "heavy_equipment_operator",
  "road_construction_worker",
  "hvac_technician",
  "elevator_installer_repairer",
  "pest_control_technician",
  "glazier",
];

const faqGroups: FaqGroup[] = [
  {
    category: "Getting started",
    items: [
      { question: "Is ZYLOBRIDGE free to join?", answer: "Creating an account and browsing available marketplace pages does not currently require a subscription. Any payment-provider charges or platform costs that apply to a transaction should be shown within the supported funding flow before you proceed." },
      { question: "Who can use ZYLOBRIDGE?", answer: "Contractors, clients, enterprises, project owners, and skilled professionals can use the platform, subject to the account role and availability of each feature in their market." },
      { question: "Can one account be both a hiring account and a professional account?", answer: "The current onboarding flow assigns one active marketplace role to an account. Use the role that reflects your primary activity and contact support if your account needs to be reviewed." },
      { question: "How do I create an account?", answer: "Select Create Free Account or Sign In and continue through the existing authentication and onboarding flow. You will choose the account type that determines your workspace and permissions." },
    ],
  },
  {
    category: "Hiring",
    items: [
      { question: "How do I post a job?", answer: "A Contractor / Client can open Post a Job, enter the scope, vocation, location, budget, deadline, and requirements, then publish the opportunity after validation." },
      { question: "How do I review applications?", answer: "Open My Job Postings and choose the Candidate Pipeline for the relevant job. The pipeline provides job-scoped applications, filters, profile context, and supported hiring actions." },
      { question: "How do I select a professional?", answer: "Use the Candidate Pipeline to compare candidates, shortlist suitable applicants, manage interviews, create an offer, and confirm the hire. ZYLOBRIDGE records each supported lifecycle transition." },
      { question: "Can I hire someone who is not Verified?", answer: "Verification is an additional trust signal, not an automatic guarantee of workmanship. Hiring decisions remain with the contractor or client, who should evaluate the full profile, application, experience, and project requirements." },
    ],
  },
  {
    category: "Verification",
    items: [
      { question: "What does Verified mean?", answer: "It means an eligible credential submitted by the professional was reviewed and approved in the platform’s verification workflow. It does not guarantee project quality, safety, or outcome." },
      { question: "What documents may be submitted?", answer: "Supported categories include trade licences, professional certifications, apprenticeship certificates, employer confirmations, and vocational training certificates, subject to review." },
      { question: "How long does verification take?", answer: "Review time can vary with document quality and review volume. Professionals can monitor the status of their submitted verification items in their account." },
      { question: "Can verification expire?", answer: "A credential may include an expiry date where applicable. Professionals should keep time-sensitive credentials current and respond to any review request shown in the platform." },
    ],
  },
  {
    category: "Payments",
    items: [
      { question: "How does escrow-supported funding work?", answer: "For eligible engagements, the hiring account initiates payment through a supported provider. ZYLOBRIDGE records the verified funding state, and later release or refund actions remain subject to the authorized workflow and platform policy." },
      { question: "What payment methods are supported?", answer: "Supported options depend on country and provider configuration. The current platform uses Paystack for supported NGN payments and a configured Ozow EFT route for supported ZAR payments. The funding screen shows the methods available for the selected engagement." },
      { question: "When does the professional receive payment?", answer: "Payment becomes available through the relevant release and payout lifecycle after funded work is completed and the authorized completion or release step is recorded." },
      { question: "What happens if work is not completed?", answer: "Do not authorize completion or release. Keep the project conversation and evidence connected to the job, and use the available dispute or support workflow where appropriate." },
    ],
  },
  {
    category: "Safety",
    items: [
      { question: "What happens during a dispute?", answer: "The platform can preserve the relevant project, communication, payment, and submitted evidence context for review. Outcomes are determined through the applicable platform process and terms; they are not guaranteed in advance." },
      { question: "Are my messages secure?", answer: "Messages are access-controlled to the relevant marketplace participants and are transmitted through the production HTTPS service. ZYLOBRIDGE does not present the messaging system as end-to-end encrypted." },
      { question: "Is payment information protected?", answer: "Provider payment details are handled through the configured payment service. ZYLOBRIDGE uses server-side verification and does not place payment secret keys in frontend code." },
      { question: "What if someone asks me to pay outside ZYLOBRIDGE?", answer: "Do not move a project payment off-platform when the engagement is intended to use ZYLOBRIDGE funding. Off-platform transactions may not be covered by the platform’s records, dispute process, or payment safeguards." },
    ],
  },
  {
    category: "Professionals",
    items: [
      { question: "How do I apply for jobs?", answer: "Open Browse Jobs, choose an open opportunity, and submit the requested cover letter and proposed rate from a professional account." },
      { question: "Can I apply to multiple jobs?", answer: "A professional may apply to multiple open jobs. Duplicate active applications to the same job are blocked, and each engagement should be managed responsibly." },
      { question: "How do I improve my profile?", answer: "Complete your vocation, headline, bio, experience, qualifications, portfolio, service preferences, location, availability, and verification information where relevant." },
      { question: "How do ratings work?", answer: "Eligible completed work can produce a review tied to the real job relationship. ZYLOBRIDGE does not display fabricated ratings or testimonials when no review exists." },
    ],
  },
];

function useHowItWorksMetadata() {
  useEffect(() => {
    const title = "How ZYLOBRIDGE Works | Hire Skilled Professionals & Find Work";
    const description = "Learn how ZYLOBRIDGE connects contractors and clients with skilled professionals through verified profiles, structured hiring, secure messaging and escrow-supported payments.";
    const previousTitle = document.title;
    const upsertMeta = (selector: string, attributes: Record<string, string>) => {
      const existing = document.head.querySelector<HTMLMetaElement>(selector);
      const element = existing ?? document.createElement("meta");
      const previous = existing ? { content: existing.content } : null;
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
      if (!existing) document.head.appendChild(element);
      return () => previous ? (element.content = previous.content) : element.remove();
    };
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') ?? document.createElement("link");
    const previousCanonical = canonical.getAttribute("href");
    canonical.rel = "canonical";
    canonical.href = "https://zylobridge.com/how-it-works";
    if (!canonical.parentNode) document.head.appendChild(canonical);
    const restoreDescription = upsertMeta('meta[name="description"]', { name: "description", content: description });
    const restoreOgTitle = upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    const restoreOgDescription = upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    const restoreOgUrl = upsertMeta('meta[property="og:url"]', { property: "og:url", content: "https://zylobridge.com/how-it-works" });
    const structured = document.createElement("script");
    structured.type = "application/ld+json";
    structured.dataset.page = "how-it-works";
    structured.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: "https://zylobridge.com/how-it-works",
      mainEntity: faqGroups.flatMap((group) => group.items).map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
    });
    document.head.appendChild(structured);
    document.title = title;
    return () => {
      document.title = previousTitle;
      restoreDescription();
      restoreOgTitle();
      restoreOgDescription();
      restoreOgUrl();
      if (previousCanonical) canonical.href = previousCanonical;
      else canonical.remove();
      structured.remove();
    };
  }, []);
}

function SectionHeading({ eyebrow, title, description, align = "center" }: { eyebrow: string; title: string; description?: string; align?: "left" | "center" }) {
  return <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">{eyebrow}</p>
    <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">{title}</h2>
    {description && <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">{description}</p>}
  </div>;
}

function TrustPill({ icon: Icon, children }: { icon: ElementType; children: string }) {
  return <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-300"><Icon className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />{children}</div>;
}

function JourneyCard({ step, index, accent }: { step: JourneyStep; index: number; accent: "violet" | "cyan" }) {
  const Icon = step.icon;
  const accentClasses = accent === "violet" ? "border-violet-400/20 bg-violet-500/10 text-violet-200" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
  return <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#101722] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentClasses}`}><Icon className="h-5 w-5" aria-hidden="true" /></div>
      <span className="font-mono text-xs text-slate-600">{String(index + 1).padStart(2, "0")}</span>
    </div>
    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{step.eyebrow}</p>
    <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate-400">{step.description}</p>
    {step.items && <ul className="mt-4 grid grid-cols-2 gap-2" aria-label={`${step.title} details`}>{step.items.map((item) => <li key={item} className="flex items-start gap-2 text-xs text-slate-400"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />{item}</li>)}</ul>}
    {step.cta && <Link href={step.cta.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 transition hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{step.cta.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
  </article>;
}

function JourneyTabs({ value, onChange }: { value: Journey; onChange: (value: Journey) => void }) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      onChange(value === "hiring" ? "professional" : "hiring");
    }
  };
  return <div role="tablist" aria-label="Choose how you want to use ZYLOBRIDGE" className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2 md:grid-cols-2">
    <button id="journey-hiring-tab" role="tab" aria-selected={value === "hiring"} aria-controls="journey-panel" tabIndex={value === "hiring" ? 0 : -1} onKeyDown={handleKeyDown} onClick={() => onChange("hiring")} className={`rounded-xl px-5 py-5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${value === "hiring" ? "bg-violet-600 text-white shadow-lg shadow-violet-950/30" : "text-slate-300 hover:bg-white/[0.05]"}`}>
      <span className="flex items-center gap-2 text-sm font-semibold"><BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />Contractor / Client</span>
      <span className={`mt-2 block text-xs leading-5 ${value === "hiring" ? "text-violet-100" : "text-slate-500"}`}>Post a project, compare professionals, hire confidently, and manage funded work.</span>
    </button>
    <button id="journey-professional-tab" role="tab" aria-selected={value === "professional"} aria-controls="journey-panel" tabIndex={value === "professional" ? 0 : -1} onKeyDown={handleKeyDown} onClick={() => onChange("professional")} className={`rounded-xl px-5 py-5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${value === "professional" ? "bg-cyan-700 text-white shadow-lg shadow-cyan-950/30" : "text-slate-300 hover:bg-white/[0.05]"}`}>
      <span className="flex items-center gap-2 text-sm font-semibold"><HardHat className="h-4 w-4" aria-hidden="true" />Skilled Professional</span>
      <span className={`mt-2 block text-xs leading-5 ${value === "professional" ? "text-cyan-50" : "text-slate-500"}`}>Discover opportunities, apply, build reputation, and follow secure payment states.</span>
    </button>
  </div>;
}

export default function HowItWorks() {
  const { user, isAuthenticated } = useAuth();
  const [journey, setJourney] = useState<Journey>("hiring");
  useHowItWorksMetadata();

  useEffect(() => {
    if (user?.userType === "professional") setJourney("professional");
    if (user?.userType === "client" || user?.userType === "enterprise") setJourney("hiring");
  }, [user?.userType]);

  const steps = journey === "hiring" ? hiringSteps : professionalSteps;
  const dashboardHref = user?.userType === "professional" ? "/dashboard/professional" : user?.userType === "enterprise" ? "/dashboard/enterprise" : user?.role === "admin" || user?.role === "SUPER_ADMIN" ? "/dashboard/admin" : "/employer";

  return <div className="min-h-screen overflow-x-hidden bg-[#080d14] text-white">
    <a href="#main-content" className="sr-only z-[100] rounded-md bg-violet-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    <Navbar />
    <main id="main-content">
      <section className="relative overflow-hidden border-b border-white/5 px-4 pb-20 pt-16 sm:pb-24 sm:pt-20">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true"><div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" /><div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" /></div>
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />How ZYLOBRIDGE Works</div>
            <h1 className="mt-7 max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">Hire skilled professionals. <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">Get quality work.</span> Get paid securely.</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">ZYLOBRIDGE connects contractors and clients with verified skilled professionals through a simple, transparent hiring process—from finding the right person to secure payment and project completion.</p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">I’m hiring</p><h2 className="mt-2 text-lg font-semibold">Contractor / Client</h2><Link href="/talent" className="mt-5 inline-flex"><Button size="lg" className="bg-violet-600 hover:bg-violet-500">Find Professionals<ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.07] p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">I’m looking for work</p><h2 className="mt-2 text-lg font-semibold">Skilled Professional</h2><Link href="/jobs" className="mt-5 inline-flex"><Button size="lg" variant="outline" className="border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20">Find Jobs<ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div>
            </div>
            <div className="mt-7 flex flex-wrap gap-2"><TrustPill icon={BadgeCheck}>Verified professionals</TrustPill><TrustPill icon={LockKeyhole}>Escrow-supported payments</TrustPill><TrustPill icon={MessageSquareText}>Secure messaging</TrustPill><TrustPill icon={Star}>Transparent reviews</TrustPill></div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[#0f1622] p-5 shadow-2xl shadow-black/30 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/8 pb-5"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Marketplace lifecycle</p><p className="mt-1 text-lg font-semibold">From search to successful work</p></div><ShieldCheck className="h-6 w-6 text-emerald-300" aria-hidden="true" /></div>
            <div className="mt-6 space-y-3">
              {[{ icon: Search, title: "Discover", body: "Find a professional or an open opportunity." }, { icon: ClipboardCheck, title: "Decide", body: "Compare evidence and confirm the right fit." }, { icon: LockKeyhole, title: "Protect", body: "Fund eligible work through supported providers." }, { icon: Handshake, title: "Deliver", body: "Work, complete, release, and build reputation." }].map((item, index) => <div key={item.title} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><item.icon className="h-5 w-5" aria-hidden="true" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.body}</p></div><span className="font-mono text-xs text-slate-600">0{index + 1}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:py-24" aria-labelledby="journey-heading">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Choose your journey" title="How do you want to use ZYLOBRIDGE?" description="Switch between the two marketplace journeys. The information changes instantly—without reloading the page." />
          <div className="mx-auto mt-10 max-w-4xl"><JourneyTabs value={journey} onChange={setJourney} /></div>
          <div id="journey-panel" role="tabpanel" aria-labelledby={journey === "hiring" ? "journey-hiring-tab" : "journey-professional-tab"} className="mt-12">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-violet-300">{journey === "hiring" ? "Contractor / Client" : "Skilled Professional"}</p><h2 id="journey-heading" className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{journey === "hiring" ? "Hire a Professional in 6 Simple Steps" : "Find Work in 6 Simple Steps"}</h2></div><p className="max-w-md text-sm leading-6 text-slate-500">Every step connects to an existing ZYLOBRIDGE route or marketplace state.</p></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{steps.map((step, index) => <JourneyCard key={step.title} step={step} index={index} accent={journey === "hiring" ? "violet" : "cyan"} />)}</div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#0b111b] px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Project lifecycle" title="From Job Post to Successful Project" description="A clear, connected progression helps both parties understand what has happened, what requires attention, and what comes next." />
          <ol className="mt-12 grid gap-3 md:grid-cols-3 xl:grid-cols-9">
            {lifecycle.map((stage, index) => <li key={stage.label} className="relative flex gap-4 rounded-2xl border border-white/8 bg-[#101722] p-4 md:block xl:min-h-52">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300"><stage.icon className="h-5 w-5" aria-hidden="true" /></div>
              <div className="min-w-0 md:mt-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{stage.label}</p><p className="mt-2 text-xs leading-5 text-slate-500">{stage.body}</p></div>
              {index < lifecycle.length - 1 && <ArrowDown className="absolute -bottom-3 left-1/2 z-10 hidden h-5 w-5 -translate-x-1/2 text-slate-600 md:block xl:-right-3 xl:bottom-auto xl:left-auto xl:top-5 xl:-rotate-90 xl:translate-x-0" aria-hidden="true" />}
            </li>)}
          </ol>
        </div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Illustrative journey" title="From Search to Success" description="A fictional example that shows how the connected experience can work. It is not a real customer, rating, review, transaction, or marketplace result." />
          <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#111827] to-[#0b111b] p-5 sm:p-8">
            <div className="mb-6 inline-flex rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200">Illustrative example only</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[{ label: "Find", value: "Painter · Cape Town", icon: Search }, { label: "Apply", value: "Proposed R95,000", icon: FileCheck2 }, { label: "Hire", value: "Selection confirmed", icon: UserCheck }, { label: "Fund", value: "Eligible funding recorded", icon: LockKeyhole }, { label: "Work", value: "Project begins", icon: Hammer }, { label: "Complete", value: "Release and review", icon: Star }].map((item, index) => <div key={item.label} className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-4"><item.icon className="h-5 w-5 text-cyan-300" aria-hidden="true" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p><p className="mt-2 text-sm font-medium text-white">{item.value}</p>{index < 5 && <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-slate-600 lg:block" aria-hidden="true" />}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="escrow" className="border-y border-white/5 bg-[#0b111b] px-4 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div><SectionHeading align="left" eyebrow="Escrow & funding" title="Your Work. Your Money. Protected." description="For eligible engagements, ZYLOBRIDGE connects hiring decisions, verified provider payments, project status, authorized release, refunds, and disputes in one auditable flow." /><div className="mt-8 flex flex-wrap gap-3"><Link href="/payments"><Button className="bg-violet-600 hover:bg-violet-500">Open Escrow & Funding<ArrowRight className="ml-2 h-4 w-4" /></Button></Link><Link href="/terms"><Button variant="outline" className="border-white/15 bg-transparent text-slate-300">Review Platform Terms</Button></Link></div></div>
          <div className="rounded-[2rem] border border-white/10 bg-[#101722] p-5 sm:p-7">
            <ol className="space-y-3">{["Candidate selected and engagement confirmed", "Supported provider payment initialized", "Provider verification records the funded state", "Professional completes the agreed work", "Authorized completion or release action", "Payment lifecycle and review remain connected"].map((item, index) => <li key={item} className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.03] p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 font-mono text-xs text-violet-200">{index + 1}</span><span className="text-sm text-slate-300">{item}</span></li>)}</ol>
            <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-4"><CreditCard className="h-5 w-5 text-violet-300" /><p className="mt-3 text-sm font-semibold">Paystack</p><p className="mt-1 text-xs leading-5 text-slate-500">Supported NGN payment methods shown by the configured provider flow.</p></div><div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.06] p-4"><Banknote className="h-5 w-5 text-cyan-300" /><p className="mt-3 text-sm font-semibold">Ozow EFT</p><p className="mt-1 text-xs leading-5 text-slate-500">Configured ZAR EFT funding where available. The payment screen remains authoritative.</p></div></div>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl rounded-2xl border border-amber-300/25 bg-amber-400/[0.07] p-5 sm:p-6"><div className="flex items-start gap-4"><AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" aria-hidden="true" /><div><h3 className="text-lg font-semibold text-amber-100">Stay Protected</h3><p className="mt-2 text-sm leading-6 text-amber-50/70">Never pay a professional outside ZYLOBRIDGE when the project is intended to use ZYLOBRIDGE funding. Off-platform transactions may not be covered by the platform’s payment records or dispute process.</p></div></div></div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Connected workspace" title="Everything Stays in One Place." description="ZYLOBRIDGE is more than a job board. Hiring, communication, work status, and supported funding remain connected to the project context." />
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-[2rem] border border-white/10 bg-[#101722] p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-5"><div><span className="inline-flex rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.14em] text-amber-200">Illustrative workspace</span><h3 className="mt-3 text-xl font-semibold">Painter needed · Cape Town</h3></div><span className="rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">In progress</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/8 p-4"><p className="text-xs text-slate-500">Professional</p><p className="mt-2 flex items-center gap-2 text-sm font-medium"><BadgeCheck className="h-4 w-4 text-emerald-300" />Verified credential available</p></div><div className="rounded-xl border border-white/8 p-4"><p className="text-xs text-slate-500">Messages</p><p className="mt-2 text-sm font-medium">Conversation tied to the project</p></div><div className="rounded-xl border border-white/8 p-4"><p className="text-xs text-slate-500">Funding</p><p className="mt-2 text-sm font-medium">Eligible amount secured</p></div><div className="rounded-xl border border-white/8 p-4"><p className="text-xs text-slate-500">Reputation</p><p className="mt-2 text-sm font-medium">Review unlocked after eligible completion</p></div></div></div>
            <div className="rounded-[2rem] border border-white/10 bg-[#101722] p-5 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-slate-500">Illustrative conversation</p><h3 className="mt-2 text-xl font-semibold">Project communication</h3></div><MessageSquareText className="h-6 w-6 text-violet-300" /></div><div className="mt-6 space-y-3"><div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white/[0.06] p-4 text-sm text-slate-300"><span className="mb-1 block text-xs font-semibold text-violet-300">Contractor</span>Can you start Monday morning?</div><div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-violet-600/20 p-4 text-sm text-slate-200"><span className="mb-1 block text-xs font-semibold text-cyan-300">Professional</span>Yes. I’ll arrive at 8:00 AM.</div><div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white/[0.06] p-4 text-sm text-slate-300"><span className="mb-1 block text-xs font-semibold text-violet-300">Contractor</span>Perfect. I’ve added the site access instructions.</div></div><p className="mt-5 text-xs leading-5 text-slate-500">Illustrative content only. Keep real project communication connected to the job instead of relying on scattered third-party channels.</p><Link href="/messages" className="mt-5 inline-flex"><Button variant="outline" className="border-white/15 bg-transparent text-slate-300">Open Messages<ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#0b111b] px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Trust model" title="Trust Is Built Into Every Step." description="Signals are useful when their meaning is clear. ZYLOBRIDGE separates verified evidence, protected workflows, and accountable marketplace history." /><div className="mt-10 grid gap-4 md:grid-cols-3">{[{ icon: BadgeCheck, title: "Verified", body: "Professionals can submit eligible credentials for review. Approved items support a visible verification signal." }, { icon: ShieldCheck, title: "Protected", body: "Eligible project payments can use the platform’s supported, server-verified funding workflow." }, { icon: Star, title: "Accountable", body: "Eligible completed jobs can contribute real ratings and reviews to marketplace reputation." }].map((item) => <article key={item.title} className="rounded-2xl border border-white/10 bg-[#101722] p-6"><item.icon className="h-6 w-6 text-emerald-300" aria-hidden="true" /><h3 className="mt-5 text-xl font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{item.body}</p></article>)}</div></div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div><SectionHeading align="left" eyebrow="Verification" title="What Does “Verified” Mean?" description="Verification confirms that a submitted credential has passed the platform’s review workflow. It does not guarantee workmanship, safety, suitability, or project outcome." /><Link href="/verification" className="mt-7 inline-flex"><Button variant="outline" className="border-emerald-400/25 bg-emerald-500/[0.06] text-emerald-100">View Verification<ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div>
          <div><ol className="grid gap-3 sm:grid-cols-2">{[{ title: "Submit", body: "Upload an eligible credential." }, { title: "Review", body: "ZYLOBRIDGE reviews the submitted document." }, { title: "Verification", body: "Approved records support the Verified badge." }, { title: "Reputation", body: "The badge appears on relevant marketplace surfaces." }].map((step, index) => <li key={step.title} className="rounded-2xl border border-white/10 bg-[#101722] p-5"><span className="font-mono text-xs text-emerald-300">0{index + 1}</span><h3 className="mt-3 font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{step.body}</p></li>)}</ol><div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h3 className="text-sm font-semibold">Accepted documentation categories</h3><ul className="mt-4 grid gap-2 sm:grid-cols-2">{["Trade licence", "Professional certification", "Apprenticeship certificate", "Employer confirmation", "Vocational training certificate"].map((item) => <li key={item} className="flex items-center gap-2 text-sm text-slate-400"><Check className="h-4 w-4 text-emerald-300" />{item}</li>)}</ul><p className="mt-5 border-t border-white/8 pt-4 text-xs leading-5 text-slate-500">Documents must be clear, legible, and current where applicable. Verification confirms that submitted credentials have been reviewed; it does not guarantee project quality, safety, or outcome.</p></div></div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#0b111b] px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Marketplace value" title="Built for Both Sides of Skilled Work." description="Each side receives a focused workflow, while shared records keep decisions and delivery connected." /><div className="mt-10 grid gap-5 lg:grid-cols-2"><article className="rounded-[2rem] border border-violet-400/20 bg-violet-500/[0.05] p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Contractors & clients</p><h3 className="mt-3 text-2xl font-semibold">Built for people who need work done right.</h3><div className="mt-6 grid gap-3 sm:grid-cols-2">{["Find qualified talent", "Compare applicants", "Reduce payment risk", "Manage projects", "Build your network"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/10 p-3 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-violet-300" />{item}</div>)}</div><Link href="/talent" className="mt-7 inline-flex"><Button className="bg-violet-600 hover:bg-violet-500">Find Professionals</Button></Link></article><article className="rounded-[2rem] border border-cyan-400/20 bg-cyan-500/[0.05] p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Skilled professionals</p><h3 className="mt-3 text-2xl font-semibold">Built for skills that deserve opportunity.</h3><div className="mt-6 grid gap-3 sm:grid-cols-2">{["Find relevant work", "Build real reputation", "Stand out with verification", "Communicate professionally", "Follow payment states"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/10 p-3 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-cyan-300" />{item}</div>)}</div><Link href="/jobs" className="mt-7 inline-flex"><Button variant="outline" className="border-cyan-400/25 bg-cyan-500/10 text-cyan-100">Browse Jobs</Button></Link></article></div></div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl"><SectionHeading eyebrow="A more connected process" title="Less Guesswork. More Accountability." description="Traditional referrals remain useful. ZYLOBRIDGE adds structured information and connected workflows when a project needs more visibility." /><div className="mt-10 grid overflow-hidden rounded-[2rem] border border-white/10 md:grid-cols-2"><div className="bg-white/[0.025] p-6 sm:p-8"><h3 className="text-lg font-semibold text-slate-300">Traditional hiring can involve</h3><ul className="mt-5 space-y-3">{["Informal recommendations", "Credentials shared separately", "Payments arranged outside the work record", "Messages spread across different apps", "Limited portable reputation history", "Manual project tracking"].map((item) => <li key={item} className="flex gap-3 text-sm text-slate-500"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600" />{item}</li>)}</ul></div><div className="border-t border-white/10 bg-violet-500/[0.06] p-6 sm:p-8 md:border-l md:border-t-0"><h3 className="text-lg font-semibold text-violet-100">ZYLOBRIDGE connects</h3><ul className="mt-5 space-y-3">{["Structured marketplace discovery", "Verification where available", "Supported funding workflows", "Built-in job-context messaging", "Real ratings and reviews", "A visible project lifecycle"].map((item) => <li key={item} className="flex gap-3 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{item}</li>)}</ul></div></div></div>
      </section>

      <section className="border-y border-white/5 bg-[#0b111b] px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Featured vocations" title="Skilled Work Across 12 Featured Vocations" description="These featured categories come from ZYLOBRIDGE’s broader live vocation taxonomy. Explore the marketplace for additional specialist roles." /><div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{featuredVocations.map((key) => <Link key={key} href={`/talent?vocation=${encodeURIComponent(key)}`} className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-[#101722] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04] text-xl" aria-hidden="true">{VOCATION_ICONS[key]}</span><span className="min-w-0"><span className="block text-sm font-semibold text-white">{VOCATION_LABELS[key]}</span><span className="mt-1 block truncate text-xs text-slate-500">{VOCATION_CATEGORY_BY_KEY[key]}</span></span><ArrowRight className="ml-auto h-4 w-4 text-slate-600 transition group-hover:text-violet-300" /></Link>)}</div><div className="mt-7 text-center"><Link href="/talent"><Button variant="outline" className="border-white/15 bg-transparent text-slate-300">Explore All Professionals</Button></Link></div></div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Security and resilience" title="Built With Security in Mind." description="ZYLOBRIDGE uses practical controls across authentication, API access, payment verification, and deployment. No online service can promise absolute security." /><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{ icon: LockKeyhole, title: "Encrypted transport", body: "Production traffic uses HTTPS/TLS through the deployed frontend and API domains." }, { icon: KeyRound, title: "Session protection", body: "Authenticated routes use secure server-issued sessions and role-aware authorization." }, { icon: ShieldCheck, title: "Validated APIs", body: "Protected procedures validate inputs, enforce ownership, and rate-limit API traffic." }, { icon: CreditCard, title: "Server-verified payments", body: "Provider references, amounts, currencies, and signatures are verified on the server." }].map((item) => <article key={item.title} className="rounded-2xl border border-white/10 bg-[#101722] p-5"><item.icon className="h-5 w-5 text-violet-300" /><h3 className="mt-4 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p></article>)}</div></div>
      </section>

      <section className="border-y border-white/5 bg-[#0b111b] px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Resolution paths" title="What Happens If Something Goes Wrong?" description="Clear scope, deliverables, dates, and expectations reduce avoidable disputes. When concerns remain, keep the relevant information connected to the project." /><div className="mt-10 grid gap-4 lg:grid-cols-3">{[{ title: "No issue", steps: ["Work completed", "Contractor reviews", "Authorized payment release"] }, { title: "Work disagreement", steps: ["Issue raised", "Project information and evidence reviewed", "Resolution process continues"] }, { title: "Formal dispute", steps: ["A party opens a dispute", "Available records are reviewed", "Outcome follows platform policy"] }].map((scenario) => <article key={scenario.title} className="rounded-2xl border border-white/10 bg-[#101722] p-6"><h3 className="text-lg font-semibold">{scenario.title}</h3><ol className="mt-5 space-y-3">{scenario.steps.map((step, index) => <li key={step} className="flex items-center gap-3 text-sm text-slate-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 font-mono text-[11px] text-slate-500">{index + 1}</span>{step}</li>)}</ol></article>)}</div><p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-5 text-slate-500">Resolution depends on the available evidence, the project record, payment state, and applicable platform terms. This page does not make a legal or outcome guarantee.</p></div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl"><SectionHeading eyebrow="Frequently asked questions" title="Answers for Your Next Step" description="Explore practical guidance about joining, hiring, verification, payments, safety, and professional growth." /><div className="mt-10 space-y-8">{faqGroups.map((group) => <section key={group.category} aria-labelledby={`faq-${group.category.replace(/\s+/g, "-").toLowerCase()}`}><h3 id={`faq-${group.category.replace(/\s+/g, "-").toLowerCase()}`} className="mb-3 text-sm font-semibold uppercase tracking-[.16em] text-violet-300">{group.category}</h3><Accordion type="single" collapsible className="rounded-2xl border border-white/10 bg-[#101722] px-5">{group.items.map((item) => <AccordionItem key={item.question} value={item.question} className="border-white/8"><AccordionTrigger className="py-5 text-left text-sm text-slate-200 hover:no-underline sm:text-base">{item.question}</AccordionTrigger><AccordionContent className="pr-8 text-sm leading-7 text-slate-400">{item.answer}</AccordionContent></AccordionItem>)}</Accordion></section>)}</div></div>
      </section>

      <section className="px-4 pb-24 pt-6 sm:pb-28">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-950/70 via-[#111827] to-cyan-950/50 p-7 sm:p-10 lg:p-14"><div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Ready when you are</p><h2 className="mt-4 max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-5xl">Your Next Project Starts Here.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Choose the side of the marketplace that matches your goal, or continue to your workspace if you are already signed in.</p></div><Link href={isAuthenticated ? dashboardHref : "/sign-in"}><Button size="lg" className="w-full bg-white text-slate-950 hover:bg-slate-100 lg:w-auto">{isAuthenticated ? "Open Your Workspace" : "Create Free Account"}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div><div className="mt-8 grid gap-3 sm:grid-cols-2"><Link href="/talent" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-violet-300/30"><p className="text-xs uppercase tracking-[.16em] text-slate-500">Need someone to get the job done?</p><p className="mt-2 flex items-center justify-between text-lg font-semibold">Find Skilled Professionals<ArrowRight className="h-5 w-5 text-violet-300" /></p></Link><Link href="/jobs" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-300/30"><p className="text-xs uppercase tracking-[.16em] text-slate-500">Looking for your next opportunity?</p><p className="mt-2 flex items-center justify-between text-lg font-semibold">Find Jobs<ArrowRight className="h-5 w-5 text-cyan-300" /></p></Link></div></div>
      </section>
    </main>
    <Footer />
  </div>;
}
