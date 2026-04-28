import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Star, Users, Briefcase, Shield, Zap } from "lucide-react";
import { VOCATION_LABELS, VOCATION_ICONS, VOCATION_KEYS, type VocationKey } from "@shared/vocations";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const LOGO_URL = "/manus-storage/ZYLO_7d32e9f2.png";

const STATS = [
  { label: "Active Professionals", value: "2,400+", icon: Users },
  { label: "Jobs Posted", value: "8,900+", icon: Briefcase },
  { label: "Avg. Rating", value: "4.8★", icon: Star },
  { label: "Verified Contractors", value: "1,200+", icon: Shield },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Post Your Job",
    description: "Describe your project, set your budget, choose a vocation, and publish it to the marketplace in minutes.",
    forRole: "Contractors",
  },
  {
    step: "02",
    title: "Receive Bids",
    description: "Qualified professionals review your job and submit competitive bids with cover letters and pricing.",
    forRole: "Contractors",
  },
  {
    step: "03",
    title: "Hire & Track",
    description: "Accept the best bid, manage the project lifecycle, and leave a review when the work is done.",
    forRole: "Contractors",
  },
];

const TRUST_BADGES = [
  "SSL-encrypted platform",
  "Identity-verified professionals",
  "Escrow-ready payment system",
  "GDPR compliant",
  "Rate-limited API",
  "24/7 dispute resolution",
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative pt-20 pb-24">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Logo badge */}
            <div className="flex items-center gap-3 mb-8 px-4 py-2 rounded-full border border-violet-500/20 bg-violet-500/5">
              <img src={LOGO_URL} alt="ZYLOBRIDGE" className="h-7 w-7 object-contain" />
              <span className="text-sm font-semibold text-violet-300 tracking-wide">ZYLOBRIDGE MARKETPLACE</span>
            </div>

            {/* Headline */}
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Connect with{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Elite Trade
              </span>
              <br />
              Professionals
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
              ZYLOBRIDGE is the premier two-sided marketplace connecting contractors and clients with verified skilled trade professionals across 12 specialized vocations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              {isAuthenticated ? (
                <>
                  {user?.userType === "client" && (
                    <Link href="/dashboard/client">
                      <Button
                        size="lg"
                        className="font-bold px-8 h-12 text-base"
                        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                      >
                        Post a Job <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {user?.userType === "professional" && (
                    <Link href="/marketplace">
                      <Button
                        size="lg"
                        className="font-bold px-8 h-12 text-base"
                        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                      >
                        Find Work <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {user?.userType === "unset" && (
                    <Link href="/onboarding">
                      <Button
                        size="lg"
                        className="font-bold px-8 h-12 text-base"
                        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                      >
                        Complete Setup <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <a href={getLoginUrl()}>
                    <Button
                      size="lg"
                      className="font-bold px-8 h-12 text-base"
                      style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                    >
                      Post a Job <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                  <Link href="/marketplace">
                    <Button
                      variant="outline"
                      size="lg"
                      className="font-bold px-8 h-12 text-base border-white/15 text-gray-300 hover:text-white hover:border-violet-500/40 bg-transparent"
                    >
                      Browse Jobs
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Trust line */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
              {["No subscription fees", "Free to browse", "Verified professionals"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-[#131a26]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center text-center gap-2">
                <Icon className="h-5 w-5 text-violet-400" />
                <span className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {value}
                </span>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vocations Grid ────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Specializations</span>
            <h2
              className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              12 Featured Vocations
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Find or post work across the most in-demand skilled trade specializations in construction and infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {VOCATION_KEYS.map((key) => (
              <Link key={key} href={`/marketplace?vocation=${key}`}>
                <div className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-white/8 bg-[#131a26] hover:border-violet-500/30 hover:bg-[#1c2740] transition-all duration-200 cursor-pointer text-center">
                  <span className="text-3xl">{VOCATION_ICONS[key as VocationKey]}</span>
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors leading-tight">
                    {VOCATION_LABELS[key as VocationKey]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#131a26]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Process</span>
            <h2
              className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              How ZYLOBRIDGE Works
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* For Contractors */}
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 mb-6">
                <Briefcase className="h-3.5 w-3.5" />
                For Contractors & Clients
              </div>
              <div className="space-y-6">
                {HOW_IT_WORKS.map((step) => (
                  <div key={step.step} className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                      <span className="text-xs font-bold text-violet-400">{step.step}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Professionals */}
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1 mb-6">
                <Zap className="h-3.5 w-3.5" />
                For Skilled Professionals
              </div>
              <div className="space-y-6">
                {[
                  { step: "01", title: "Build Your Profile", description: "Create a professional profile showcasing your vocation, certifications, portfolio, and hourly rate." },
                  { step: "02", title: "Browse & Apply", description: "Filter jobs by vocation, location, and budget. Submit competitive bids with your cover letter." },
                  { step: "03", title: "Get Hired & Grow", description: "Complete projects, earn 5-star reviews, and build your reputation on the platform." },
                ].map((step) => (
                  <div key={step.step} className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                      <span className="text-xs font-bold text-cyan-400">{step.step}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust & Compliance ────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="rounded-2xl border border-violet-500/15 bg-gradient-to-br from-[#131a26] to-[#1c2740] p-8 sm:p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <h3
                  className="text-2xl font-extrabold text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Built for Trust & Compliance
                </h3>
                <p className="text-gray-400 text-sm max-w-md">
                  ZYLOBRIDGE is engineered with enterprise-grade security, transparent processes, and full regulatory compliance.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TRUST_BADGES.map((badge) => (
                  <div key={badge} className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 rounded-lg px-3 py-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#131a26]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
          <img src={LOGO_URL} alt="ZYLOBRIDGE" className="h-16 w-16 object-contain mx-auto mb-6" />
          <h2
            className="text-3xl sm:text-4xl font-extrabold text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Ready to get started?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Join thousands of contractors and professionals already building the future with ZYLOBRIDGE.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={getLoginUrl()}>
              <Button
                size="lg"
                className="font-bold px-10 h-12"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
              >
                Join as Contractor <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href={getLoginUrl()}>
              <Button
                variant="outline"
                size="lg"
                className="font-bold px-10 h-12 border-white/15 text-gray-300 hover:text-white hover:border-violet-500/40 bg-transparent"
              >
                Join as Professional
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
