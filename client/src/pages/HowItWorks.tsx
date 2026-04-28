import { useState } from "react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  UserPlus,
  Briefcase,
  Search,
  FileText,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Star,
  CreditCard,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Users,
  Zap,
  Lock,
  Globe,
  HardHat,
  Wrench,
  BarChart3,
  BadgeCheck,
  Banknote,
  AlertCircle,
  Clock,
  Award,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Step {
  icon: React.ElementType;
  title: string;
  description: string;
  detail: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const contractorSteps: Step[] = [
  {
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up and select the Contractor / Client role during onboarding.",
    detail:
      "Click Sign In, authenticate via Manus OAuth, and on the onboarding screen choose 'I want to hire a professional'. Your account is immediately active with access to the contractor dashboard.",
  },
  {
    icon: FileText,
    title: "Post a Job",
    description: "Describe your project with vocation, budget, location, and deadline.",
    detail:
      "From your contractor dashboard click 'Post New Job'. Fill in the job title, select the vocation category (e.g. Electrician, Plumber), enter the location, set a budget range, and choose whether the job is urgent. All inputs are validated before submission.",
  },
  {
    icon: Search,
    title: "Review Applications",
    description: "Receive bids from verified professionals and review their profiles.",
    detail:
      "Once your job is live on the marketplace, skilled professionals will submit applications with a cover letter and proposed rate. You can view each applicant's profile, vocation, ratings, and whether they carry a ZYLOBRIDGE Verified badge before making a decision.",
  },
  {
    icon: CheckCircle2,
    title: "Accept & Fund Escrow",
    description: "Accept the best bid and secure payment in escrow before work begins.",
    detail:
      "When you accept an application the job moves to 'In Progress'. You are then prompted to fund the escrow — choose between Paystack card payment or bank transfer. Funds are held securely until you confirm the work is complete, protecting both parties.",
  },
  {
    icon: MessageSquare,
    title: "Communicate in Real Time",
    description: "Use the built-in messaging system to coordinate directly with your professional.",
    detail:
      "Every accepted application opens a private conversation thread. Messages are delivered in real time via Socket.io. You will see an unread-message badge in the navigation bar whenever a new message arrives.",
  },
  {
    icon: Star,
    title: "Complete & Review",
    description: "Mark the job complete to release escrow funds and leave a rating.",
    detail:
      "Once you are satisfied with the work, click 'Mark Complete' on the job. This releases the escrowed funds to the professional and unlocks the review form. Your rating and feedback contribute to the professional's public reputation on the platform.",
  },
];

const professionalSteps: Step[] = [
  {
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up and select the Skilled Professional role during onboarding.",
    detail:
      "Click Sign In, authenticate via Manus OAuth, and on the onboarding screen choose 'I am a skilled professional'. You will be taken to your professional dashboard where you can complete your profile.",
  },
  {
    icon: HardHat,
    title: "Build Your Profile",
    description: "Add your vocation, bio, skills, certifications, and portfolio.",
    detail:
      "A complete profile dramatically increases your chances of winning jobs. Include your primary vocation from the 12 supported categories, a professional bio, a list of skills, any certifications you hold, and a link to your portfolio. Contractors review your profile before accepting your bid.",
  },
  {
    icon: BadgeCheck,
    title: "Get Verified",
    description: "Upload a licence or certification document to earn the Verified badge.",
    detail:
      "Navigate to 'Get Verified' in the navigation menu. Upload a clear image or PDF of your trade licence, professional certificate, or government-issued credential. The ZYLOBRIDGE admin team reviews submissions within 24–48 hours. On approval, a blue shield-check badge appears on your profile, all your applications, and your job cards — signalling trust to contractors.",
  },
  {
    icon: Search,
    title: "Browse the Marketplace",
    description: "Filter open jobs by vocation, location, budget, and urgency.",
    detail:
      "The public marketplace lists every open job on the platform. Use the filter panel to narrow results by your vocation, city or region, budget range, and whether the job is marked urgent. You can browse without being signed in, but you must be logged in to apply.",
  },
  {
    icon: FileText,
    title: "Submit an Application",
    description: "Write a compelling cover letter and propose your rate.",
    detail:
      "Click 'Apply' on any open job. Write a cover letter explaining your experience and approach, and enter your proposed rate. Your ZYLOBRIDGE Verified badge (if earned) is automatically displayed alongside your application, giving you a competitive edge.",
  },
  {
    icon: CreditCard,
    title: "Get Paid via Escrow",
    description: "Funds are held securely and released to you when the job is marked complete.",
    detail:
      "Once a contractor accepts your application and funds the escrow, you can begin work with confidence knowing payment is secured. When the contractor marks the job complete, the escrowed amount is released to your account. If a dispute arises, contact ZYLOBRIDGE support for mediation.",
  },
];

const adminCapabilities = [
  {
    icon: Users,
    title: "User Management",
    description:
      "View all registered users, filter by role or vocation, promote users to admin, suspend accounts, and review account activity.",
  },
  {
    icon: Briefcase,
    title: "Job Oversight",
    description:
      "Monitor all posted jobs across every status — open, in-progress, completed, and cancelled. Remove jobs that violate platform policy.",
  },
  {
    icon: Banknote,
    title: "Escrow Management",
    description:
      "View all escrow transactions, manually confirm bank transfers, process refunds for cancelled jobs, and audit payment history.",
  },
  {
    icon: BadgeCheck,
    title: "Verification Review",
    description:
      "Review pending verification requests, inspect uploaded documents, approve or reject with an admin note, and revoke badges if necessary.",
  },
  {
    icon: BarChart3,
    title: "Platform Analytics",
    description:
      "Access real-time statistics including total users, active jobs, application volumes, and platform health metrics from the admin dashboard.",
  },
  {
    icon: Lock,
    title: "Role Control",
    description:
      "Promote or demote any user's role. The admin dashboard is completely hidden from contractor and professional accounts at both the route and API level.",
  },
];

const escrowFlow = [
  {
    step: "01",
    title: "Contractor Accepts Application",
    body: "The contractor reviews all bids and accepts the most suitable professional. The job status changes from Open to In Progress.",
  },
  {
    step: "02",
    title: "Escrow Funding",
    body: "The contractor is prompted to fund the agreed amount. They choose Paystack (card/bank) for instant processing, or manual bank transfer with proof of payment upload.",
  },
  {
    step: "03",
    title: "Funds Held Securely",
    body: "ZYLOBRIDGE holds the funds in escrow. Neither party can access them until the job is resolved. The professional can now begin work with full confidence.",
  },
  {
    step: "04",
    title: "Work Completion",
    body: "The professional completes the job and notifies the contractor via the messaging system. The contractor inspects the work.",
  },
  {
    step: "05",
    title: "Escrow Released",
    body: "The contractor clicks 'Mark Complete'. Funds are immediately released to the professional. Both parties can then leave a rating and review.",
  },
  {
    step: "06",
    title: "Dispute Resolution",
    body: "If either party raises a dispute, the ZYLOBRIDGE admin team mediates. The admin can release funds to the professional or issue a full refund to the contractor based on the evidence provided.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "Is ZYLOBRIDGE free to use?",
    answer:
      "Browsing the marketplace and creating an account are completely free. There are no subscription fees for contractors or professionals. ZYLOBRIDGE operates on a transaction-based model — a small platform fee is applied only when an escrow payment is successfully completed.",
  },
  {
    question: "How does the Verified badge work?",
    answer:
      "Professionals can apply for verification by uploading a trade licence, professional certificate, or government-issued credential from the 'Get Verified' page. The ZYLOBRIDGE admin team reviews each submission within 24–48 hours. Approved professionals receive a blue shield-check badge on their profile, applications, and marketplace listings. The badge can be revoked if a document is found to be fraudulent.",
  },
  {
    question: "What payment methods are supported for escrow?",
    answer:
      "ZYLOBRIDGE supports two escrow funding methods: Paystack (which accepts debit cards, credit cards, and bank transfers via their secure gateway) and direct bank transfer where you upload proof of payment for admin confirmation. All amounts are held in escrow until the job is marked complete.",
  },
  {
    question: "What happens if I am not satisfied with the work?",
    answer:
      "Do not mark the job complete if you are unsatisfied. Use the messaging system to communicate your concerns to the professional. If the issue cannot be resolved directly, contact ZYLOBRIDGE support to open a dispute. An admin will review the evidence from both parties and decide whether to release the escrow to the professional or issue a refund to the contractor.",
  },
  {
    question: "Can a professional apply for multiple jobs at once?",
    answer:
      "Yes. Professionals can apply for as many open jobs as they choose. There is no limit on simultaneous applications. However, once an application is accepted and escrow is funded, the professional is expected to prioritise that job and communicate any scheduling conflicts via the messaging system.",
  },
  {
    question: "How do I change my role from contractor to professional (or vice versa)?",
    answer:
      "Role selection happens during onboarding. If you selected the wrong role, contact ZYLOBRIDGE support and an admin can update your account. Note that your dashboard, job history, and applications are role-specific, so a role change will switch your dashboard view accordingly.",
  },
  {
    question: "Is my personal and payment information secure?",
    answer:
      "Yes. ZYLOBRIDGE uses HTTPS with TLS encryption on all connections, HTTP security headers via Helmet, rate limiting on every API route, and full input sanitisation via Zod validation. Payment processing is handled entirely by Paystack's PCI-DSS-compliant infrastructure — ZYLOBRIDGE never stores card numbers or banking credentials.",
  },
  {
    question: "How do I contact support?",
    answer:
      "For account issues, disputes, or general enquiries, use the messaging system to contact the ZYLOBRIDGE admin team, or reach out via the contact details in the footer. Dispute-related requests are prioritised and typically responded to within one business day.",
  },
];

const vocations = [
  { icon: "⚡", name: "Electrician" },
  { icon: "🪵", name: "Carpenter" },
  { icon: "🔧", name: "Plumber" },
  { icon: "🧱", name: "Mason / Bricklayer" },
  { icon: "🎨", name: "Painter" },
  { icon: "🏠", name: "Flooring Installer / Tiler" },
  { icon: "🏗️", name: "Heavy Equipment Operator" },
  { icon: "🛣️", name: "Road Construction Worker" },
  { icon: "❄️", name: "HVAC Technician" },
  { icon: "🛗", name: "Elevator Installer / Repairer" },
  { icon: "🐛", name: "Pest Control Technician" },
  { icon: "🪟", name: "Glazier (Glass Installer)" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────
function StepCard({ step, index }: { step: Step; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = step.icon;
  return (
    <div className="relative flex gap-5">
      {/* Connector line */}
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/40 shrink-0 z-10">
          <Icon className="h-5 w-5 text-violet-400" />
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-violet-500/30 to-transparent mt-2" />
      </div>
      {/* Content */}
      <div className="pb-8 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-violet-500 mb-1 block">STEP {String(index + 1).padStart(2, "0")}</span>
            <h3 className="text-base font-semibold text-white">{step.title}</h3>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">{step.description}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 mt-1 text-gray-500 hover:text-violet-400 transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        {expanded && (
          <div className="mt-3 p-4 rounded-lg bg-white/4 border border-white/8 text-sm text-gray-300 leading-relaxed">
            {step.detail}
          </div>
        )}
      </div>
    </div>
  );
}

function FaqItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-white/3 transition-colors"
      >
        <span className="text-sm font-medium text-white">{item.question}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-violet-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/6">
          <p className="pt-4">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HowItWorks() {
  const [activeTab, setActiveTab] = useState<"contractor" | "professional">("contractor");

  return (
    <div className="min-h-screen bg-[#080d14] text-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-16 px-4">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-violet-400 uppercase bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-6">
            <Globe className="h-3.5 w-3.5" />
            Platform Guide
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            How <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">ZYLOBRIDGE</span> Works
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            ZYLOBRIDGE is a two-sided marketplace connecting contractors and clients with verified skilled trade professionals across 12 specialised vocations. This guide walks through every step of the platform — from account creation to payment release.
          </p>
        </div>
      </section>

      {/* ── Platform Overview ────────────────────────────────────────────────── */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: Briefcase,
                color: "violet",
                title: "Contractors & Clients",
                body: "Post jobs, review bids from verified professionals, fund escrow, and manage the full project lifecycle from a dedicated dashboard.",
              },
              {
                icon: HardHat,
                color: "cyan",
                title: "Skilled Professionals",
                body: "Browse open jobs, apply with a cover letter and rate, earn a Verified badge, and get paid securely through the escrow system.",
              },
              {
                icon: ShieldCheck,
                color: "emerald",
                title: "Platform Admins",
                body: "Manage all users, jobs, payments, and verification requests from a fully secured admin dashboard invisible to all other roles.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`rounded-2xl border p-6 bg-gradient-to-br ${
                  card.color === "violet"
                    ? "from-violet-900/20 to-transparent border-violet-500/20"
                    : card.color === "cyan"
                    ? "from-cyan-900/20 to-transparent border-cyan-500/20"
                    : "from-emerald-900/20 to-transparent border-emerald-500/20"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    card.color === "violet"
                      ? "bg-violet-600/20"
                      : card.color === "cyan"
                      ? "bg-cyan-600/20"
                      : "bg-emerald-600/20"
                  }`}
                >
                  <card.icon
                    className={`h-5 w-5 ${
                      card.color === "violet"
                        ? "text-violet-400"
                        : card.color === "cyan"
                        ? "text-cyan-400"
                        : "text-emerald-400"
                    }`}
                  />
                </div>
                <h3 className="font-bold text-white mb-2">{card.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Step-by-Step Guides ──────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Step-by-Step Walkthrough
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Select your role below to see the exact steps involved in using ZYLOBRIDGE. Click any step to expand the full detail.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex justify-center mb-10">
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
              <button
                onClick={() => setActiveTab("contractor")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "contractor"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Contractor / Client
              </button>
              <button
                onClick={() => setActiveTab("professional")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "professional"
                    ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/40"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <HardHat className="h-4 w-4" />
                Skilled Professional
              </button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            {activeTab === "contractor"
              ? contractorSteps.map((step, i) => <StepCard key={i} step={step} index={i} />)
              : professionalSteps.map((step, i) => <StepCard key={i} step={step} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── Escrow Payment Flow ──────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-violet-400 uppercase bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-4">
              <Lock className="h-3.5 w-3.5" />
              Secure Payments
            </span>
            <h2 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              How Escrow Payments Work
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              ZYLOBRIDGE uses a secure escrow system to protect both contractors and professionals. Funds are never released until both parties are satisfied.
            </p>
          </div>

          {/* Payment methods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto">
            <div className="rounded-xl border border-violet-500/20 bg-violet-900/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="h-5 w-5 text-violet-400" />
                <h3 className="font-semibold text-white text-sm">Paystack Payment</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Pay instantly with a debit card, credit card, or via Paystack's bank transfer gateway. Funds are confirmed automatically and escrow is activated within seconds.
              </p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-900/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Banknote className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold text-white text-sm">Bank Transfer</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Transfer directly to the ZYLOBRIDGE escrow account using your bank's mobile app or internet banking. Upload your proof of payment and an admin confirms the transfer within one business day.
              </p>
            </div>
          </div>

          {/* Flow steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {escrowFlow.map((item) => (
              <div key={item.step} className="rounded-xl border border-white/8 bg-[#0f1520] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl font-black text-violet-600/40 font-mono">{item.step}</span>
                  <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          {/* Trust note */}
          <div className="mt-8 flex items-start gap-3 max-w-2xl mx-auto p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="text-amber-400 font-semibold">Important: </span>
              Never pay a professional outside of the ZYLOBRIDGE escrow system. Off-platform payments are not covered by our dispute resolution process and ZYLOBRIDGE cannot intervene in transactions made outside the platform.
            </p>
          </div>
        </div>
      </section>

      {/* ── Verification System ──────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-5">
                <BadgeCheck className="h-3.5 w-3.5" />
                Trust & Verification
              </span>
              <h2 className="text-3xl font-extrabold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                The ZYLOBRIDGE Verified Badge
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                The Verified badge is ZYLOBRIDGE's trust signal for skilled professionals. It tells contractors that a professional's credentials have been reviewed and confirmed by the ZYLOBRIDGE admin team — not just self-reported.
              </p>
              <div className="space-y-4">
                {[
                  {
                    icon: Clock,
                    title: "24–48 Hour Review",
                    body: "Submit your document and the admin team reviews it within one to two business days.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Displayed Everywhere",
                    body: "The badge appears on your profile, every application you submit, and your cards in the marketplace.",
                  },
                  {
                    icon: Award,
                    title: "Competitive Advantage",
                    body: "Verified professionals consistently receive more views and higher acceptance rates from contractors.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/15 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0f1520] p-8">
              <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Accepted Verification Documents
              </h3>
              <div className="space-y-3">
                {[
                  "Trade licence issued by a recognised regulatory body",
                  "Professional certification (e.g. COREN, NIOB, NAFDAC, NEC)",
                  "Government-issued apprenticeship completion certificate",
                  "Employer letter confirming professional status and years of experience",
                  "Vocational training certificate from an accredited institution",
                ].map((doc, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400 leading-relaxed">{doc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-lg bg-white/3 border border-white/6">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Documents must be clear, legible, and not expired. Blurry or cropped images may be rejected. All documents are stored securely and are never shared publicly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Supported Vocations ──────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent via-[#0d1117] to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Supported Vocations
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              ZYLOBRIDGE currently supports 12 specialised trade vocations. Every job post and professional profile is categorised under one of these disciplines.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {vocations.map((v) => (
              <div
                key={v.name}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#0f1520] px-4 py-3 hover:border-violet-500/30 hover:bg-[#1c2740] transition-all"
              >
                <span className="text-xl">{v.icon}</span>
                <span className="text-sm text-gray-300 font-medium leading-tight">{v.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Admin Capabilities ───────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-red-400 uppercase bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-4">
              <Lock className="h-3.5 w-3.5" />
              Admin Only
            </span>
            <h2 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Platform Administration
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              The admin dashboard is completely invisible to contractors and professionals — it is accessible only to accounts with the admin role, protected at both the route and API level.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminCapabilities.map((cap) => (
              <div key={cap.title} className="rounded-xl border border-white/8 bg-[#0f1520] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-600/15 flex items-center justify-center shrink-0">
                    <cap.icon className="h-4 w-4 text-red-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{cap.title}</h3>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{cap.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security & Trust ─────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent via-violet-950/8 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Security & Compliance
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              ZYLOBRIDGE is built to Silicon Valley security standards. Every layer of the platform is hardened against common attack vectors.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Lock,
                title: "HTTPS + TLS",
                body: "All traffic is encrypted in transit. HTTP security headers are enforced via Helmet on every response.",
              },
              {
                icon: Zap,
                title: "Rate Limiting",
                body: "Every API route is rate-limited to prevent abuse, brute-force attacks, and denial-of-service attempts.",
              },
              {
                icon: CheckCircle2,
                title: "Input Sanitisation",
                body: "All user inputs are validated and sanitised using Zod schemas before reaching the database.",
              },
              {
                icon: ShieldCheck,
                title: "API Keys Server-Side Only",
                body: "No secret keys are ever exposed to the browser. All third-party integrations run exclusively on the server.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/8 bg-[#0f1520] p-5 text-center">
                <div className="w-10 h-10 rounded-xl bg-violet-600/15 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Frequently Asked Questions
            </h2>
            <p className="text-gray-400 text-sm">
              Everything you need to know about using ZYLOBRIDGE. Click any question to expand the answer.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} item={faq} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/20 via-[#0f1520] to-cyan-900/10 p-10">
            <h2 className="text-3xl font-extrabold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Ready to Get Started?
            </h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Join thousands of contractors and skilled professionals already using ZYLOBRIDGE to connect, collaborate, and get paid securely.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={getLoginUrl()}>
                <Button size="lg" className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 w-full sm:w-auto">
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Link href="/marketplace">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/15 text-gray-300 hover:text-white hover:border-white/30 bg-transparent w-full sm:w-auto"
                >
                  Browse Jobs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
