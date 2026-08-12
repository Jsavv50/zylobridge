import { Building2, CheckCircle2, Compass, LockKeyhole, UserRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const workspaceCapabilities = [
  {
    icon: Compass,
    title: "Marketplace access",
    description: "Review the public marketplace while your organization workspace is being established.",
    href: "/marketplace",
    action: "Browse marketplace",
  },
  {
    icon: UserRound,
    title: "Account management",
    description: "Review your enterprise account information and security settings.",
    href: "/profile",
    action: "View account",
  },
];

export default function EnterpriseDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { data: workspace, isLoading } = trpc.enterprise.overview.useQuery(undefined, {
    enabled: user?.userType === "enterprise",
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-gray-400">
        Please sign in to access your workspace.
      </div>
    );
  }

  if (user?.userType !== "enterprise") {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4 px-4 text-center text-white">
        <LockKeyhole className="h-8 w-8 text-amber-400" />
        <div>
          <h1 className="text-xl font-bold">Enterprise workspace access required</h1>
          <p className="mt-2 text-sm text-gray-400">This dashboard is available only to Enterprise accounts.</p>
        </div>
        <Link href="/onboarding">
          <Button variant="outline" className="border-white/10 bg-transparent text-gray-300">Review account setup</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="rounded-3xl border border-amber-500/20 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.16),transparent_58%),linear-gradient(135deg,#171225,#101827)] p-6 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10">
                <Building2 className="h-6 w-6 text-amber-300" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Enterprise workspace</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Welcome, {user.name || "Enterprise member"}
              </h1>
              <p className="mt-3 leading-relaxed text-gray-300">
                Your Enterprise account is configured as a distinct, role-safe workspace. Organization members, delegated project controls, and team permissions will be introduced as dedicated capabilities rather than inherited from contractor or professional accounts.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Workspace active</span>
            </div>
          </div>
        </header>

        <section className="mt-8" aria-labelledby="enterprise-capabilities">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="enterprise-capabilities" className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Available now
              </h2>
              <p className="mt-1 text-sm text-gray-400">Only capabilities available to the Enterprise role are shown here.</p>
            </div>
            {!isLoading && workspace && <span className="text-xs text-gray-500">Enterprise account</span>}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {workspaceCapabilities.map(({ icon: Icon, title, description, href, action }) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-[#131a26] p-6">
                <Icon className="h-5 w-5 text-amber-300" />
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 min-h-12 text-sm leading-relaxed text-gray-400">{description}</p>
                <Link href={href} className="mt-5 inline-flex">
                  <Button variant="outline" size="sm" className="border-amber-500/25 bg-transparent text-amber-200 hover:bg-amber-500/10 hover:text-white">
                    {action}
                  </Button>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
