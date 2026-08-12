import { Link } from "wouter";
import { ChevronRight, Cookie, ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const COOKIE_POLICY_SCRIPT_ID = "cky-cookie-policy";
const COOKIE_POLICY_SCRIPT_URL =
  "https://cdn-cookieyes.com/client_data/5359e7ba4efa5b47cf588ec435fc930f/cookie-policy/script.js";

function useCookiePolicyMetadata() {
  useEffect(() => {
    const previousTitle = document.title;
    const existingDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = existingDescription?.content;
    const description =
      "Zylobridge Cookie Policy explaining how cookies and similar technologies are used on the Zylobridge website.";
    const descriptionMeta = existingDescription ?? document.createElement("meta");

    if (!existingDescription) {
      descriptionMeta.name = "description";
      document.head.appendChild(descriptionMeta);
    }

    document.title = "Cookie Policy | Zylobridge";
    descriptionMeta.content = description;

    return () => {
      document.title = previousTitle;
      if (existingDescription) {
        existingDescription.content = previousDescription ?? "";
      } else {
        descriptionMeta.remove();
      }
    };
  }, []);
}

export default function CookiePolicy() {
  const policyHostRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useCookiePolicyMetadata();

  useLayoutEffect(() => {
    const host = policyHostRef.current;
    if (!host) return;

    const existingScript = document.getElementById(COOKIE_POLICY_SCRIPT_ID);
    if (existingScript) existingScript.remove();
    host.replaceChildren();

    const observer = new MutationObserver(() => {
      if (host.children.length > 1) setLoadState("ready");
    });
    observer.observe(host, { childList: true, subtree: true });

    const policyScript = document.createElement("script");
    policyScript.id = COOKIE_POLICY_SCRIPT_ID;
    policyScript.type = "text/javascript";
    policyScript.src = COOKIE_POLICY_SCRIPT_URL;
    policyScript.async = false;
    policyScript.onerror = () => setLoadState("error");
    host.appendChild(policyScript);

    return () => {
      observer.disconnect();
      policyScript.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />

      <main>
        <header className="relative overflow-hidden border-b border-white/5">
          <div
            className="absolute inset-0 opacity-40"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 72% 60% at 50% -20%, rgba(124,58,237,0.3) 0%, transparent 70%)",
            }}
          />
          <div className="relative container mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-1.5 text-sm text-gray-500">
                <li>
                  <Link href="/" className="transition-colors hover:text-violet-400">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
                <li className="font-medium text-gray-300" aria-current="page">
                  Cookie Policy
                </li>
              </ol>
            </nav>

            <div className="flex items-start gap-5">
              <div
                className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10 sm:flex"
                aria-hidden="true"
              >
                <Cookie className="h-7 w-7 text-violet-400" />
              </div>
              <div className="max-w-2xl">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                  <ShieldCheck className="h-4 w-4" />
                  Privacy &amp; transparency
                </p>
                <h1
                  className="mb-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Cookie Policy
                </h1>
                <p className="text-sm leading-relaxed text-gray-400 sm:text-base">
                  Understand how Zylobridge uses cookies and similar technologies, and manage your consent preferences at any time.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14" aria-labelledby="cookie-policy-content-title">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-black/20">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
              <h2
                id="cookie-policy-content-title"
                className="text-lg font-bold text-slate-950"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Zylobridge Cookie Notice
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                This policy is maintained by CookieYes and is updated from the current CookieYes cookie audit.
              </p>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <div ref={policyHostRef} className="min-h-24" aria-live="polite" aria-busy={loadState === "loading"} />

              {loadState === "loading" && (
                <p className="mt-5 text-sm text-slate-500" role="status">
                  Loading the current cookie policy…
                </p>
              )}

              {loadState === "error" && (
                <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900" role="alert">
                  The cookie policy could not be loaded. Please refresh this page or contact us at{" "}
                  <a className="font-semibold underline underline-offset-2" href="mailto:Minermikee777@gmail.com">
                    Minermikee777@gmail.com
                  </a>
                  .
                </p>
              )}
            </div>
          </div>

          <p className="mt-6 flex items-start gap-2 text-sm leading-relaxed text-gray-500">
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" aria-hidden="true" />
            You can update your preferences through the consent controls included in the policy above.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
