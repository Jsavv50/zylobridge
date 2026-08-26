import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

declare global {
  interface Window {
    revisitCkyConsent?: () => void;
  }
}

const browserSupportLinks = [
  {
    label: "Chrome — Google Chrome cookie settings",
    url: "https://support.google.com/accounts/answer/32050",
  },
  {
    label: "Safari — Apple Safari cookie settings",
    url: "https://support.apple.com/en-in/guide/safari/sfri11471/mac",
  },
  {
    label: "Firefox — Mozilla Firefox cookie settings",
    url: "https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox?redirectslug=delete-cookies-remove-info-websites-stored&redirectlocale=en-US",
  },
  {
    label: "Internet Explorer — Microsoft cookie settings",
    url: "https://support.microsoft.com/en-us/topic/how-to-delete-cookie-files-in-internet-explorer-bca9446f-d873-78de-77ba-d42645fa52fc",
  },
];

function useCookiePolicyMetadata() {
  useEffect(() => {
    const previousTitle = document.title;
    const existingDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = existingDescription?.content;
    const description =
      "Learn how Zylobridge uses cookies and similar technologies and how you can manage your cookie preferences.";
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
  const [canRevisitConsent, setCanRevisitConsent] = useState(false);

  useCookiePolicyMetadata();

  useEffect(() => {
    let attempts = 0;
    let retryTimer: number | undefined;

    const detectCookieYesConsentManager = () => {
      const isReady = typeof window.revisitCkyConsent === "function";
      setCanRevisitConsent(isReady);

      if (!isReady && attempts < 40) {
        attempts += 1;
        retryTimer = window.setTimeout(detectCookieYesConsentManager, 125);
      }
    };

    detectCookieYesConsentManager();

    return () => {
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, []);

  const openConsentPreferences = () => {
    if (typeof window.revisitCkyConsent === "function") {
      window.revisitCkyConsent();
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />

      <main>
        <header className="border-b border-white/5 bg-[radial-gradient(ellipse_72%_60%_at_50%_-20%,rgba(124,58,237,0.22)_0%,transparent_70%)]">
          <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
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
                <li aria-current="page" className="font-medium text-gray-300">
                  Cookie Policy
                </li>
              </ol>
            </nav>
            <h1
              className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Cookie Policy
            </h1>
            <dl className="mt-5 flex flex-col gap-1 text-sm text-gray-400 sm:flex-row sm:gap-6">
              <div className="flex gap-2">
                <dt className="font-medium text-gray-300">Effective date:</dt>
                <dd>August 03, 2026</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-gray-300">Last updated:</dt>
                <dd>August 12, 2026</dd>
              </div>
            </dl>
          </div>
        </header>

        <article className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="space-y-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 sm:p-10">
            <section aria-labelledby="what-are-cookies">
              <h2 id="what-are-cookies" className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                What are cookies?
              </h2>
              <div className="mt-4 space-y-4 leading-relaxed text-gray-300">
                <p>
                  This Cookie Policy explains what cookies are, how we use them, the types of cookies we use (i.e., the information we collect using cookies and how that information is used), and how to manage your cookie settings.
                </p>
                <p>
                  Cookies are small text files used to store small pieces of information. They are stored on your device when a website loads in your browser. These cookies help ensure that the website functions properly, enhance security, provide a better user experience, and analyse performance to identify what works and where improvements are needed.
                </p>
              </div>
            </section>

            <section aria-labelledby="how-we-use-cookies">
              <h2 id="how-we-use-cookies" className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                How do we use cookies?
              </h2>
              <div className="mt-4 space-y-4 leading-relaxed text-gray-300">
                <p>
                  Like most online services, our website uses both first-party and third-party cookies for various purposes. First-party cookies are primarily necessary for the website to function properly and do not collect any personally identifiable data.
                </p>
                <p>
                  The third-party cookies used on our website primarily help us understand how the website performs, track how you interact with it, keep our services secure, deliver relevant advertisements, and enhance your overall user experience while improving the speed of your future interactions with our website.
                </p>
              </div>
            </section>

            <section aria-labelledby="types-of-cookies">
              <h2 id="types-of-cookies" className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Types of cookies we use
              </h2>
              <h3 className="mt-5 text-base font-semibold text-violet-300">Necessary</h3>
              <p className="mt-3 leading-relaxed text-gray-300">
                Necessary cookies are required to enable the basic features of this site, such as providing secure log-in or adjusting your consent preferences. These cookies do not store any personally identifiable data.
              </p>
              <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-[620px] w-full border-collapse text-left text-sm">
                  <thead className="bg-white/[0.06] text-gray-200">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Cookie</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Duration</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium text-violet-200">cookieyes-*</td>
                      <td className="px-4 py-3">1 year</td>
                      <td className="px-4 py-3">CookieYes sets this cookie for consent solution management.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="manage-cookie-preferences" className="rounded-xl border border-violet-500/25 bg-violet-500/[0.08] p-5 sm:p-6">
              <h2 id="manage-cookie-preferences" className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Manage cookie preferences
              </h2>
              <button
                type="button"
                onClick={openConsentPreferences}
                disabled={!canRevisitConsent}
                className="mt-5 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 focus:ring-offset-[#171225] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Consent Preferences
              </button>
              <div className="mt-5 space-y-4 leading-relaxed text-gray-300">
                <p>
                  You can modify your cookie settings anytime by clicking the 'Consent Preferences' button above. This will allow you to revisit the cookie consent banner and update your preferences or withdraw your consent immediately.
                </p>
                <p>
                  Additionally, different browsers offer various methods to block and delete cookies used by websites. You can adjust your browser settings to block or delete cookies. Below are links to support documents on how to manage and delete cookies in major web browsers.
                </p>
              </div>
              <ul className="mt-5 space-y-3" role="list">
                {browserSupportLinks.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-violet-200 underline decoration-violet-400/60 underline-offset-4 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-5 leading-relaxed text-gray-300">
                If you are using a different web browser, please refer to its official support documentation.
              </p>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
