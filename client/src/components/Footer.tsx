import { Link } from "wouter";
import { ArrowUpRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { ZylobridgeLogo } from "./ZylobridgeLogo";

const platformLinks = [
  { href: "/jobs", label: "Browse Jobs" },
  { href: "/talent", label: "Find Professionals" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/jobs/new", label: "Post a Job" },
  { href: "/jobs", label: "Find Work" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/shop", label: "Shop" },
];

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookie-policy", label: "Cookie Policy" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#090d14]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_0.7fr]">
          <div>
            <ZylobridgeLogo imageClassName="h-9 w-9" />
            <p className="mt-5 max-w-sm text-sm leading-7 text-gray-500">Powering the future of skilled work through clearer profiles, structured opportunities, and accountable project connections.</p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-gray-500"><span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2"><LockKeyhole className="h-3.5 w-3.5 text-violet-300" />Encrypted transport</span><span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />Verification where available</span></div>
          </div>
          <div><h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Platform</h2><ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">{platformLinks.map((item) => <li key={`${item.href}-${item.label}`}><Link href={item.href} className="text-sm text-gray-500 transition hover:text-violet-200">{item.label}</Link></li>)}</ul></div>
          <div><h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Legal</h2><ul className="mt-5 space-y-3">{legalLinks.map((item) => <li key={item.href}><Link href={item.href} className="text-sm text-gray-500 transition hover:text-violet-200">{item.label}</Link></li>)}</ul></div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/8 pt-6 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between"><p>&copy; {new Date().getFullYear()} ZYLOBRIDGE. All rights reserved.</p><Link href="/how-it-works" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white">See how it works <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
      </div>
    </footer>
  );
}
