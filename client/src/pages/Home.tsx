import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Star, Users, Briefcase, Shield, Zap, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState } from "react";
import { VOCATION_LABELS, VOCATION_ICONS, VOCATION_KEYS, type VocationKey } from "@shared/vocations";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";


const LOGO_URL = "/ZYLO.png";

const TESTIMONIALS = [
  {
    id: 1,
    source: "trustpilot",
    rating: 5,
    name: "Marcus O.",
    role: "General Contractor",
    location: "Lagos, Nigeria",
    avatar: "MO",
    avatarColor: "bg-violet-600",
    date: "March 2025",
    title: "Found a certified electrician within 24 hours",
    body: "I posted a job on ZYLOBRIDGE at 9pm and had three qualified bids by morning. The escrow system gave me total peace of mind — funds only released when the work was done and signed off. Absolutely seamless.",
  },
  {
    id: 2,
    source: "google",
    rating: 5,
    name: "Adaeze N.",
    role: "Skilled Plumber",
    location: "Abuja, Nigeria",
    avatar: "AN",
    avatarColor: "bg-cyan-600",
    date: "February 2025",
    title: "My income doubled in two months",
    body: "Before ZYLOBRIDGE I was relying on word-of-mouth. Now I have a steady stream of verified clients. The Verified badge made a huge difference — contractors trust me before we even speak.",
  },
  {
    id: 3,
    source: "trustpilot",
    rating: 5,
    name: "Emeka T.",
    role: "Property Developer",
    location: "Port Harcourt, Nigeria",
    avatar: "ET",
    avatarColor: "bg-emerald-600",
    date: "April 2025",
    title: "Best platform for sourcing trade professionals",
    body: "We used ZYLOBRIDGE to staff an entire housing project — masons, painters, tilers, HVAC technicians. The vocation filters saved us hours. Every professional we hired had verifiable credentials.",
  },
  {
    id: 4,
    source: "google",
    rating: 5,
    name: "Fatima B.",
    role: "HVAC Technician",
    location: "Kano, Nigeria",
    avatar: "FB",
    avatarColor: "bg-amber-600",
    date: "January 2025",
    title: "Professional, fast, and fair",
    body: "The bidding system is transparent and fair. I can see exactly what the contractor needs, set my rate, and the messaging feature means everything is documented. No more disputes over scope.",
  },
  {
    id: 5,
    source: "trustpilot",
    rating: 5,
    name: "Chidi A.",
    role: "Facilities Manager",
    location: "Enugu, Nigeria",
    avatar: "CA",
    avatarColor: "bg-rose-600",
    date: "March 2025",
    title: "Escrow payments are a game changer",
    body: "I have been burned before by professionals who disappeared after receiving payment. ZYLOBRIDGE's escrow system completely eliminates that risk. I will never hire a tradesperson any other way.",
  },
  {
    id: 6,
    source: "google",
    rating: 5,
    name: "Ngozi E.",
    role: "Carpenter",
    location: "Ibadan, Nigeria",
    avatar: "NE",
    avatarColor: "bg-teal-600",
    date: "April 2025",
    title: "More jobs, better clients, zero hassle",
    body: "ZYLOBRIDGE connected me with clients I would never have reached on my own. The profile system lets my work speak for itself, and the real-time messaging means I always know exactly what is expected.",
  },
  {
    id: 7,
    source: "trustpilot",
    rating: 5,
    name: "Babatunde F.",
    role: "Construction Company Owner",
    location: "Lagos, Nigeria",
    avatar: "BF",
    avatarColor: "bg-indigo-600",
    date: "February 2025",
    title: "Replaced our entire hiring process",
    body: "We used to spend weeks sourcing and vetting subcontractors. ZYLOBRIDGE cut that to days. The verification badges mean we skip the credential checks entirely. Our project delivery times have improved significantly.",
  },
  {
    id: 8,
    source: "google",
    rating: 5,
    name: "Ifeoma C.",
    role: "Glazier",
    location: "Benin City, Nigeria",
    avatar: "IC",
    avatarColor: "bg-pink-600",
    date: "March 2025",
    title: "Finally a platform that respects skilled trades",
    body: "ZYLOBRIDGE treats glaziers and specialist tradespeople as professionals, not afterthoughts. The vocation categories are specific and accurate, and contractors actually understand what they are hiring for.",
  },
  {
    id: 9,
    source: "trustpilot",
    rating: 5,
    name: "Oluwaseun M.",
    role: "Road Construction Supervisor",
    location: "Abuja, Nigeria",
    avatar: "OM",
    avatarColor: "bg-orange-600",
    date: "January 2025",
    title: "Reliable professionals, every single time",
    body: "I have hired heavy equipment operators and road construction workers through ZYLOBRIDGE on three separate projects. Every single one showed up, did the work, and delivered on time. The review system keeps standards high.",
  },
];

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


