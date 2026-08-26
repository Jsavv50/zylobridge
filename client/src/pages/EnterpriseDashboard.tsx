import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BarChart3, BriefcaseBusiness, Building2, CheckCircle2, ClipboardList,
  Loader2, Plus, Send, Settings2, Users, UserRoundCheck,
} from "lucide-react";
import { VOCATION_KEYS, VOCATION_LABELS, type VocationKey } from "@shared/vocations";

type Tab = "overview" | "profile" | "team" | "projects" | "hiring" | "candidates" | "workforce";

const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: Settings2 },
  { id: "team", label: "Team", icon: Users },
  { id: "projects", label: "Projects", icon: ClipboardList },
  { id: "hiring", label: "Hiring", icon: BriefcaseBusiness },
  { id: "candidates", label: "Candidates", icon: UserRoundCheck },
  { id: "workforce", label: "Workforce", icon: CheckCircle2 },
];

const teamRoles = ["ADMIN", "HIRING_MANAGER", "RECRUITER", "PROJECT_MANAGER", "FINANCE_MANAGER", "VIEWER", "MEMBER"] as const;

const inputClass = "w-full rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none transition focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/15";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500";

export default function EnterpriseDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [profileForm, setProfileForm] = useState({ name: "", description: "", industry: "", companySize: "", website: "", businessEmail: "", businessPhone: "", location: "", operatingRegions: "" });
  const [newOrganization, setNewOrganization] = useState({ name: "", description: "", industry: "", businessEmail: "", location: "" });
  const [invite, setInvite] = useState({ email: "", role: "MEMBER" as (typeof teamRoles)[number] });
  const [project, setProject] = useState({ name: "", description: "", location: "", budget: "" });
  const [job, setJob] = useState({ title: "", description: "", vocation: "electrician", budget: "", location: "", projectId: "", status: "draft" as "draft" | "open" });
  const [verificationDocumentType, setVerificationDocumentType] = useState<"business_registration" | "tax_certificate" | "insurance_certificate" | "trade_licence" | "other">("business_registration");
  const [verificationFile, setVerificationFile] = useState<File | null>(null);

  const organizationsQuery = trpc.enterprise.myOrganizations.useQuery(undefined, { enabled: isAuthenticated });
  const organizationRows = organizationsQuery.data ?? [];

  useEffect(() => {
    if (!organizationId && organizationRows[0]?.organization.id) setOrganizationId(organizationRows[0].organization.id);
  }, [organizationId, organizationRows]);

  const activeOrganization = useMemo(
    () => organizationRows.find((row) => row.organization.id === organizationId)?.organization,
    [organizationRows, organizationId],
  );

  const enabled = Boolean(organizationId);
  const dashboardQuery = trpc.enterprise.dashboard.useQuery({ organizationId: organizationId ?? 0 }, { enabled });
  const membersQuery = trpc.enterprise.members.list.useQuery({ organizationId: organizationId ?? 0 }, { enabled: enabled && activeTab === "team" });
  const projectsQuery = trpc.enterprise.projects.list.useQuery({ organizationId: organizationId ?? 0 }, { enabled: enabled && (activeTab === "projects" || activeTab === "hiring") });
  const jobsQuery = trpc.enterprise.jobs.list.useQuery({ organizationId: organizationId ?? 0 }, { enabled: enabled && (activeTab === "hiring" || activeTab === "candidates") });
  const workforceQuery = trpc.enterprise.workforce.list.useQuery({ organizationId: organizationId ?? 0 }, { enabled: enabled && activeTab === "workforce" });
  const candidatesQuery = trpc.enterprise.candidates.listForJob.useQuery({ organizationId: organizationId ?? 0, jobId: selectedJobId ?? 0 }, { enabled: enabled && activeTab === "candidates" && Boolean(selectedJobId) });
  const verificationQuery = trpc.enterprise.verification.myRequests.useQuery({ organizationId: organizationId ?? 0 }, { enabled: enabled && activeTab === "profile" });

  useEffect(() => {
    const org = dashboardQuery.data?.organization;
    if (org) {
      setProfileForm({
        name: org.name ?? "",
        description: org.description ?? "",
        industry: org.industry ?? "",
        companySize: org.companySize ?? "",
        website: org.website ?? "",
        businessEmail: org.businessEmail ?? "",
        businessPhone: org.businessPhone ?? "",
        location: org.location ?? "",
        operatingRegions: (org.operatingRegions ?? []).join(", "),
      });
    }
  }, [dashboardQuery.data?.organization]);

  const createOrganization = trpc.enterprise.createOrganization.useMutation({
    onSuccess: async (organization) => {
      toast.success("Organization created. You are now its owner.");
      setCreateOpen(false);
      setNewOrganization({ name: "", description: "", industry: "", businessEmail: "", location: "" });
      await utils.enterprise.myOrganizations.invalidate();
      setOrganizationId(organization.id);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateOrganization = trpc.enterprise.updateOrganization.useMutation({
    onSuccess: () => { toast.success("Enterprise profile updated."); void utils.enterprise.dashboard.invalidate(); void utils.enterprise.myOrganizations.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const inviteMember = trpc.enterprise.members.invite.useMutation({
    onSuccess: (result) => { toast.success(result.emailDelivered ? "Invitation email sent." : "Invitation created; email delivery needs attention."); setInvite({ email: "", role: "MEMBER" }); void membersQuery.refetch(); },
    onError: (error) => toast.error(error.message),
  });
  const updateMember = trpc.enterprise.members.updateMember.useMutation({
    onSuccess: () => { toast.success("Team access updated."); void membersQuery.refetch(); },
    onError: (error) => toast.error(error.message),
  });
  const createProject = trpc.enterprise.projects.create.useMutation({
    onSuccess: () => { toast.success("Project created."); setProject({ name: "", description: "", location: "", budget: "" }); void projectsQuery.refetch(); void utils.enterprise.dashboard.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const createJob = trpc.enterprise.jobs.create.useMutation({
    onSuccess: () => { toast.success("Organization job saved."); setJob({ title: "", description: "", vocation: "electrician", budget: "", location: "", projectId: "", status: "draft" }); void jobsQuery.refetch(); void utils.enterprise.dashboard.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const updateCandidate = trpc.enterprise.candidates.updateStatus.useMutation({
    onSuccess: () => { toast.success("Candidate status updated."); void candidatesQuery.refetch(); void jobsQuery.refetch(); void utils.enterprise.dashboard.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const updateWorkforce = trpc.enterprise.workforce.update.useMutation({
    onSuccess: () => { toast.success("Workforce status updated."); void workforceQuery.refetch(); void utils.enterprise.dashboard.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const submitVerification = trpc.enterprise.verification.submit.useMutation({
    onSuccess: () => { toast.success("Enterprise verification document submitted for review."); setVerificationFile(null); void verificationQuery.refetch(); void utils.enterprise.dashboard.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  const submitOrganizationVerification = async () => {
    if (!verificationFile || !organizationId) return;
    if (verificationFile.size > 10 * 1024 * 1024) { toast.error("Verification documents must be 10 MB or smaller."); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Unable to read the selected document."));
      reader.readAsDataURL(verificationFile);
    });
    const [, base64 = ""] = dataUrl.split(",", 2);
    submitVerification.mutate({ organizationId, documentType: verificationDocumentType, fileBase64: base64, fileName: verificationFile.name, mimeType: verificationFile.type as "application/pdf" | "image/jpeg" | "image/png" });
  };

  if (authLoading) {
    return <div className="min-h-screen bg-[#0d1117] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>;
  }

  if (!isAuthenticated || !user) {
    return <div className="min-h-screen bg-[#0d1117] text-white"><Navbar /><main className="container mx-auto flex max-w-2xl flex-col items-center px-6 py-28 text-center"><Building2 className="mb-5 h-12 w-12 text-emerald-400" /><h1 className="text-3xl font-extrabold">Enterprise workspace access</h1><p className="mt-3 max-w-lg text-gray-400">Sign in to create an organization, manage team access, and coordinate enterprise hiring and workforce operations.</p><Link href="/sign-in"><Button className="mt-7">Sign in to continue</Button></Link></main></div>;
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />
      <main className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 rounded-2xl border border-white/8 bg-gradient-to-r from-[#131a26] to-[#15213a] p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300"><Building2 className="h-4 w-4" /> Enterprise workspace</div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{activeOrganization?.name ?? "Your organization"}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">Manage company identity, access, project delivery, candidate pipelines, and workforce assignments through a single organization boundary.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {organizationRows.length > 1 && <select aria-label="Select organization" className={`${inputClass} w-auto`} value={organizationId ?? ""} onChange={(event) => setOrganizationId(Number(event.target.value))}>{organizationRows.map((row) => <option key={row.organization.id} value={row.organization.id}>{row.organization.name}</option>)}</select>}
            <Button onClick={() => setCreateOpen(true)} className="font-semibold" style={{ background: "linear-gradient(135deg, #059669, #047857)" }}><Plus className="mr-2 h-4 w-4" /> New organization</Button>
          </div>
        </header>

        {createOpen && (
          <section className="mb-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Create organization</h2><button className="text-sm text-gray-400 hover:text-white" onClick={() => setCreateOpen(false)}>Close</button></div>
            <div className="grid gap-4 md:grid-cols-2">
              <label><span className={labelClass}>Organization name</span><input className={inputClass} value={newOrganization.name} onChange={(e) => setNewOrganization({ ...newOrganization, name: e.target.value })} /></label>
              <label><span className={labelClass}>Industry</span><input className={inputClass} value={newOrganization.industry} onChange={(e) => setNewOrganization({ ...newOrganization, industry: e.target.value })} /></label>
              <label><span className={labelClass}>Business email</span><input type="email" className={inputClass} value={newOrganization.businessEmail} onChange={(e) => setNewOrganization({ ...newOrganization, businessEmail: e.target.value })} /></label>
              <label><span className={labelClass}>Primary location</span><input className={inputClass} value={newOrganization.location} onChange={(e) => setNewOrganization({ ...newOrganization, location: e.target.value })} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Description</span><textarea className={`${inputClass} min-h-24`} value={newOrganization.description} onChange={(e) => setNewOrganization({ ...newOrganization, description: e.target.value })} /></label>
            </div>
            <Button className="mt-5" disabled={!newOrganization.name || createOrganization.isPending} onClick={() => createOrganization.mutate(newOrganization)}>{createOrganization.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create organization</Button>
          </section>
        )}

        {!organizationId && !organizationsQuery.isLoading ? (
          <section className="rounded-2xl border border-dashed border-white/15 bg-[#131a26] px-6 py-14 text-center"><Building2 className="mx-auto mb-4 h-10 w-10 text-emerald-400" /><h2 className="text-xl font-semibold">Start with your organization profile</h2><p className="mx-auto mt-2 max-w-md text-sm text-gray-400">Create an organization to unlock team access, projects, enterprise hiring, and workforce management.</p><Button className="mt-6" onClick={() => setCreateOpen(true)}>Create organization</Button></section>
        ) : (
          <>
            <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-white/8 bg-[#131a26] p-1" aria-label="Enterprise dashboard sections">
              {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${activeTab === id ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</button>)}
            </nav>

            {activeTab === "overview" && <Overview data={dashboardQuery.data} loading={dashboardQuery.isLoading} onTeam={() => setActiveTab("team")} onHiring={() => setActiveTab("hiring")} />}

            {activeTab === "profile" && (
              <div className="space-y-6"><section className="rounded-2xl border border-white/8 bg-[#131a26] p-6"><h2 className="mb-6 text-lg font-semibold">Enterprise profile</h2><div className="grid gap-4 md:grid-cols-2">
                <Field label="Organization name"><input className={inputClass} value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} /></Field>
                <Field label="Industry"><input className={inputClass} value={profileForm.industry} onChange={(e) => setProfileForm({ ...profileForm, industry: e.target.value })} /></Field>
                <Field label="Company size"><input className={inputClass} value={profileForm.companySize} onChange={(e) => setProfileForm({ ...profileForm, companySize: e.target.value })} /></Field>
                <Field label="Primary location"><input className={inputClass} value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} /></Field>
                <Field label="Business email"><input type="email" className={inputClass} value={profileForm.businessEmail} onChange={(e) => setProfileForm({ ...profileForm, businessEmail: e.target.value })} /></Field>
                <Field label="Business phone"><input className={inputClass} value={profileForm.businessPhone} onChange={(e) => setProfileForm({ ...profileForm, businessPhone: e.target.value })} /></Field>
                <Field label="Website"><input className={inputClass} value={profileForm.website} onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })} /></Field>
                <Field label="Operating regions"><input className={inputClass} placeholder="e.g. Lagos, Abuja" value={profileForm.operatingRegions} onChange={(e) => setProfileForm({ ...profileForm, operatingRegions: e.target.value })} /></Field>
                <label className="md:col-span-2"><span className={labelClass}>Organization description</span><textarea className={`${inputClass} min-h-32`} value={profileForm.description} onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })} /></label>
              </div><Button className="mt-6" disabled={updateOrganization.isPending || !profileForm.name} onClick={() => updateOrganization.mutate({ organizationId: organizationId!, ...profileForm, operatingRegions: profileForm.operatingRegions.split(",").map((item) => item.trim()).filter(Boolean) })}>{updateOrganization.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save profile</Button></section><EnterpriseVerificationPanel organization={dashboardQuery.data?.organization} requests={verificationQuery.data ?? []} documentType={verificationDocumentType} setDocumentType={setVerificationDocumentType} file={verificationFile} setFile={setVerificationFile} submitting={submitVerification.isPending} onSubmit={submitOrganizationVerification} /></div>
            )}

            {activeTab === "team" && <TeamPanel organizationId={organizationId!} members={membersQuery.data ?? []} invite={invite} setInvite={setInvite} inviting={inviteMember.isPending} onInvite={() => inviteMember.mutate({ organizationId: organizationId!, ...invite })} onUpdate={(memberId: number, values: { role?: (typeof teamRoles)[number] | "OWNER"; status?: "active" | "suspended" | "removed" }) => updateMember.mutate({ organizationId: organizationId!, memberId, ...values })} />}

            {activeTab === "projects" && <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><FormCard title="Create project"><Field label="Project name"><input className={inputClass} value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} /></Field><Field label="Location"><input className={inputClass} value={project.location} onChange={(e) => setProject({ ...project, location: e.target.value })} /></Field><Field label="Budget"><input className={inputClass} inputMode="decimal" value={project.budget} onChange={(e) => setProject({ ...project, budget: e.target.value })} /></Field><Field label="Description"><textarea className={`${inputClass} min-h-24`} value={project.description} onChange={(e) => setProject({ ...project, description: e.target.value })} /></Field><Button disabled={!project.name || createProject.isPending} onClick={() => createProject.mutate({ organizationId: organizationId!, name: project.name, description: project.description || undefined, location: project.location || undefined, budget: project.budget ? Number(project.budget) : undefined })}>Create project</Button></FormCard><ProjectList projects={projectsQuery.data ?? []} /></section>}

            {activeTab === "hiring" && <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><FormCard title="Create enterprise job"><Field label="Title"><input className={inputClass} value={job.title} onChange={(e) => setJob({ ...job, title: e.target.value })} /></Field><Field label="Vocation"><select className={inputClass} value={job.vocation} onChange={(e) => setJob({ ...job, vocation: e.target.value })}>{VOCATION_KEYS.map((key) => <option key={key} value={key}>{VOCATION_LABELS[key as VocationKey]}</option>)}</select></Field><Field label="Project"><select className={inputClass} value={job.projectId} onChange={(e) => setJob({ ...job, projectId: e.target.value })}><option value="">Unassigned project</option>{(projectsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Budget"><input className={inputClass} inputMode="decimal" value={job.budget} onChange={(e) => setJob({ ...job, budget: e.target.value })} /></Field><Field label="Location"><input className={inputClass} value={job.location} onChange={(e) => setJob({ ...job, location: e.target.value })} /></Field><Field label="Publish state"><select className={inputClass} value={job.status} onChange={(e) => setJob({ ...job, status: e.target.value as "draft" | "open" })}><option value="draft">Draft</option><option value="open">Open</option></select></Field><Field label="Description"><textarea className={`${inputClass} min-h-24`} value={job.description} onChange={(e) => setJob({ ...job, description: e.target.value })} /></Field><Button disabled={!job.title || !job.description || !job.budget || !job.location || createJob.isPending} onClick={() => createJob.mutate({ organizationId: organizationId!, title: job.title, description: job.description, vocation: job.vocation, budget: Number(job.budget), location: job.location, projectId: job.projectId ? Number(job.projectId) : undefined, status: job.status })}>Save job</Button></FormCard><JobList jobs={jobsQuery.data ?? []} /></section>}

            {activeTab === "candidates" && <CandidatePanel jobs={jobsQuery.data ?? []} selectedJobId={selectedJobId} setSelectedJobId={setSelectedJobId} candidates={candidatesQuery.data ?? []} onUpdate={(applicationId: number, status: "under_review" | "shortlisted" | "interview" | "accepted" | "hired" | "rejected") => updateCandidate.mutate({ organizationId: organizationId!, applicationId, status })} />}

            {activeTab === "workforce" && <WorkforcePanel workforce={workforceQuery.data ?? []} onUpdate={(assignmentId: number, status: "assigned" | "active" | "completed" | "removed") => updateWorkforce.mutate({ organizationId: organizationId!, assignmentId, status })} />}
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className={labelClass}>{label}</span>{children}</label>; }
function FormCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="space-y-4 rounded-2xl border border-white/8 bg-[#131a26] p-6"><h2 className="text-lg font-semibold">{title}</h2>{children}</section>; }
function EnterpriseVerificationPanel({ organization, requests, documentType, setDocumentType, file, setFile, submitting, onSubmit }: any) {
  return <section className="rounded-2xl border border-white/8 bg-[#131a26] p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-semibold">Enterprise verification</h2><p className="mt-1 max-w-2xl text-sm text-gray-400">Submit a company registration, tax, insurance, or trade document for review. Documents are private and can only be opened through authorized, short-lived access links.</p></div><span className={`h-fit rounded-full px-2.5 py-1 text-xs font-medium capitalize ${organization?.verificationStatus === "approved" ? "bg-emerald-500/10 text-emerald-300" : organization?.verificationStatus === "rejected" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"}`}>{organization?.verificationStatus ?? "pending"}</span></div><div className="mt-5 grid gap-4 md:grid-cols-[0.7fr_1.3fr_auto]"><Field label="Document type"><select className={inputClass} value={documentType} onChange={(e) => setDocumentType(e.target.value)}><option value="business_registration">Business registration</option><option value="tax_certificate">Tax certificate</option><option value="insurance_certificate">Insurance certificate</option><option value="trade_licence">Trade licence</option><option value="other">Other</option></select></Field><Field label="Document (PDF, JPG, or PNG; max 10 MB)"><input className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-violet-500/15 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-violet-200`} type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field><div className="flex items-end"><Button disabled={!file || submitting} onClick={onSubmit}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit</Button></div></div>{organization?.verificationNote && <p className="mt-4 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-gray-300">Review note: {organization.verificationNote}</p>}<div className="mt-5 border-t border-white/8 pt-4"><p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Submission history</p><div className="space-y-2">{requests.map((request: any) => <div key={request.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm"><span className="capitalize text-gray-300">{request.documentType.replace(/_/g, " ")}</span><span className="text-xs text-gray-500">{request.status} · {new Date(request.createdAt).toLocaleDateString()}</span></div>)}{requests.length === 0 && <p className="text-sm text-gray-500">No enterprise verification documents have been submitted.</p>}</div></div></section>;
}

function Overview({ data, loading, onTeam, onHiring }: { data: any; loading: boolean; onTeam: () => void; onHiring: () => void }) {
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>;
  const metrics = data?.metrics;
  return <section className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[
    ["Active members", metrics?.activeMembers ?? 0, Users], ["Open jobs", metrics?.openJobs ?? 0, BriefcaseBusiness], ["Active projects", metrics?.activeProjects ?? 0, ClipboardList], ["Workforce", metrics?.activeWorkforce ?? 0, UserRoundCheck], ["Pending invites", metrics?.pendingInvitations ?? 0, Send],
  ].map(([label, value, Icon]: any) => <article key={label} className="rounded-2xl border border-white/8 bg-[#131a26] p-5"><Icon className="mb-3 h-5 w-5 text-violet-300" /><p className="text-2xl font-extrabold">{value}</p><p className="mt-1 text-xs text-gray-500">{label}</p></article>)}</div><div className="grid gap-6 lg:grid-cols-2"><article className="rounded-2xl border border-white/8 bg-[#131a26] p-6"><h2 className="text-lg font-semibold">Organization readiness</h2><p className="mt-2 text-sm text-gray-400">Verification status: <span className="font-medium capitalize text-white">{data?.organization?.verificationStatus ?? "pending"}</span></p><p className="mt-1 text-sm text-gray-400">Complete the enterprise profile, invite accountable team members, and create projects before publishing workforce requirements.</p><Button variant="outline" className="mt-5 border-white/10" onClick={onTeam}>Manage team</Button></article><article className="rounded-2xl border border-white/8 bg-[#131a26] p-6"><h2 className="text-lg font-semibold">Hiring pipeline</h2><p className="mt-2 text-sm text-gray-400">Create an organization job, review applications, and move selected candidates through the structured pipeline to workforce assignment.</p><Button className="mt-5" onClick={onHiring}>Create a job</Button></article></div></section>;
}

function TeamPanel({ organizationId, members, invite, setInvite, inviting, onInvite, onUpdate }: any) { return <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><FormCard title="Invite a team member"><Field label="Email"><input type="email" className={inputClass} value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></Field><Field label="Organization role"><select className={inputClass} value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>{teamRoles.map((role) => <option key={role} value={role}>{role.replace(/_/g, " ")}</option>)}</select></Field><Button disabled={!invite.email || inviting} onClick={onInvite}>{inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send invitation</Button><p className="text-xs leading-relaxed text-gray-500">Invitation links are bound to the invited email address and expire after seven days.</p></FormCard><section className="overflow-hidden rounded-2xl border border-white/8 bg-[#131a26]"><div className="border-b border-white/8 px-6 py-4"><h2 className="font-semibold">Team access</h2></div><div className="divide-y divide-white/6">{members.map((entry: any) => <div key={entry.member.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-white">{entry.user.name || entry.user.email || `User #${entry.user.id}`}</p><p className="text-xs text-gray-500">{entry.user.email || "No email available"}</p></div><div className="flex items-center gap-2"><select className="rounded-lg border border-white/10 bg-[#0d1117] px-2 py-1.5 text-xs" value={entry.member.role} disabled={entry.member.role === "OWNER"} onChange={(e) => onUpdate(entry.member.id, { role: e.target.value })}>{["OWNER", ...teamRoles].filter((role, index, values) => values.indexOf(role) === index).map((role) => <option key={role} value={role}>{role.replace(/_/g, " ")}</option>)}</select><span className={`rounded-full px-2 py-1 text-xs ${entry.member.status === "active" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{entry.member.status}</span>{entry.member.role !== "OWNER" && <Button variant="ghost" size="sm" onClick={() => onUpdate(entry.member.id, { status: entry.member.status === "active" ? "suspended" : "active" })}>{entry.member.status === "active" ? "Suspend" : "Activate"}</Button>}</div></div>)}{members.length === 0 && <p className="px-6 py-10 text-sm text-gray-500">No team members have joined yet.</p>}</div></section></section>; }
function ProjectList({ projects }: { projects: any[] }) { return <section className="rounded-2xl border border-white/8 bg-[#131a26]"><div className="border-b border-white/8 px-6 py-4"><h2 className="font-semibold">Projects</h2></div><div className="divide-y divide-white/6">{projects.map((item) => <article key={item.id} className="px-6 py-4"><div className="flex justify-between gap-4"><div><h3 className="font-medium">{item.name}</h3><p className="mt-1 text-sm text-gray-400">{item.description || "No project description."}</p></div><span className="h-fit rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">{item.status}</span></div><p className="mt-2 text-xs text-gray-500">{item.location || "Location not set"}{item.budget ? ` · ₦${Number(item.budget).toLocaleString()}` : ""}</p></article>)}{projects.length === 0 && <p className="px-6 py-10 text-sm text-gray-500">Create a project to organize enterprise work.</p>}</div></section>; }
function JobList({ jobs }: { jobs: any[] }) { return <section className="rounded-2xl border border-white/8 bg-[#131a26]"><div className="border-b border-white/8 px-6 py-4"><h2 className="font-semibold">Organization jobs</h2></div><div className="divide-y divide-white/6">{jobs.map((item) => <article key={item.id} className="px-6 py-4"><div className="flex justify-between gap-4"><div><h3 className="font-medium">{item.title}</h3><p className="mt-1 text-sm text-gray-400">{VOCATION_LABELS[item.vocation as VocationKey] ?? item.vocation} · {item.location}</p></div><span className={`h-fit rounded-full px-2 py-1 text-xs ${item.status === "open" ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-gray-400"}`}>{item.status}</span></div><p className="mt-2 text-xs text-gray-500">₦{Number(item.budget).toLocaleString()}</p></article>)}{jobs.length === 0 && <p className="px-6 py-10 text-sm text-gray-500">No enterprise jobs have been created.</p>}</div></section>; }
function CandidatePanel({ jobs, selectedJobId, setSelectedJobId, candidates, onUpdate }: any) { return <section className="space-y-6"><div className="rounded-2xl border border-white/8 bg-[#131a26] p-5"><label className={labelClass}>Job candidate pipeline</label><select className={inputClass} value={selectedJobId ?? ""} onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : null)}><option value="">Select a job</option>{jobs.map((job: any) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></div>{selectedJobId && <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#131a26]"><div className="border-b border-white/8 px-6 py-4"><h2 className="font-semibold">Candidates</h2></div><div className="divide-y divide-white/6">{candidates.map((candidate: any) => <article key={candidate.id} className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">Professional #{candidate.professionalId}</p><p className="mt-1 max-w-2xl text-sm text-gray-400">{candidate.coverLetter}</p><p className="mt-2 text-xs text-gray-500">Bid: ₦{Number(candidate.bidAmount).toLocaleString()}</p></div><div className="flex flex-wrap gap-2">{["under_review", "shortlisted", "interview", "rejected", "hired"].map((status) => <Button key={status} size="sm" variant={candidate.status === status ? "default" : "outline"} className="capitalize" onClick={() => onUpdate(candidate.id, status)}>{status.replace(/_/g, " ")}</Button>)}</div></article>)}{candidates.length === 0 && <p className="px-6 py-10 text-sm text-gray-500">No applications have been received for this job.</p>}</div></section>}</section>; }
function WorkforcePanel({ workforce, onUpdate }: any) { return <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#131a26]"><div className="border-b border-white/8 px-6 py-4"><h2 className="font-semibold">Workforce assignments</h2></div><div className="divide-y divide-white/6">{workforce.map((entry: any) => <article key={entry.assignment.id} className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{entry.user.name || `Professional #${entry.user.id}`}</p><p className="mt-1 text-sm text-gray-400">{entry.profile?.vocation ? VOCATION_LABELS[entry.profile.vocation as VocationKey] ?? entry.profile.vocation : "Professional profile pending"}</p></div><select className="rounded-lg border border-white/10 bg-[#0d1117] px-2 py-1.5 text-sm" value={entry.assignment.status} onChange={(e) => onUpdate(entry.assignment.id, e.target.value)}>{["assigned", "active", "completed", "removed"].map((status) => <option key={status} value={status}>{status}</option>)}</select></article>)}{workforce.length === 0 && <p className="px-6 py-10 text-sm text-gray-500">Professionals hired through enterprise jobs will appear here.</p>}</div></section>; }
