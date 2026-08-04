import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Search, ChevronRight, Shield, AlertTriangle, Info, CheckCircle, ArrowUp, Menu, X } from "lucide-react";
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

// ─── Section data ─────────────────────────────────────────────────────────────

function buildSections(q: string): Section[] {
  const H = ({ t }: { t: string }) => (
    <HighlightText text={t} query={q} />
  );

  return [
    {
      id: "section-1",
      number: "1",
      title: "WHAT INFORMATION DO WE COLLECT?",
      content: (
        <>
          <h3 className="text-base font-semibold text-violet-300 mb-2">Personal information you disclose to us</h3>
          <Callout type="info">
            <strong>In Short:</strong> We collect personal information that you provide to us.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us." />
          </p>
          <h4 className="text-sm font-semibold text-white mb-3">Personal Information Provided by You</h4>
          <p className="text-gray-300 leading-relaxed mb-3">
            <H t="The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:" />
          </p>
          <ul className="space-y-1.5 mb-5 ml-4">
            {["names", "phone numbers", "email addresses", "mailing addresses", "usernames", "passwords", "billing addresses", "contact or authentication data", "contact preferences", "debit/credit card numbers"].map((item) => (
              <li key={item} className="flex items-center gap-2 text-gray-300 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                <H t={item} />
              </li>
            ))}
          </ul>
          <Callout type="success">
            <strong>Sensitive Information.</strong> We do not process sensitive information.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t='Social Media Login Data. We may provide you with the option to register with us using your existing social media account details, like your Facebook, X, or other social media account. If you choose to register in this way, we will collect certain profile information about you from the social media provider, as described in the section called "HOW DO WE HANDLE YOUR SOCIAL LOGINS?" below.' />
          </p>
          <p className="text-gray-300 leading-relaxed mb-5">
            <H t="All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information." />
          </p>
          <h4 className="text-sm font-semibold text-white mb-2">Google API</h4>
          <p className="text-gray-300 leading-relaxed">
            <H t="Our use of information received from Google APIs will adhere to Google API Services User Data Policy, including the Limited Use requirements." />
          </p>
        </>
      ),
    },
    {
      id: "section-2",
      number: "2",
      title: "HOW DO WE PROCESS YOUR INFORMATION?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="We process your personal information for a variety of reasons, depending on how you interact with our Services, including:" />
          </p>
          <div className="space-y-4">
            {[
              {
                title: "To facilitate account creation and authentication and otherwise manage user accounts.",
                body: "We may process your information so you can create and log in to your account, as well as keep your account in working order.",
              },
              {
                title: "To evaluate and improve our Services, products, marketing, and your experience.",
                body: "We may process your information when we believe it is necessary to identify usage trends, determine the effectiveness of our promotional campaigns, and to evaluate and improve our Services, products, marketing, and your experience.",
              },
              {
                title: "To comply with our legal obligations.",
                body: "We may process your information to comply with our legal obligations, respond to legal requests, and exercise, establish, or defend our legal rights.",
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
      title: "WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> We may share information in specific situations described in this section and/or with the following third parties.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="We may need to share your personal information in the following situations:" />
          </p>
          <div className="space-y-4">
            <div className="pl-4 border-l-2 border-violet-500/30">
              <p className="text-sm font-semibold text-white mb-1"><H t="Business Transfers." /></p>
              <p className="text-sm text-gray-400 leading-relaxed">
                <H t="We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company." />
              </p>
            </div>
            <div className="pl-4 border-l-2 border-violet-500/30">
              <p className="text-sm font-semibold text-white mb-1"><H t="When we use Google Maps Platform APIs." /></p>
              <p className="text-sm text-gray-400 leading-relaxed mb-2">
                <H t="We may share your information with certain Google Maps Platform APIs (e.g., Google Maps API, Places API). Google Maps uses GPS, Wi-Fi, and cell towers to estimate your location. GPS is accurate to about 20 meters, while Wi-Fi and cell towers help improve accuracy when GPS signals are weak, like indoors. This data helps Google Maps provide directions, but it is not always perfectly precise." />
              </p>
              <p className="text-sm text-gray-400 leading-relaxed">
                <H t='We obtain and store on your device ("cache") your location. You may revoke your consent anytime by contacting us at the contact details provided at the end of this document.' />
              </p>
            </div>
          </div>
        </>
      ),
    },
    {
      id: "section-4",
      number: "4",
      title: "DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> We may use cookies and other tracking technologies to collect and store your information.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information when you interact with our Services. Some online tracking technologies help us maintain the security of our Services and your account, prevent crashes, fix bugs, save your preferences, and assist with basic site functions." />
          </p>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="We also permit third parties and service providers to use online tracking technologies on our Services for analytics and advertising, including to help manage and display advertisements or to tailor advertisements to your interests. The third parties and service providers use their technology to provide advertising about products and services tailored to your interests which may appear either on our Services or on other websites." />
          </p>
          <Callout type="warning">
            <H t="Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice." />
          </Callout>
        </>
      ),
    },
    {
      id: "section-5",
      number: "5",
      title: "HOW DO WE HANDLE YOUR SOCIAL LOGINS?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> If you choose to register or log in to our Services using a social media account, we may have access to certain information about you.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="Our Services offer you the ability to register and log in using your third-party social media account details (like your Facebook or X logins). Where you choose to do this, we will receive certain profile information about you from your social media provider. The profile information we receive may vary depending on the social media provider concerned, but will often include your name, email address, friends list, and profile picture, as well as other information you choose to make public on such a social media platform." />
          </p>
          <p className="text-gray-300 leading-relaxed">
            <H t="We will use the information we receive only for the purposes that are described in this Privacy Notice or that are otherwise made clear to you on the relevant Services. Please note that we do not control, and are not responsible for, other uses of your personal information by your third-party social media provider. We recommend that you review their privacy notice to understand how they collect, use, and share your personal information, and how you can set your privacy preferences on their sites and apps." />
          </p>
        </>
      ),
    },
    {
      id: "section-6",
      number: "6",
      title: "HOW LONG DO WE KEEP YOUR INFORMATION?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t='We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). If you are located in the EU or UK, see section "HOW DO WE PROCESS YOUR INFORMATION?" for our retention periods by purpose.' />
          </p>
          <p className="text-gray-300 leading-relaxed">
            <H t="When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible." />
          </p>
        </>
      ),
    },
    {
      id: "section-7",
      number: "7",
      title: "DO WE COLLECT INFORMATION FROM MINORS?",
      content: (
        <>
          <Callout type="warning">
            <strong>In Short:</strong> We do not knowingly collect data from or market to children under 18 years of age.
          </Callout>
          <p className="text-gray-300 leading-relaxed">
            <H t="We do not knowingly collect, solicit data from, or market to children under 18 years of age, nor do we knowingly sell such personal information. By using the Services, you represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such minor dependent's use of the Services. If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of any data we may have collected from children under age 18, please contact us at " />
            <a href="mailto:Minermikee777@gmail.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
              Minermikee777@gmail.com
            </a>
            .
          </p>
        </>
      ),
    },
    {
      id: "section-8",
      number: "8",
      title: "WHAT ARE YOUR PRIVACY RIGHTS?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> You may review, change, or terminate your account at any time, depending on your country, province, or state of residence.
          </Callout>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t='Withdrawing your consent: If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.' />
          </p>
          <p className="text-gray-300 leading-relaxed mb-5">
            <H t="However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent." />
          </p>
          <h4 className="text-sm font-semibold text-white mb-3">Account Information</h4>
          <p className="text-gray-300 leading-relaxed mb-3">
            <H t="If you would at any time like to review or change the information in your account or terminate your account, you can:" />
          </p>
          <ul className="space-y-1.5 mb-4 ml-4">
            {[
              "Log in to your account settings and update your user account.",
              "Contact us using the contact information provided.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-300 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                <H t={item} />
              </li>
            ))}
          </ul>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements." />
          </p>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="Cookies and similar technologies: Most Web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If you choose to remove cookies or reject cookies, this could affect certain features or services of our Services." />
          </p>
          <p className="text-gray-300 leading-relaxed">
            <H t="If you have questions or comments about your privacy rights, you may email us at " />
            <a href="mailto:Minermikee777@gmail.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
              Minermikee777@gmail.com
            </a>
            .
          </p>
        </>
      ),
    },
    {
      id: "section-9",
      number: "9",
      title: "CONTROLS FOR DO-NOT-TRACK FEATURES",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t='Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage, no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Notice.' />
          </p>
        </>
      ),
    },
    {
      id: "section-10",
      number: "10",
      title: "DO OTHER REGIONS HAVE SPECIFIC PRIVACY RIGHTS?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> You may have additional rights based on the country you reside in.
          </Callout>
          <h4 className="text-sm font-semibold text-white mb-3">Republic of South Africa</h4>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t='At any time, you have the right to request access to or correction of your personal information. You can make such a request by contacting us by using the contact details provided in the section "HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?"' />
          </p>
          <p className="text-gray-300 leading-relaxed mb-4">
            <H t="If you are unsatisfied with the manner in which we address any complaint with regard to our processing of personal information, you can contact the office of the regulator, the details of which are:" />
          </p>
          <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-2">
            <p className="text-sm font-semibold text-white">The Information Regulator (South Africa)</p>
            <p className="text-sm text-gray-400">
              General enquiries:{" "}
              <a href="mailto:enquiries@inforegulator.org.za" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                enquiries@inforegulator.org.za
              </a>
            </p>
            <p className="text-sm text-gray-400">
              Complaints (complete POPIA/PAIA form 5):{" "}
              <a href="mailto:PAIAComplaints@inforegulator.org.za" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                PAIAComplaints@inforegulator.org.za
              </a>{" "}
              &amp;{" "}
              <a href="mailto:POPIAComplaints@inforegulator.org.za" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                POPIAComplaints@inforegulator.org.za
              </a>
            </p>
          </div>
        </>
      ),
    },
    {
      id: "section-11",
      number: "11",
      title: "DO WE MAKE UPDATES TO THIS NOTICE?",
      content: (
        <>
          <Callout type="info">
            <strong>In Short:</strong> Yes, we will update this notice as necessary to stay compliant with relevant laws.
          </Callout>
          <p className="text-gray-300 leading-relaxed">
            <H t='We may update this Privacy Notice from time to time. The updated version will be indicated by an updated "Revised" date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.' />
          </p>
        </>
      ),
    },
    {
      id: "section-12",
      number: "12",
      title: "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed mb-5">
            <H t="If you have questions or comments about this notice, you may email us at " />
            <a href="mailto:Minermikee777@gmail.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
              Minermikee777@gmail.com
            </a>
            <H t=" or contact us by post at:" />
          </p>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-1">
            <p className="text-sm font-semibold text-white">Zylobridge Global Company LTD</p>
            <p className="text-sm text-gray-400">2570 North 1st Street</p>
            <p className="text-sm text-gray-400">San Jose, CA 95131</p>
            <p className="text-sm text-gray-400">United States</p>
          </div>
        </>
      ),
    },
    {
      id: "section-13",
      number: "13",
      title: "HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?",
      content: (
        <>
          <p className="text-gray-300 leading-relaxed">
            <H t="Based on the applicable laws of your country, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. To request to review, update, or delete your personal information, please fill out and submit a data subject access request." />
          </p>
          <div className="mt-6">
            <a
              href="mailto:Minermikee777@gmail.com?subject=Data Subject Access Request"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0d1117]"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
            >
              Submit a Data Access Request
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </>
      ),
    },
  ];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PrivacyPolicy() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("section-1");
  const [tocOpen, setTocOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sections = buildSections(searchQuery);

  // Intersection observer for active TOC highlight
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    sections.forEach((s) => {
      const el = sectionRefs.current[s.id];
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [searchQuery]);

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

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <>
      {/* SEO meta tags via document title */}
      <title>Privacy Policy — ZYLOBRIDGE</title>

      <div className="min-h-screen bg-[#0d1117] text-white">
        <Navbar />

        {/* Hero Header */}
        <header className="relative overflow-hidden border-b border-white/5">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,58,237,0.25) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-14 sm:py-20">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-1.5 text-sm text-gray-500">
                <li>
                  <Link href="/" className="hover:text-violet-400 transition-colors">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
                <li className="text-gray-300 font-medium" aria-current="page">
                  Privacy Policy
                </li>
              </ol>
            </nav>

            <div className="flex items-start gap-5">
              <div
                className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/25"
                style={{ background: "rgba(124,58,237,0.12)" }}
                aria-hidden="true"
              >
                <Shield className="h-7 w-7 text-violet-400" />
              </div>
              <div>
                <h1
                  className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Privacy Policy
                </h1>
                <p className="text-gray-400 text-sm">
                  Last Updated:{" "}
                  <time dateTime="2026-08-03" className="text-gray-300 font-medium">
                    August 3, 2026
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
                    aria-label="Search within Privacy Policy"
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
                    Contact our privacy team for any concerns about your data.
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
              {/* Summary of Key Points */}
              <section
                aria-labelledby="summary-heading"
                className="mb-10 rounded-2xl border border-white/8 bg-white/2 p-6 sm:p-8"
              >
                <h2
                  id="summary-heading"
                  className="text-lg font-bold text-white mb-4"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Summary of Key Points
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-5">
                  This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents to find the section you are looking for.
                </p>
                <dl className="space-y-4">
                  {[
                    {
                      q: "What personal information do we process?",
                      a: "When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use.",
                    },
                    {
                      q: "Do we process any sensitive personal information?",
                      a: "Some of the information may be considered \"special\" or \"sensitive\" in certain jurisdictions, for example your racial or ethnic origins, sexual orientation, and religious beliefs. We do not process sensitive personal information.",
                    },
                    {
                      q: "Do we collect any information from third parties?",
                      a: "We do not collect any information from third parties.",
                    },
                    {
                      q: "How do we process your information?",
                      a: "We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.",
                    },
                    {
                      q: "What are your rights?",
                      a: "Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information.",
                    },
                    {
                      q: "How do you exercise your rights?",
                      a: "The easiest way to exercise your rights is by submitting a data subject access request, or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.",
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
              <article aria-label="Privacy Policy full text">
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
                      <span className="text-gray-300 font-medium">Last Updated:</span> August 3, 2026
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
                        { href: "/terms", label: "Terms of Service" },
                        { href: "/cookie-policy", label: "Cookie Policy" },
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
