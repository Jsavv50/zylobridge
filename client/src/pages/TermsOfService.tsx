import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  Search,
  ChevronRight,
  Shield,
  AlertTriangle,
  Info,
  CheckCircle,
  ArrowUp,
  Menu,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Section {
  id: string;
  number: string;
  title: string;
  content: React.ReactNode;
}

// ─── Callout Components ───────────────────────────────────────────────────────
function Callout({
  type,
  children,
}: {
  type: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: {
      bg: "bg-blue-500/8 border-blue-500/25",
      icon: <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
      text: "text-blue-200",
    },
    warning: {
      bg: "bg-amber-500/8 border-amber-500/25",
      icon: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
      text: "text-amber-200",
    },
    success: {
      bg: "bg-emerald-500/8 border-emerald-500/25",
      icon: <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />,
      text: "text-emerald-200",
    },
  };
  const s = styles[type];
  return (
    <div className={`flex gap-3 rounded-xl border p-4 my-5 ${s.bg}`} role="note">
      {s.icon}
      <div className={`text-sm leading-relaxed ${s.text}`}>{children}</div>
    </div>
  );
}

// ─── Highlight helper ─────────────────────────────────────────────────────────
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-violet-500/30 text-violet-200 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Section data ─────────────────────────────────────────────────────────────
function buildSections(q: string): Section[] {
  const H = ({ t }: { t: string }) => <HighlightText text={t} query={q} />;

  return [
    {
      id: "acceptance",
      number: "1",
      title: "Acceptance of Terms",
      content: (
        <>
          <Callout type="warning">
            By accessing or using ZYLOBRIDGE, you confirm that you have read,
            understood, and agree to be bound by these Terms of Service and all
            applicable laws and regulations.
          </Callout>
          <p className="text-gray-300 leading-relaxed">
            <H t="These Terms of Service ('Terms') constitute a legally binding agreement between you ('User,' 'you,' or 'your') and Zylobridge Global Company LTD ('ZYLOBRIDGE,' 'we,' 'us,' or 'our') governing your access to and use of the ZYLOBRIDGE platform, website, mobile applications, and related services (collectively, the 'Platform')." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="If you do not agree to these Terms, you must immediately discontinue use of the Platform. We reserve the right to update these Terms at any time. Continued use of the Platform following notification of changes constitutes acceptance of the revised Terms." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="You must be at least 18 years of age to use this Platform. By using ZYLOBRIDGE, you represent and warrant that you meet this age requirement and have the legal capacity to enter into this agreement." />
          </p>
        </>
      ),
    },
    {
      id: "platform-description",
      number: "2",
      title: "Platform Description and Services",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="ZYLOBRIDGE is a two-sided marketplace platform that connects clients and contractors ('Clients') with verified skilled trade professionals ('Professionals') across 12 specialized vocations including electricians, carpenters, plumbers, masons, painters, flooring specialists, heavy equipment operators, road construction workers, and other trade disciplines." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="The Platform provides the following core services:" />
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 mt-3 ml-2">
            <li><H t="Job posting and discovery for trade and construction projects" /></li>
            <li><H t="Professional profile creation, verification, and credentialing" /></li>
            <li><H t="Secure escrow-based payment processing for project transactions" /></li>
            <li><H t="Real-time messaging and communication between Clients and Professionals" /></li>
            <li><H t="A marketplace shop for tools, equipment, and trade supplies" /></li>
            <li><H t="Identity verification and background screening services" /></li>
            <li><H t="Rating and review systems for quality assurance" /></li>
          </ul>
          <Callout type="info">
            ZYLOBRIDGE acts as an intermediary platform only. We do not employ
            trade professionals and are not a party to any contract formed
            between Clients and Professionals through the Platform.
          </Callout>
        </>
      ),
    },
    {
      id: "user-accounts",
      number: "3",
      title: "User Accounts and Registration",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="To access certain features of the Platform, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must notify us immediately at Support@zylobridge.com of any unauthorized use of your account or any other breach of security." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="ZYLOBRIDGE reserves the right to suspend or terminate accounts that:" />
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 mt-3 ml-2">
            <li><H t="Provide false, misleading, or fraudulent information" /></li>
            <li><H t="Violate these Terms or any applicable laws" /></li>
            <li><H t="Engage in conduct harmful to other users or the Platform" /></li>
            <li><H t="Attempt to circumvent Platform fees or payment systems" /></li>
            <li><H t="Remain inactive for an extended period without activity" /></li>
          </ul>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="Each user may maintain only one active account. Creating multiple accounts to circumvent restrictions or bans is strictly prohibited." />
          </p>
        </>
      ),
    },
    {
      id: "professional-obligations",
      number: "4",
      title: "Professional Obligations and Standards",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="Trade Professionals registered on ZYLOBRIDGE agree to the following obligations:" />
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 mt-3 ml-2">
            <li><H t="Maintain all required licenses, certifications, and permits for their trade and jurisdiction" /></li>
            <li><H t="Carry adequate professional liability and workers' compensation insurance" /></li>
            <li><H t="Provide accurate and truthful information about qualifications, experience, and capabilities" /></li>
            <li><H t="Complete contracted work to professional standards and within agreed timelines" /></li>
            <li><H t="Comply with all applicable safety regulations and building codes" /></li>
            <li><H t="Respond to client communications in a timely and professional manner" /></li>
            <li><H t="Honor agreed-upon pricing and not demand additional payment outside the Platform" /></li>
          </ul>
          <Callout type="warning">
            Professionals who misrepresent their qualifications, fail to
            complete contracted work, or engage in fraudulent activity will be
            permanently banned from the Platform and may be subject to legal
            action.
          </Callout>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="ZYLOBRIDGE conducts identity verification for Professionals but does not independently verify all claimed credentials. Clients are encouraged to conduct their own due diligence before engaging any Professional." />
          </p>
        </>
      ),
    },
    {
      id: "client-obligations",
      number: "5",
      title: "Client Obligations and Responsibilities",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="Clients using the ZYLOBRIDGE Platform agree to:" />
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 mt-3 ml-2">
            <li><H t="Provide accurate and complete project descriptions, scope of work, and requirements" /></li>
            <li><H t="Fund escrow accounts promptly upon agreement with a Professional" /></li>
            <li><H t="Provide safe and accessible working conditions for Professionals" /></li>
            <li><H t="Communicate project changes or modifications promptly and in good faith" /></li>
            <li><H t="Release escrow payments upon satisfactory completion of agreed work" /></li>
            <li><H t="Provide honest and fair reviews based on actual project experience" /></li>
            <li><H t="Not solicit Professionals to work outside the Platform to avoid fees" /></li>
          </ul>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="Clients are responsible for obtaining all necessary permits and approvals required for their projects unless otherwise agreed in writing with the Professional." />
          </p>
        </>
      ),
    },
    {
      id: "payments-escrow",
      number: "6",
      title: "Payments, Escrow, and Fees",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="ZYLOBRIDGE uses a secure escrow payment system to protect both Clients and Professionals. All project payments must be processed through the Platform's escrow system." />
          </p>
          <Callout type="info">
            Payments processed outside the ZYLOBRIDGE Platform are not covered
            by our dispute resolution services or payment guarantees. We
            strongly recommend all transactions occur through the Platform.
          </Callout>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="The escrow process works as follows:" />
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 mt-3 ml-2">
            <li><H t="Client funds the escrow account upon accepting a Professional's proposal" /></li>
            <li><H t="Funds are held securely until project milestones are completed and approved" /></li>
            <li><H t="Professional requests payment release upon milestone completion" /></li>
            <li><H t="Client reviews and approves the release of funds" /></li>
            <li><H t="ZYLOBRIDGE deducts its service fee before disbursing funds to the Professional" /></li>
          </ul>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="ZYLOBRIDGE charges a service fee on all transactions processed through the Platform. Current fee structures are displayed on the Platform and may be updated with 30 days' notice. All fees are non-refundable except as required by applicable law." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="Payment processing is handled by Paystack and other third-party payment processors. By using the payment features, you agree to the terms and conditions of our payment processors." />
          </p>
        </>
      ),
    },
    {
      id: "dispute-resolution",
      number: "7",
      title: "Dispute Resolution",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="In the event of a dispute between a Client and a Professional, ZYLOBRIDGE provides a structured dispute resolution process:" />
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 mt-3 ml-2">
            <li><H t="Either party may initiate a dispute through the Platform within 14 days of the disputed event" /></li>
            <li><H t="Both parties will be given the opportunity to present evidence and documentation" /></li>
            <li><H t="ZYLOBRIDGE's dispute resolution team will review all submitted materials" /></li>
            <li><H t="A decision will be issued within 10 business days of receiving complete documentation" /></li>
            <li><H t="ZYLOBRIDGE's decision on escrow fund disbursement is final and binding" /></li>
          </ul>
          <Callout type="warning">
            ZYLOBRIDGE's dispute resolution process applies only to escrow
            transactions processed through the Platform. We cannot mediate
            disputes arising from off-platform arrangements.
          </Callout>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="For disputes that cannot be resolved through our internal process, both parties agree to submit to binding arbitration in accordance with the rules of the applicable arbitration body in the jurisdiction of Zylobridge Global Company LTD's registered office." />
          </p>
        </>
      ),
    },
    {
      id: "prohibited-conduct",
      number: "8",
      title: "Prohibited Conduct",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="Users of the ZYLOBRIDGE Platform are strictly prohibited from:" />
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 mt-3 ml-2">
            <li><H t="Posting false, misleading, or fraudulent job listings or professional profiles" /></li>
            <li><H t="Engaging in harassment, discrimination, or abusive behavior toward other users" /></li>
            <li><H t="Attempting to circumvent Platform fees by soliciting off-platform transactions" /></li>
            <li><H t="Using the Platform for any illegal purpose or in violation of applicable laws" /></li>
            <li><H t="Scraping, crawling, or automated data extraction from the Platform" /></li>
            <li><H t="Reverse engineering, decompiling, or attempting to access Platform source code" /></li>
            <li><H t="Creating fake reviews, ratings, or testimonials" /></li>
            <li><H t="Impersonating another person, company, or ZYLOBRIDGE staff" /></li>
            <li><H t="Uploading malicious code, viruses, or harmful content" /></li>
            <li><H t="Sharing account credentials with unauthorized third parties" /></li>
            <li><H t="Using the Platform to facilitate money laundering or financial fraud" /></li>
          </ul>
          <Callout type="warning">
            Violation of these prohibitions may result in immediate account
            termination, forfeiture of escrow funds, and referral to law
            enforcement authorities.
          </Callout>
        </>
      ),
    },
    {
      id: "intellectual-property",
      number: "9",
      title: "Intellectual Property",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="All content, features, and functionality of the ZYLOBRIDGE Platform, including but not limited to text, graphics, logos, icons, images, audio clips, data compilations, and software, are the exclusive property of Zylobridge Global Company LTD or its licensors and are protected by applicable intellectual property laws." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="By posting content on the Platform, you grant ZYLOBRIDGE a non-exclusive, worldwide, royalty-free, sublicensable license to use, reproduce, modify, adapt, publish, and display such content in connection with the operation and promotion of the Platform." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="You retain ownership of all content you submit to the Platform. You represent and warrant that you have all necessary rights to grant the above license and that your content does not infringe any third-party intellectual property rights." />
          </p>
          <Callout type="info">
            The ZYLOBRIDGE name, logo, and brand marks are registered
            trademarks of Zylobridge Global Company LTD. Unauthorized use of
            our trademarks is strictly prohibited.
          </Callout>
        </>
      ),
    },
    {
      id: "limitation-liability",
      number: "10",
      title: "Limitation of Liability and Disclaimers",
      content: (
        <>
          <Callout type="warning">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ZYLOBRIDGE
            SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE
            PLATFORM.
          </Callout>
          <p className="text-gray-300 leading-relaxed">
            <H t="THE PLATFORM IS PROVIDED ON AN 'AS IS' AND 'AS AVAILABLE' BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="ZYLOBRIDGE does not warrant that:" />
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 mt-3 ml-2">
            <li><H t="The Platform will be uninterrupted, error-free, or secure" /></li>
            <li><H t="Any defects or errors will be corrected" /></li>
            <li><H t="The Platform is free of viruses or other harmful components" /></li>
            <li><H t="The quality of services obtained through the Platform will meet your expectations" /></li>
          </ul>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="In no event shall ZYLOBRIDGE's total liability to you for all damages exceed the greater of (a) the amount you paid to ZYLOBRIDGE in the 12 months preceding the claim, or (b) USD $100." />
          </p>
        </>
      ),
    },
    {
      id: "privacy",
      number: "11",
      title: "Privacy and Data Protection",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="Your use of the ZYLOBRIDGE Platform is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Platform, you consent to the collection, use, and sharing of your information as described in the Privacy Policy." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="We are committed to protecting your personal data in accordance with applicable data protection laws. For details on how we collect, process, and protect your personal information, please review our Privacy Policy." />
          </p>
          <Callout type="info">
            You can review our full Privacy Policy at{" "}
            <Link href="/privacy-policy" className="text-violet-400 hover:text-violet-300 underline">
              zylobridge.com/privacy-policy
            </Link>
            . Contact us at Support@zylobridge.com with any data protection
            inquiries.
          </Callout>
        </>
      ),
    },
    {
      id: "termination",
      number: "12",
      title: "Termination",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="Either party may terminate this agreement at any time. You may terminate your account by contacting us at Support@zylobridge.com or through the account settings on the Platform." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="ZYLOBRIDGE may suspend or terminate your access to the Platform immediately, without prior notice or liability, for any reason, including but not limited to a breach of these Terms." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="Upon termination:" />
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 mt-3 ml-2">
            <li><H t="Your right to access and use the Platform will immediately cease" /></li>
            <li><H t="Any outstanding escrow funds will be handled in accordance with our dispute resolution procedures" /></li>
            <li><H t="Provisions of these Terms that by their nature should survive termination will remain in effect" /></li>
            <li><H t="We may retain your data as required by applicable law or for legitimate business purposes" /></li>
          </ul>
        </>
      ),
    },
    {
      id: "governing-law",
      number: "13",
      title: "Governing Law and Jurisdiction",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Zylobridge Global Company LTD is registered, without regard to its conflict of law provisions." />
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <H t="Any legal action or proceeding arising under these Terms shall be brought exclusively in the courts of the applicable jurisdiction, and you hereby consent to personal jurisdiction and venue in such courts." />
          </p>
          <Callout type="info">
            For any legal inquiries or notices, please contact Zylobridge Global
            Company LTD at Support@zylobridge.com.
          </Callout>
        </>
      ),
    },
    {
      id: "contact",
      number: "14",
      title: "Contact Information",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="If you have any questions about these Terms of Service, please contact us:" />
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/3 p-5 space-y-3">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Company</p>
              <p className="text-sm text-white font-medium mt-0.5">Zylobridge Global Company LTD</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email</p>
              <a
                href="mailto:Support@zylobridge.com"
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors mt-0.5 block"
              >
                Support@zylobridge.com
              </a>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Platform</p>
              <a
                href="https://zylobridge.com"
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors mt-0.5 block"
              >
                zylobridge.com
              </a>
            </div>
          </div>
        </>
      ),
    },
  ];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TermsOfService() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("acceptance");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sections = buildSections(searchQuery);

  // Intersection observer for active TOC highlight
  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observerRef.current?.observe(el);
    });
  }, []);

  useEffect(() => {
    setupObserver();
    return () => observerRef.current?.disconnect();
  }, [setupObserver]);

  // Back to top visibility
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTocOpen(false);
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // SEO meta
  useEffect(() => {
    document.title = "Terms of Service — ZYLOBRIDGE";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "Read the ZYLOBRIDGE Terms of Service governing your use of the platform, marketplace, escrow payments, and professional services."
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <header
          className="relative py-16 px-4 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #0d1a3a 0%, #0a0f1a 50%, #1a0a2e 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, #7c3aed33 0%, transparent 60%), radial-gradient(circle at 80% 20%, #2563eb22 0%, transparent 50%)",
            }}
          />
          <div className="relative max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-sm text-gray-500 mb-6"
            >
              <Link href="/" className="hover:text-gray-300 transition-colors">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-gray-300 font-medium">Terms of Service</span>
            </nav>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                <Shield className="h-5 w-5 text-violet-400" />
              </div>
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">
                Legal Agreement
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-3 text-gray-400 text-lg max-w-2xl leading-relaxed">
              These terms govern your use of the ZYLOBRIDGE platform. Please
              read them carefully before using our services.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                Last Updated: August 3, 2026
              </span>
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-blue-400" />
                {sections.length} sections
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-violet-400" />
                Zylobridge Global Company LTD
              </span>
            </div>

            {/* Search */}
            <div className="relative mt-8 max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              <input
                type="search"
                placeholder="Search terms and conditions…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
                aria-label="Search terms of service"
              />
            </div>
          </div>
        </header>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex gap-10">
            {/* ── Sticky TOC (desktop) ──────────────────────────────────────── */}
            <aside
              className="hidden lg:block w-64 shrink-0"
              aria-label="Table of contents"
            >
              <div className="sticky top-24 space-y-1 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 px-2">
                  Contents
                </p>
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 flex items-start gap-2 ${
                      activeSection === s.id
                        ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                        : "text-gray-500 hover:text-gray-300 hover:bg-white/4"
                    }`}
                    aria-current={activeSection === s.id ? "true" : undefined}
                  >
                    <span
                      className={`text-[10px] font-bold mt-0.5 shrink-0 ${
                        activeSection === s.id ? "text-violet-400" : "text-gray-600"
                      }`}
                    >
                      {s.number}.
                    </span>
                    <span className="leading-snug">{s.title}</span>
                  </button>
                ))}
              </div>
            </aside>

            {/* ── Mobile TOC toggle ─────────────────────────────────────────── */}
            <div className="lg:hidden fixed bottom-6 right-6 z-40">
              <button
                onClick={() => setTocOpen(!tocOpen)}
                className="w-12 h-12 rounded-full bg-violet-600 shadow-lg flex items-center justify-center text-white"
                aria-label="Toggle table of contents"
              >
                {tocOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              {tocOpen && (
                <div className="absolute bottom-14 right-0 w-72 bg-[#131a26] border border-white/10 rounded-2xl shadow-2xl p-4 max-h-96 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                    Contents
                  </p>
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => scrollToSection(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-start gap-2 mb-0.5 ${
                        activeSection === s.id
                          ? "bg-violet-500/15 text-violet-300"
                          : "text-gray-400 hover:text-gray-200 hover:bg-white/4"
                      }`}
                    >
                      <span className="text-[10px] font-bold mt-0.5 shrink-0 text-gray-600">
                        {s.number}.
                      </span>
                      <span className="leading-snug">{s.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Article content ───────────────────────────────────────────── */}
            <article className="flex-1 min-w-0 max-w-3xl">
              {sections.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No results found</p>
                  <p className="text-sm mt-1">
                    Try a different search term.
                  </p>
                </div>
              ) : (
                <div className="space-y-12">
                  {sections.map((s) => (
                    <section
                      key={s.id}
                      id={s.id}
                      ref={(el) => {
                        sectionRefs.current[s.id] = el;
                      }}
                      aria-labelledby={`heading-${s.id}`}
                      className="scroll-mt-24"
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-400 text-sm font-bold shrink-0">
                          {s.number}
                        </span>
                        <h2
                          id={`heading-${s.id}`}
                          className="text-xl font-bold text-white"
                        >
                          {s.title}
                        </h2>
                      </div>
                      <div className="pl-11">{s.content}</div>
                    </section>
                  ))}
                </div>
              )}

              {/* ── Document footer ──────────────────────────────────────────── */}
              <footer className="mt-16 pt-8 border-t border-white/8">
                <div className="rounded-2xl border border-white/8 bg-[#131a26]/60 p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-violet-400" />
                    <span className="text-sm font-semibold text-white">
                      Document Information
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        Last Updated
                      </p>
                      <p className="text-gray-300 mt-0.5">August 3, 2026</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        Company
                      </p>
                      <p className="text-gray-300 mt-0.5">
                        Zylobridge Global Company LTD
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        Contact
                      </p>
                      <a
                        href="mailto:Support@zylobridge.com"
                        className="text-violet-400 hover:text-violet-300 transition-colors mt-0.5 block"
                      >
                        Support@zylobridge.com
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        Sections
                      </p>
                      <p className="text-gray-300 mt-0.5">{sections.length} sections</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/6 flex flex-wrap gap-4 text-sm">
                    <Link
                      href="/privacy-policy"
                      className="text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      href="/cookie-policy"
                      className="text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Cookie Policy
                    </Link>
                    <Link
                      href="/"
                      className="text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Back to Home
                    </Link>
                  </div>
                </div>
              </footer>
            </article>
          </div>
        </div>
      </main>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 left-6 z-40 w-10 h-10 rounded-full bg-[#131a26] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all shadow-lg"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      <Footer />
    </div>
  );
}
