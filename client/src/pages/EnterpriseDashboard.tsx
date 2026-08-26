import { useEffect, useMemo, useState } from "react";
import { Bell, BriefcaseBusiness, Building2, CheckCircle2, Compass, CreditCard, FolderKanban, LockKeyhole, MailPlus, MessageSquare, MoreHorizontal, Search, ShieldCheck, Star, Trash2, UserRound, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const workspaceCapabilities = [
  { icon: Compass, title: "Marketplace access", description: "Review the public marketplace and source qualified professionals for your organization.", href: "/marketplace", action: "Browse marketplace" },
  { icon: Search, title: "Find talent", description: "Search professional profiles by vocation, availability, verification, and experience.", href: "/talent", action: "Browse talent" },
  { icon: BriefcaseBusiness, title: "Job postings", description: "Publish and manage opportunities for your enterprise hiring workflow.", href: "/employer/jobs", action: "Manage postings" },
  { icon: MessageSquare, title: "Messages", description: "Keep project and candidate conversations in one documented workspace.", href: "/messages", action: "Open messages" },
  { icon: CreditCard, title: "Escrow and funding", description: "Review supported payment milestones and funding workflows without leaving the workspace.", href: "/payments", action: "Review payments" },
  { icon: Bell, title: "Notifications", description: "Review account, hiring, project, verification, and marketplace activity.", href: "/notifications", action: "View notifications" },
];

type MarketplaceSummary = {
  activeProfessionals: number;
  openJobs: number;
  verifiedProfessionals: number;
  totalReviews: number;
  averageRating: number;
  reviews: Array<{ rating: number; comment: string | null; createdAt: string | Date }>;
};

function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(Math.max(0, Math.min(5, rating)));
  return <div className="flex gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
    {Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < filled ? "fill-amber-400 text-amber-400" : "text-gray-600"}`} />)}
  </div>;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function EnterpriseDashboard() {
  const { user, isAuthenticated } = useAuth();
  const isEnterprise = user?.userType === "enterprise";
  const utils = trpc.useUtils();
  const { data: marketplaceSummary } = trpc.publicSummary.useQuery(undefined, { enabled: isEnterprise, staleTime: 60_000 });
  const { data: workspace, isLoading: workspaceLoading } = trpc.enterprise.overview.useQuery(undefined, { enabled: isEnterprise });
  const organizations = workspace?.organizations ?? [];
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(null);
  const selectedOrganization = useMemo(
    () => organizations.find(({ organization }) => organization.id === selectedOrganizationId)?.organization ?? organizations[0]?.organization,
    [organizations, selectedOrganizationId],
  );
  const organizationId = selectedOrganization?.id ?? null;
  const selectedMembership = organizations.find(({ organization }) => organization.id === organizationId)?.membership;
  const canManage = selectedMembership?.role === "OWNER" || selectedMembership?.role === "ADMIN";

  const { data: members, isLoading: membersLoading } = trpc.enterprise.members.useQuery(
    { organizationId: organizationId ?? 0 },
    { enabled: Boolean(organizationId) },
  );
  const { data: invitations, isLoading: invitationsLoading } = trpc.enterprise.invitations.useQuery(
    { organizationId: organizationId ?? 0 },
    { enabled: Boolean(organizationId && canManage) },
  );
  const { data: projects, isLoading: projectsLoading } = trpc.enterprise.projects.useQuery(
    { organizationId: organizationId ?? 0 },
    { enabled: Boolean(organizationId) },
  );

  const [organizationName, setOrganizationName] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  useEffect(() => {
    if (!selectedOrganizationId && organizations[0]?.organization.id) setSelectedOrganizationId(organizations[0].organization.id);
  }, [organizations, selectedOrganizationId]);

  const createOrganization = trpc.enterprise.createOrganization.useMutation({
    onSuccess: async () => {
      toast.success("Organization workspace created.");
      setOrganizationName("");
      setOrganizationDescription("");
      await utils.enterprise.overview.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const inviteMember = trpc.enterprise.invite.useMutation({
    onSuccess: async () => {
      toast.success("Invitation sent securely.");
      setInviteEmail("");
      await utils.enterprise.invitations.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const cancelInvitation = trpc.enterprise.cancelInvitation.useMutation({
    onSuccess: async () => {
      toast.success("Invitation cancelled.");
      await utils.enterprise.invitations.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const updateMemberRole = trpc.enterprise.updateMemberRole.useMutation({
    onSuccess: async () => {
      toast.success("Member role updated.");
      await utils.enterprise.members.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const removeMember = trpc.enterprise.removeMember.useMutation({
    onSuccess: async () => {
      toast.success("Member removed from the organization.");
      await utils.enterprise.members.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const createProject = trpc.enterprise.createProject.useMutation({
    onSuccess: async () => {
      toast.success("Project workspace created.");
      setProjectName("");
      setProjectDescription("");
      await utils.enterprise.projects.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-gray-400">Please sign in to access your workspace.</div>;
  }
  if (!isEnterprise) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4 px-4 text-center text-white">
        <LockKeyhole className="h-8 w-8 text-amber-400" />
        <div><h1 className="text-xl font-bold">Enterprise workspace access required</h1><p className="mt-2 text-sm text-gray-400">This dashboard is available only to Enterprise accounts.</p></div>
        <Link href="/onboarding"><Button variant="outline" className="border-white/10 bg-transparent text-gray-300">Review account setup</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />
      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="rounded-3xl border border-amber-500/20 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.16),transparent_58%),linear-gradient(135deg,#171225,#101827)] p-6 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10"><Building2 className="h-6 w-6 text-amber-300" /></div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Enterprise workspace</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Welcome, {user.name || "Enterprise member"}</h1>
              <p className="mt-3 leading-relaxed text-gray-300">Source talent, coordinate projects, and manage your organization from one role-safe workspace. Enterprise permissions are isolated from Professional and Contractor capabilities.</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Workspace active</span></div>
          </div>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Enterprise capabilities">
          {workspaceCapabilities.map(({ icon: Icon, title, description, href, action }) => <article key={title} className="rounded-2xl border border-white/10 bg-[#131a26] p-6"><Icon className="h-5 w-5 text-amber-300" /><h2 className="mt-4 text-lg font-bold">{title}</h2><p className="mt-2 min-h-12 text-sm leading-relaxed text-gray-400">{description}</p><Link href={href} className="mt-5 inline-flex"><Button variant="outline" size="sm" className="border-amber-500/25 bg-transparent text-amber-200 hover:bg-amber-500/10 hover:text-white">{action}</Button></Link></article>)}
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#131a26] p-6" aria-labelledby="marketplace-snapshot-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Marketplace snapshot</p><h2 id="marketplace-snapshot-heading" className="mt-2 text-2xl font-bold">Verified activity and reputation</h2><p className="mt-1 max-w-2xl text-sm text-gray-400">Live counts and ratings from persisted ZYLOBRIDGE records. No review or activity figures are estimated.</p></div><Link href="/talent" className="text-sm text-amber-200 hover:text-white">Explore talent →</Link></div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">{[
            { label: "Active professionals", value: marketplaceSummary?.activeProfessionals },
            { label: "Open jobs", value: marketplaceSummary?.openJobs },
            { label: "Verified professionals", value: marketplaceSummary?.verifiedProfessionals },
            { label: "Published reviews", value: marketplaceSummary?.totalReviews },
          ].map(({ label, value }) => <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-2xl font-bold text-white">{value ?? "—"}</p><p className="mt-1 text-xs leading-5 text-gray-500">{label}</p></div>)}<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-2xl font-bold text-white">{marketplaceSummary && marketplaceSummary.totalReviews > 0 ? marketplaceSummary.averageRating.toFixed(1) : "—"}</p><div className="mt-1">{marketplaceSummary && marketplaceSummary.totalReviews > 0 ? <StarRating rating={marketplaceSummary.averageRating} /> : <p className="text-xs leading-5 text-gray-500">No ratings yet</p>}</div><p className="mt-1 text-xs leading-5 text-gray-500">Average rating</p></div></div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">{marketplaceSummary?.reviews.length ? marketplaceSummary.reviews.slice(0, 3).map((review, index) => <article key={`${review.createdAt}-${index}`} className="rounded-xl border border-white/10 bg-black/10 p-4"><div className="flex items-center justify-between gap-3"><span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Published review</span><StarRating rating={review.rating} /></div><p className="mt-3 line-clamp-4 text-sm leading-6 text-gray-300">{review.comment}</p><p className="mt-3 text-xs text-gray-500">Completed-work review · {new Date(review.createdAt).toLocaleDateString()}</p></article>) : <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-gray-500 md:col-span-3">{marketplaceSummary ? "No reviews have been published yet. Completed-work reviews will appear here when participants share them." : "Loading verified marketplace activity…"}</div>}</div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#131a26] p-6" aria-labelledby="organization-heading">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Organization control plane</p><h2 id="organization-heading" className="mt-2 text-2xl font-bold">Your organizations</h2><p className="mt-1 text-sm text-gray-400">Create a controlled workspace, delegate team access, and separate projects without duplicating user accounts.</p></div><Badge variant="outline" className="border-amber-400/30 text-amber-200">{organizations.length} active</Badge></div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-3">{workspaceLoading ? <div className="rounded-xl border border-white/10 p-4 text-sm text-gray-400">Loading organizations…</div> : organizations.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-gray-400">No organization exists yet. Create your first workspace to unlock team controls.</div> : organizations.map(({ organization, membership }) => <button type="button" key={organization.id} onClick={() => setSelectedOrganizationId(organization.id)} className={`w-full rounded-xl border p-4 text-left transition ${organization.id === organizationId ? "border-amber-400/50 bg-amber-400/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{organization.name}</p><p className="mt-1 text-xs text-gray-400">{organization.description || "No description added"}</p></div><Badge variant="outline" className="border-white/15 text-gray-300">{membership.role}</Badge></div></button>)}</div>
            <form className="rounded-xl border border-white/10 bg-black/10 p-5" onSubmit={event => { event.preventDefault(); if (!organizationName.trim()) return toast.error("Organization name is required."); createOrganization.mutate({ name: organizationName, description: organizationDescription || undefined }); }}><div className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-amber-300" /> Create an organization</div><Input className="mt-4 border-white/10 bg-white/[0.03]" placeholder="Organization name" value={organizationName} onChange={event => setOrganizationName(event.target.value)} maxLength={255} /><Textarea className="mt-3 border-white/10 bg-white/[0.03]" placeholder="Purpose and operating context (optional)" value={organizationDescription} onChange={event => setOrganizationDescription(event.target.value)} maxLength={2000} /><Button type="submit" className="mt-4 bg-amber-500 text-black hover:bg-amber-400" disabled={createOrganization.isPending}>{createOrganization.isPending ? "Creating…" : "Create workspace"}</Button></form>
          </div>
        </section>

        {organizationId && <>
          <section className="mt-8 grid gap-6 lg:grid-cols-2" aria-label="Team and invitations">
            <div className="rounded-2xl border border-white/10 bg-[#131a26] p-6"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-amber-300" /><h2 className="text-xl font-bold">Team members</h2></div><p className="mt-1 text-sm text-gray-400">Role-scoped access for {selectedOrganization?.name}.</p></div><Badge variant="outline" className="border-white/15 text-gray-300">{members?.length ?? 0}</Badge></div><div className="mt-5 space-y-3">{membersLoading ? <p className="text-sm text-gray-400">Loading team…</p> : members?.length ? members.map(({ member, user: memberUser }) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{memberUser.name || memberUser.email || "Member"}</p><p className="truncate text-xs text-gray-500">{memberUser.email || "No email"}</p></div><div className="flex items-center gap-2">{canManage && member.role !== "OWNER" && <select aria-label={`Role for ${memberUser.name || memberUser.email || "member"}`} className="rounded-md border border-white/10 bg-[#0d1117] px-2 py-1 text-xs text-gray-300" value={member.role} onChange={event => updateMemberRole.mutate({ organizationId, userId: member.userId, role: event.target.value as "ADMIN" | "HIRING_MANAGER" | "RECRUITER" | "MEMBER" })}><option value="ADMIN">Admin</option><option value="HIRING_MANAGER">Hiring manager</option><option value="RECRUITER">Recruiter</option><option value="MEMBER">Member</option></select>}{canManage && member.role !== "OWNER" && <Button variant="ghost" size="icon" aria-label="Remove member" className="text-gray-500 hover:text-red-300" onClick={() => removeMember.mutate({ organizationId, userId: member.userId })}><Trash2 className="h-4 w-4" /></Button>}<Badge variant="outline" className="border-white/15 text-gray-300">{member.role}</Badge></div></div>) : <p className="text-sm text-gray-400">No active members yet.</p>}</div></div>
            <div className="rounded-2xl border border-white/10 bg-[#131a26] p-6"><div className="flex items-center gap-2"><MailPlus className="h-5 w-5 text-amber-300" /><h2 className="text-xl font-bold">Invite a teammate</h2></div><p className="mt-1 text-sm text-gray-400">Invitation tokens are hashed at rest and bound to the recipient’s email after sign-in.</p>{canManage ? <form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); if (!inviteEmail.trim()) return toast.error("Email is required."); inviteMember.mutate({ organizationId, email: inviteEmail, role: inviteRole as "ADMIN" | "HIRING_MANAGER" | "RECRUITER" | "MEMBER", origin: window.location.origin }); }}><Input type="email" className="border-white/10 bg-white/[0.03]" placeholder="teammate@company.com" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} /><select className="w-full rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-gray-300" value={inviteRole} onChange={event => setInviteRole(event.target.value)}><option value="MEMBER">Member</option><option value="RECRUITER">Recruiter</option><option value="HIRING_MANAGER">Hiring manager</option><option value="ADMIN">Admin</option></select><Button type="submit" className="bg-amber-500 text-black hover:bg-amber-400" disabled={inviteMember.isPending}>{inviteMember.isPending ? "Sending…" : "Send invitation"}</Button></form> : <div className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-gray-400">Only organization owners and administrators can invite or remove members.</div>}{canManage && <div className="mt-6 border-t border-white/10 pt-5"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Pending invitations</p><Badge variant="outline" className="border-white/15 text-gray-300">{invitations?.filter(invitation => invitation.status === "pending").length ?? 0}</Badge></div>{invitationsLoading ? <p className="text-xs text-gray-500">Loading invitations…</p> : invitations?.filter(invitation => invitation.status === "pending").length ? <div className="space-y-2">{invitations.filter(invitation => invitation.status === "pending").map(invitation => <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3 text-xs"><div><p className="text-gray-200">{invitation.email}</p><p className="mt-1 text-gray-500">{invitation.role} · expires {formatDate(invitation.expiresAt)}</p></div><Button variant="ghost" size="icon" aria-label="Cancel invitation" className="text-gray-500 hover:text-red-300" onClick={() => cancelInvitation.mutate({ organizationId, invitationId: invitation.id })}><Trash2 className="h-4 w-4" /></Button></div>)}</div> : <p className="text-xs text-gray-500">No pending invitations.</p>}</div>}</div>
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-[#131a26] p-6" aria-labelledby="projects-heading"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2"><FolderKanban className="h-5 w-5 text-amber-300" /><h2 id="projects-heading" className="text-xl font-bold">Project workspaces</h2></div><p className="mt-1 text-sm text-gray-400">Separate initiatives and associate future marketplace jobs with the right organization context.</p></div><Badge variant="outline" className="border-white/15 text-gray-300">{projects?.length ?? 0} projects</Badge></div><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]"><form className="rounded-xl border border-white/10 p-4" onSubmit={event => { event.preventDefault(); if (!projectName.trim()) return toast.error("Project name is required."); createProject.mutate({ organizationId, name: projectName, description: projectDescription || undefined }); }}><Input className="border-white/10 bg-white/[0.03]" placeholder="Project name" value={projectName} onChange={event => setProjectName(event.target.value)} /><Textarea className="mt-3 border-white/10 bg-white/[0.03]" placeholder="Project description (optional)" value={projectDescription} onChange={event => setProjectDescription(event.target.value)} maxLength={2000} /><Button type="submit" className="mt-3 bg-amber-500 text-black hover:bg-amber-400" disabled={createProject.isPending || !["OWNER", "ADMIN", "HIRING_MANAGER"].includes(selectedMembership?.role ?? "")}>{createProject.isPending ? "Creating…" : "Create project"}</Button></form><div className="space-y-3">{projectsLoading ? <p className="text-sm text-gray-400">Loading projects…</p> : projects?.length ? projects.map(project => <div key={project.id} className="rounded-xl border border-white/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{project.name}</p><p className="mt-1 text-sm text-gray-400">{project.description || "No description added"}</p></div><Badge variant="outline" className="border-emerald-400/20 text-emerald-200">{project.status}</Badge></div><p className="mt-3 text-xs text-gray-500">Created {formatDate(project.createdAt)}</p></div>) : <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-gray-400">No project workspaces yet.</div>}</div></div></section>
        </>}

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#131a26] p-6"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h2 className="text-lg font-bold">Security boundary</h2></div><p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">Enterprise organization actions are protected by the existing authenticated session, organization membership checks, role-scoped procedures, hashed invitation tokens, recipient email matching, audit entries, and bounded list queries. Professional and Contractor permissions remain unchanged.</p></section>
      </main>
    </div>
  );
}
