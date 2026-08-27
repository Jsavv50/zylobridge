import { Building2, ChevronLeft, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApplicationShell, EmptyState, PageHeader } from "@/components/shell/ZyloShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function EnterpriseAccountManagement() {
  const { user, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/sign-in" });
  const isEnterprise = user?.userType === "enterprise";
  const { data: workspace, isLoading } = trpc.enterprise.overview.useQuery(undefined, { enabled: isEnterprise });
  const organizations = workspace?.organizations ?? [];
  const organization = organizations[0]?.organization;
  const membership = organizations[0]?.membership;
  const { data: members = [] } = trpc.enterprise.members.useQuery(
    { organizationId: organization?.id ?? 0 },
    { enabled: Boolean(organization?.id) },
  );

  if (!isAuthenticated) return null;
  if (!isEnterprise) {
    return <ApplicationShell><EmptyState icon={LockKeyhole} title="Enterprise access required" description="This account-management workspace is available only to authorized Enterprise organization users." action={<Link href="/onboarding"><Button>Review account setup</Button></Link>} /></ApplicationShell>;
  }

  return (
    <ApplicationShell>
      <PageHeader
        title="Enterprise Account Management"
        description="Manage organization-level identity, membership, and security context separately from your personal profile."
        action={<Link href="/enterprise"><Button variant="outline"><ChevronLeft className="mr-2 h-4 w-4" />Back to enterprise workspace</Button></Link>}
      />
      {isLoading ? <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading organization account details…</div> : !organization ? <EmptyState icon={Building2} title="No organization workspace yet" description="Create an organization from the Enterprise Workspace before managing organization account settings." action={<Link href="/enterprise"><Button>Open Enterprise Workspace</Button></Link>} /> : (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-3"><div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-2"><Building2 className="h-5 w-5 text-amber-300" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Organization information</p><h2 className="mt-1 text-xl font-bold text-foreground">{organization.name}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{organization.description || "No organization description has been added."}</p></div></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border bg-background p-4"><p className="text-xs text-muted-foreground">Signed-in administrator</p><p className="mt-1 truncate font-medium text-foreground">{user.email || user.name || "Authenticated Enterprise user"}</p></div><div className="rounded-xl border border-border bg-background p-4"><p className="text-xs text-muted-foreground">Your organization role</p><p className="mt-1 font-medium text-foreground">{membership?.role || "Member"}</p></div></div>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /><p className="text-sm leading-relaxed text-emerald-200">Organization records and membership queries are protected by the authenticated enterprise membership boundary. Personal profile settings remain separate.</p></div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-primary" /><h2 className="font-semibold text-foreground">Team access</h2></div><Badge variant="outline">{members.length} members</Badge></div><p className="mt-2 text-sm text-muted-foreground">Review the members visible to this organization account.</p><div className="mt-5 space-y-2">{members.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No members are available.</p> : members.map(({ member, user: memberUser }) => <div key={member.userId} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{memberUser.email || `User #${member.userId}`}</p><p className="text-xs text-muted-foreground">{member.role}</p></div><Badge variant="outline">{member.status}</Badge></div>)}</div><Link href="/enterprise" className="mt-5 inline-flex"><Button variant="outline">Manage in workspace</Button></Link></section>
        </div>
      )}
    </ApplicationShell>
  );
}