// ── Trustpilot / Google star rating icons ──────────────────────────────────
function TrustpilotLogo() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00b67a]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#00b67a" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
      </svg>
      Trustpilot
    </span>
  );
}

function GoogleLogo() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-300">
      <svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Google
    </span>
  );
}

function StarRating({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

function TestimonialsSection() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", slidesToScroll: 1 },
    [Autoplay({ delay: 4000, stopOnInteraction: false })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  return (
    <section className="py-20 bg-[#0d1117] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            Trusted by Thousands
          </span>
          <h2
            className="text-3xl sm:text-4xl font-extrabold text-white mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            What Our Community Says
          </h2>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Real reviews from contractors and skilled professionals who have built their businesses on ZYLOBRIDGE.
          </p>
          {/* Aggregate badges */}
          <div className="flex items-center justify-center gap-6 mt-5">
            <div className="flex items-center gap-2">
              <TrustpilotLogo />
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#00b67a" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                  </svg>
                ))}
              </div>
              <span className="text-xs text-gray-400">4.9 · Excellent</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2">
              <GoogleLogo />
              <StarRating />
              <span className="text-xs text-gray-400">4.8 · 1,200+ reviews</span>
            </div>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-5">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.id}
                  className="flex-none w-[90%] sm:w-[48%] lg:w-[31%] rounded-2xl border border-white/8 bg-[#131a26] p-6 flex flex-col gap-4"
                >
                  {/* Source badge */}
                  <div className="flex items-center justify-between">
                    {t.source === "trustpilot" ? <TrustpilotLogo /> : <GoogleLogo />}
                    <StarRating count={t.rating} />
                  </div>

                  {/* Quote icon + title */}
                  <div>
                    <Quote className="h-5 w-5 text-violet-500/40 mb-2" />
                    <h3 className="font-bold text-white text-sm leading-snug mb-2">
                      {t.title}
                    </h3>
                    <p className="text-gray-400 text-xs leading-relaxed line-clamp-4">
                      {t.body}
                    </p>
                  </div>

                  {/* Reviewer */}
                  <div className="flex items-center gap-3 mt-auto pt-3 border-t border-white/6">
                    <div className={`w-9 h-9 rounded-full ${t.avatarColor} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-white text-xs font-semibold">{t.name}</p>
                      <p className="text-gray-500 text-[11px]">{t.role} · {t.location}</p>
                    </div>
                    <span className="ml-auto text-[10px] text-gray-600">{t.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={scrollPrev}
              className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-violet-600/20 hover:border-violet-500/40 flex items-center justify-center transition-colors"
              aria-label="Previous review"
            >
              <ChevronLeft className="h-4 w-4 text-gray-300" />
            </button>

            {/* Dot indicators */}
            <div className="flex gap-1.5">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === selectedIndex ? "w-6 bg-violet-500" : "w-1.5 bg-white/20"
                  }`}
                  aria-label={`Go to review ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={scrollNext}
              className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-violet-600/20 hover:border-violet-500/40 flex items-center justify-center transition-colors"
              aria-label="Next review"
            >
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

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
                  {user?.userType === "enterprise" && (
                    <Link href="/dashboard/enterprise">
                      <Button
                        size="lg"
                        className="font-bold px-8 h-12 text-base"
                        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                      >
                        Open Workspace <ArrowRight className="ml-2 h-4 w-4" />
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
                  <Link href="/sign-in">
                    <Button
                      size="lg"
                      className="font-bold px-8 h-12 text-base"
                      style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                    >
                      Post a Job <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
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

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <TestimonialsSection />

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
            <Link href="/sign-in">
              <Button
                size="lg"
                className="font-bold px-10 h-12"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
              >
                Join as Contractor <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                variant="outline"
                size="lg"
                className="font-bold px-10 h-12 border-white/15 text-gray-300 hover:text-white hover:border-violet-500/40 bg-transparent"
              >
                Join as Professional
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
