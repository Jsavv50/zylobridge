import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Search, ChevronRight, Cookie, AlertTriangle, Info, CheckCircle, ArrowUp, Menu, X } from "lucide-react";
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
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-violet-500/30 text-violet-200 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Cookie type table ────────────────────────────────────────────────────────

function CookieTable({
  rows,
}: {
  rows: { name: string; purpose: string; duration: string; type: string }[];
}) {
  return (
    <div className="overflow-x-auto my-5 rounded-xl border border-white/8">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8 bg-white/3">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cookie Name</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Purpose</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Duration</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-transparent" : "bg-white/1"}`}>
              <td className="px-4 py-3 font-mono text-xs text-violet-300">{row.name}</td>
              <td className="px-4 py-3 text-gray-400 leading-relaxed">{row.purpose}</td>
              <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{row.duration}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
                  {row.type}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section data ─────────────────────────────────────────────────────────────

function buildSections(q: string): Section[] {
  const H = ({ t }: { t: string }) => <HighlightText text={t} query={q} />;

  return [
    {
      id: "section-1",
      number: "1",
      title: "WHAT ARE COOKIES?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> Cookies are small text files stored on your device that help websites remember information about your visit and improve your experience.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="A cookie is a small piece of data (text file) that a website — when visited by a user — asks your browser to store on your device in order to remember information about you, such as your language preference or login information. Those cookies are set by us and called first-party cookies. We also use third-party cookies — which are cookies from a domain different than the domain of the website you are visiting — for our advertising and marketing efforts." />
          </p>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="More specifically, we use cookies and other tracking technologies for the following purposes:" />
          </p>
          <ul className="space-y-2 mb-5 ml-4">
            {[
              "Strictly Necessary / Essential Cookies",
              "Performance and Analytics Cookies",
              "Functional Cookies",
              "Targeting and Advertising Cookies",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-gray-300 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                <H t={item} />
              </li>
            ))}
          </ul>
          <p className="text-gray-300 leading-relaxed">
            <H t="Cookies can be 'persistent' or 'session' cookies. Persistent cookies remain on your personal computer or mobile device when you go offline, while session cookies are deleted as soon as you close your web browser." />
          </p>
        </>
      ),
    },
    {
      id: "section-2",
      number: "2",
      title: "WHY DO WE USE COOKIES?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> We use cookies to keep you signed in, remember your preferences, understand how you use our platform, and deliver a secure and personalised experience.
          </Callout>
          <div className="space-y-4 mb-5">
            {[
              {
                title: "Authentication and Security",
                body: "We use cookies to identify you when you sign in to ZYLOBRIDGE and to keep your session secure throughout your visit. These cookies are essential and cannot be disabled.",
              },
              {
                title: "Preferences and Settings",
                body: "We use cookies to remember your preferences such as language, timezone, and notification settings so you do not have to reconfigure them on every visit.",
              },
              {
                title: "Analytics and Performance",
                body: "We use analytics cookies to understand how visitors interact with our platform — which pages are most visited, how long users spend on each page, and where they navigate from. This data helps us improve the platform.",
              },
              {
                title: "Fraud Prevention",
                body: "We use cookies as part of our security infrastructure to detect and prevent fraudulent activity, unauthorised access, and abuse of our platform.",
              },
              {
                title: "Payment Processing",
                body: "Our payment provider (Paystack) may set cookies to facilitate secure payment transactions and prevent fraud during checkout.",
              },
            ].map((item) => (
              <div key={item.title} className="pl-4 border-l-2 border-violet-500/30">
                <p className="text-sm font-semibold text-white mb-1"><H t={item.title} /></p>
                <p className="text-sm text-gray-400 leading-relaxed"><H t={item.body} /></p>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      id: "section-3",
      number: "3",
      title: "WHAT TYPES OF COOKIES DO WE USE?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> We use strictly necessary, functional, analytics, and third-party cookies. The table below lists the specific cookies we set.
          </Callout>

          <h3 className="text-base font-semibold text-violet-300 mb-2 mt-5">3.1 Strictly Necessary Cookies</h3>
          <p className="text-gray-300 leading-relaxed mb-3">
            <H t="These cookies are required for the operation of our platform. They include, for example, cookies that enable you to log into secure areas of our website or use a shopping cart. Without these cookies, services you have asked for cannot be provided." />
          </p>
          <CookieTable
            rows={[
              { name: "zb_session", purpose: "Stores your authenticated session token to keep you signed in", duration: "7 days", type: "Essential" },
              { name: "zb_csrf", purpose: "Cross-site request forgery protection token", duration: "Session", type: "Essential" },
              { name: "zb_auth_state", purpose: "OAuth state parameter for Google sign-in flow (HMAC-signed)", duration: "10 minutes", type: "Essential" },
            ]}
          />

          <h3 className="text-base font-semibold text-violet-300 mb-2 mt-6">3.2 Functional Cookies</h3>
          <p className="text-gray-300 leading-relaxed mb-3">
            <H t="These cookies enable the website to provide enhanced functionality and personalisation. They may be set by us or by third-party providers whose services we have added to our pages." />
          </p>
          <CookieTable
            rows={[
              { name: "zb_prefs", purpose: "Stores user interface preferences such as sidebar state and notification settings", duration: "1 year", type: "Functional" },
              { name: "zb_locale", purpose: "Remembers your selected language and regional settings", duration: "1 year", type: "Functional" },
            ]}
          />

          <h3 className="text-base font-semibold text-violet-300 mb-2 mt-6">3.3 Analytics Cookies</h3>
          <p className="text-gray-300 leading-relaxed mb-3">
            <H t="These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our platform. All information these cookies collect is aggregated and therefore anonymous." />
          </p>
          <CookieTable
            rows={[
              { name: "_ga", purpose: "Google Analytics — distinguishes unique users", duration: "2 years", type: "Analytics" },
              { name: "_ga_*", purpose: "Google Analytics — maintains session state", duration: "2 years", type: "Analytics" },
              { name: "umami.is_*", purpose: "Privacy-first analytics (Umami) — tracks page views without personal data", duration: "Session", type: "Analytics" },
            ]}
          />

          <h3 className="text-base font-semibold text-violet-300 mb-2 mt-6">3.4 Third-Party Cookies</h3>
          <p className="text-gray-300 leading-relaxed mb-3">
            <H t="Some cookies are placed by third-party services that appear on our pages. We do not control the setting of these cookies and you should check the relevant third-party websites for more information about their cookies and how to manage them." />
          </p>
          <CookieTable
            rows={[
              { name: "paystack_*", purpose: "Paystack payment gateway — fraud prevention and secure checkout", duration: "Session", type: "Third-party" },
              { name: "supabase-auth-token", purpose: "Supabase authentication — manages your Supabase session", duration: "1 hour", type: "Third-party" },
            ]}
          />
        </>
      ),
    },
    {
      id: "section-4",
      number: "4",
      title: "HOW CAN YOU CONTROL COOKIES?",
      content: (
        <>
          <Callout type="warning">
            <strong>Important:</strong> Disabling strictly necessary cookies will prevent you from signing in and using core features of ZYLOBRIDGE. We recommend only disabling non-essential cookies.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in the Cookie Consent Manager (if displayed on our site) or by adjusting your browser settings." />
          </p>
          <h3 className="text-base font-semibold text-violet-300 mb-3">Browser Controls</h3>
          <p className="text-gray-300 leading-relaxed mb-3">
            <H t="Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set, visit www.aboutcookies.org or www.allaboutcookies.org. You can set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies." />
          </p>
          <div className="space-y-3 mb-5">
            {[
              { browser: "Google Chrome", url: "https://support.google.com/chrome/answer/95647" },
              { browser: "Mozilla Firefox", url: "https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" },
              { browser: "Safari", url: "https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" },
              { browser: "Microsoft Edge", url: "https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" },
            ].map((item) => (
              <div key={item.browser} className="flex items-center gap-3 pl-4 border-l-2 border-violet-500/30">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">{item.browser}:</span>{" "}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                    Cookie settings guide
                  </a>
                </p>
              </div>
            ))}
          </div>
          <h3 className="text-base font-semibold text-violet-300 mb-3">Opt-Out of Analytics</h3>
          <p className="text-gray-300 leading-relaxed">
            <H t="To opt out of being tracked by Google Analytics across all websites, visit http://tools.google.com/dlpage/gaoptout. You can also install the Google Analytics Opt-out Browser Add-on." />
          </p>
        </>
      ),
    },
    {
      id: "section-5",
      number: "5",
      title: "DO WE USE WEB BEACONS OR PIXEL TAGS?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> We may use web beacons in our emails and on our platform to understand engagement and delivery rates.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="In addition to cookies, we may use other similar technologies like web beacons (sometimes called 'tracking pixels' or 'clear gifs'). These are tiny graphics files that contain a unique identifier that enable us to recognise when someone has visited our Services or opened an email that we have sent them." />
          </p>
          <p className="text-gray-300 leading-relaxed">
            <H t="This allows us, for example, to monitor the traffic patterns of users from one page within a website to another, to deliver or communicate with cookies, to understand whether you have come to the website from an online advertisement displayed on a third-party website, to improve site performance, and to measure the success of email marketing campaigns. In many instances, these technologies are reliant on cookies to function properly, and so declining cookies will impair their functioning." />
          </p>
        </>
      ),
    },
    {
      id: "section-6",
      number: "6",
      title: "HOW DOES COOKIE USE AFFECT YOUR PRIVACY RIGHTS?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> Depending on your location, you may have specific rights regarding cookies and tracking technologies under applicable data protection law.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="Depending on where you are located, you may have the following rights regarding cookies and similar tracking technologies:" />
          </p>
          <div className="space-y-4 mb-5">
            {[
              {
                title: "Right to be informed",
                body: "You have the right to clear, comprehensive information about the cookies we use and why we use them. This Cookie Policy fulfils that obligation.",
              },
              {
                title: "Right to consent or withdraw consent",
                body: "Where we rely on your consent to set non-essential cookies, you have the right to withdraw that consent at any time without detriment. You can do this through your browser settings.",
              },
              {
                title: "Right to access",
                body: "You have the right to request access to the personal data we hold about you, including data collected through cookies.",
              },
              {
                title: "Right to erasure",
                body: "You have the right to request that we delete personal data collected through cookies, subject to certain legal exceptions.",
              },
            ].map((item) => (
              <div key={item.title} className="pl-4 border-l-2 border-violet-500/30">
                <p className="text-sm font-semibold text-white mb-1"><H t={item.title} /></p>
                <p className="text-sm text-gray-400 leading-relaxed"><H t={item.body} /></p>
              </div>
            ))}
          </div>
          <p className="text-gray-300 leading-relaxed">
            <H t="To exercise any of these rights, please contact us using the details provided at the bottom of this policy. We will respond to all legitimate requests within 30 days." />
          </p>
        </>
      ),
    },
    {
      id: "section-7",
      number: "7",
      title: "COOKIES AND CHILDREN",
      content: (
        <>
          <Callout type="warning">
            <strong>Important:</strong> ZYLOBRIDGE is not directed at children under 18 years of age and we do not knowingly collect personal data from children through cookies.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="Our Services are intended for use by adults aged 18 and over. We do not knowingly use cookies to collect personal information from children under the age of 18. If you are a parent or guardian and believe that your child has provided us with personal information through cookies or other tracking technologies, please contact us immediately at Minermikee777@gmail.com and we will take steps to remove that information." />
          </p>
        </>
      ),
    },
    {
      id: "section-8",
      number: "8",
      title: "UPDATES TO THIS COOKIE POLICY",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> We may update this Cookie Policy from time to time. We will notify you of any material changes by updating the 'Last Updated' date.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore revisit this Cookie Policy regularly to stay informed about our use of cookies and related technologies." />
          </p>
          <p className="text-gray-300 leading-relaxed">
            <H t="The date at the top of this Cookie Policy indicates when it was last updated. If we make material changes to how we use cookies, we will notify you either through the email address you have provided us, or by placing a prominent notice on our website." />
          </p>
        </>
      ),
    },
    {
      id: "section-9",
      number: "9",
      title: "HOW CAN YOU CONTACT US ABOUT THIS POLICY?",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="If you have questions or comments about this Cookie Policy, you may contact us by email at:" />
          </p>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 mb-5">
            <p className="text-sm font-semibold text-violet-300 mb-1">Zylobridge Global Company LTD</p>
            <p className="text-sm text-gray-400 mb-1">
              <span className="text-gray-300 font-medium">Email:</span>{" "}
              <a href="mailto:Minermikee777@gmail.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                Minermikee777@gmail.com
              </a>
            </p>
            <p className="text-sm text-gray-400">
              <span className="text-gray-300 font-medium">Owner:</span> Joseph Savage
            </p>
          </div>
          <p className="text-gray-300 leading-relaxed">
            <H t="We aim to respond to all privacy-related enquiries within 30 days. If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority." />
          </p>
        </>
      ),
    },
  ];
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function CookiePolicy() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("section-1");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sections = buildSections(searchQuery);

  // IntersectionObserver for active section highlighting
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topEntry = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveSection(topEntry.target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observerRef.current!.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, [sections.length]);

  // Back-to-top visibility
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTocOpen(false);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0d1117] text-white">
        {/* Page header */}
        <header className="border-b border-white/8 bg-[#0d1117]/95 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8 sm:py-10">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex items-center gap-1.5 text-xs text-gray-500" role="list">
                <li>
                  <Link href="/" className="hover:text-gray-300 transition-colors">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
                <li className="text-gray-300 font-medium" aria-current="page">
                  Cookie Policy
                </li>
              </ol>
            </nav>

            <div className="flex items-start gap-5">
              <div
                className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/25"
                style={{ background: "rgba(124,58,237,0.12)" }}
                aria-hidden="true"
              >
                <Cookie className="h-7 w-7 text-violet-400" />
              </div>
              <div>
                <h1
                  className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Cookie Policy
                </h1>
                <p className="text-gray-400 text-sm">
                  Last Updated:{" "}
                  <time dateTime="2026-08-04" className="text-gray-300 font-medium">
                    August 4, 2026
                  </time>
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row gap-10 xl:gap-14">

            {/* ── Sidebar TOC ─────────────────────────────────────────── */}
            <aside className="lg:w-72 xl:w-80 shrink-0">
              {/* Mobile TOC toggle */}
              <div className="lg:hidden mb-6">
                <button
                  onClick={() => setTocOpen(!tocOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm font-medium text-gray-300 hover:border-violet-500/30 transition-colors"
                  aria-expanded={tocOpen}
                  aria-controls="toc-nav"
                >
                  <span className="flex items-center gap-2">
                    <Menu className="h-4 w-4 text-violet-400" />
                    Table of Contents
                  </span>
                  {tocOpen ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </div>

              {/* TOC Nav */}
              <nav
                id="toc-nav"
                aria-label="Table of Contents"
                className={`${tocOpen ? "block" : "hidden"} lg:block lg:sticky lg:top-24`}
              >
                {/* Search */}
                <div className="relative mb-4">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    placeholder="Search policy…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/3 pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-colors"
                    aria-label="Search within Cookie Policy"
                  />
                </div>

                <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/8">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contents</p>
                  </div>
                  <ul className="py-2" role="list">
                    {sections.map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => scrollToSection(s.id)}
                          className={`w-full text-left flex items-start gap-3 px-4 py-2.5 text-xs transition-colors group ${
                            activeSection === s.id
                              ? "text-violet-300 bg-violet-500/8"
                              : "text-gray-500 hover:text-gray-300 hover:bg-white/3"
                          }`}
                          aria-current={activeSection === s.id ? "true" : undefined}
                        >
                          <span
                            className={`shrink-0 mt-0.5 font-mono font-bold ${
                              activeSection === s.id ? "text-violet-400" : "text-gray-600 group-hover:text-gray-400"
                            }`}
                          >
                            {s.number}.
                          </span>
                          <span className="leading-snug">{s.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Contact card */}
                <div className="mt-4 rounded-xl border border-violet-500/15 bg-violet-500/5 p-4">
                  <p className="text-xs font-semibold text-violet-300 mb-1">Questions?</p>
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                    Contact our privacy team for any concerns about cookies or tracking.
                  </p>
                  <a
                    href="mailto:Minermikee777@gmail.com"
                    className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                  >
                    Minermikee777@gmail.com
                    <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
              </nav>
            </aside>

            {/* ── Main content ─────────────────────────────────────────── */}
            <main className="flex-1 min-w-0" id="main-content">
              {/* Overview callout */}
              <section
                aria-labelledby="overview-heading"
                className="mb-10 rounded-2xl border border-white/8 bg-white/2 p-6 sm:p-8"
              >
                <h2
                  id="overview-heading"
                  className="text-lg font-bold text-white mb-4"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  About This Cookie Policy
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-5">
                  This Cookie Policy explains how Zylobridge Global Company LTD ("ZYLOBRIDGE", "we", "us", or "our") uses cookies and similar tracking technologies when you visit or use our platform at{" "}
                  <a href="https://zylobridge.manus.space" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                    zylobridge.manus.space
                  </a>
                  . It explains what these technologies are and why we use them, as well as your rights to control our use of them.
                </p>
                <dl className="space-y-4">
                  {[
                    {
                      q: "What is a cookie?",
                      a: "A small text file stored on your device by a website to remember information about your visit.",
                    },
                    {
                      q: "Can I opt out?",
                      a: "You can control non-essential cookies through your browser settings. Strictly necessary cookies cannot be disabled as they are required for the platform to function.",
                    },
                    {
                      q: "Do we sell cookie data?",
                      a: "No. We do not sell, rent, or trade personal data collected through cookies to third parties for their own marketing purposes.",
                    },
                    {
                      q: "How do we protect your data?",
                      a: "All session cookies are transmitted over HTTPS and are HttpOnly and Secure flagged to prevent JavaScript access and interception.",
                    },
                  ].map((item) => (
                    <div key={item.q} className="grid sm:grid-cols-[auto_1fr] gap-1 sm:gap-4">
                      <dt className="text-sm font-semibold text-violet-300 sm:max-w-[220px]">{item.q}</dt>
                      <dd className="text-sm text-gray-400 leading-relaxed">{item.a}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Policy Sections */}
              <article aria-label="Cookie Policy full text">
                {sections.map((section, idx) => (
                  <section
                    key={section.id}
                    id={section.id}
                    ref={(el) => { sectionRefs.current[section.id] = el; }}
                    aria-labelledby={`${section.id}-heading`}
                    className={`scroll-mt-24 ${idx < sections.length - 1 ? "mb-12 pb-12 border-b border-white/5" : "mb-12"}`}
                  >
                    <h2
                      id={`${section.id}-heading`}
                      className="flex items-start gap-3 text-lg sm:text-xl font-bold text-white mb-6"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <span
                        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold text-violet-300"
                        style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}
                        aria-hidden="true"
                      >
                        {section.number}
                      </span>
                      <span className="leading-snug pt-0.5">{section.title}</span>
                    </h2>
                    <div className="pl-0 sm:pl-11">
                      {section.content}
                    </div>
                  </section>
                ))}
              </article>

              {/* Page Footer */}
              <div className="mt-10 rounded-2xl border border-white/8 bg-white/2 p-6 sm:p-8">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Document Info</p>
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-300 font-medium">Last Updated:</span> August 4, 2026
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      <span className="text-gray-300 font-medium">Company:</span> Zylobridge Global Company LTD
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      <span className="text-gray-300 font-medium">Contact:</span>{" "}
                      <a href="mailto:Minermikee777@gmail.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                        Minermikee777@gmail.com
                      </a>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Related Policies</p>
                    <ul className="space-y-2">
                      {[
                        { href: "/privacy-policy", label: "Privacy Policy" },
                        { href: "/terms", label: "Terms of Service" },
                        { href: "/contact", label: "Contact Us" },
                      ].map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* Back to top */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-violet-500/30 bg-[#131a26] text-violet-400 shadow-lg hover:bg-violet-500/15 hover:text-violet-300 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0d1117]"
            aria-label="Back to top"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}

        <Footer />
      </div>
    </>
  );
}
