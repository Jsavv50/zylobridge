import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  HardHat,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import VocationSelector from "@/components/VocationSelector";
import { ZylobridgeLogo } from "@/components/ZylobridgeLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { resolveRoleDashboard, type OnboardingDraft } from "@shared/onboarding";

type Role = NonNullable<OnboardingDraft["primaryRole"]>;

const roleOptions: Array<{
  value: Role;
  title: string;
  description: string;
  promise: string;
  icon: typeof HardHat;
  accent: string;
}> = [
  {
    value: "client",
    title: "Contractor / Client",
    description: "Hire verified professionals, compare candidates, fund protected work, and manage delivery.",
    promise: "Build a dependable hiring workspace",
    icon: BriefcaseBusiness,
    accent: "violet",
  },
  {
    value: "professional",
    title: "Skilled Professional",
    description: "Discover relevant jobs, present your expertise, manage active work, and grow your reputation.",
    promise: "Turn your trade into a stronger career",
    icon: HardHat,
    accent: "cyan",
  },
  {
    value: "enterprise",
    title: "Enterprise",
    description: "Create an organization workspace for hiring, procurement, governance, and team collaboration.",
    promise: "Coordinate work at organization scale",
    icon: Building2,
    accent: "amber",
  },
];

const steps = [
  { number: 1, label: "Your goal" },
  { number: 2, label: "Workspace setup" },
  { number: 3, label: "Trust & preferences" },
  { number: 4, label: "Review" },
];

const hiringNeeds = ["Electrical", "Plumbing", "Construction", "Solar & energy", "Facilities", "Logistics", "Safety", "Technology"];
const serviceNeeds = ["Skilled hiring", "Contractor sourcing", "Facilities", "Field services", "Procurement", "Project delivery"];

function commaList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function selectionButton(active: boolean) {
  return `rounded-xl border px-3 py-2 text-left text-sm transition ${active
    ? "border-violet-400 bg-violet-500/15 text-white shadow-[0_0_0_1px_rgba(167,139,250,.2)]"
    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.06]"}`;
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return <label className="mb-2 block text-sm font-medium text-slate-200">{children}{optional ? <span className="ml-2 text-xs font-normal text-slate-500">Optional</span> : null}</label>;
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const profileMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "profile";
  const signInNext = profileMode ? "/onboarding?mode=profile" : "/onboarding";
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [step, setStep] = useState(1);
  const [revision, setRevision] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "offline">("saved");
  const lastSavedRef = useRef("");
  const lastAttemptRef = useRef("");
  const revisionRef = useRef(0);

  const onboarding = trpc.onboarding.state.useQuery(undefined, {
    enabled: Boolean(user),
    staleTime: 15_000,
    retry: 1,
  });

  const saveProgress = trpc.onboarding.saveStep.useMutation({
    onSuccess: (result, variables) => {
      setRevision(result.revision);
      revisionRef.current = result.revision;
      lastSavedRef.current = JSON.stringify({ draft: variables.patch, step: variables.currentStep });
      lastAttemptRef.current = lastSavedRef.current;
      setSaveState("saved");
      if (typeof window !== "undefined") window.localStorage.removeItem("zylo-onboarding-draft");
    },
    onError: (error) => {
      setSaveState("offline");
      toast.error(error.data?.code === "CONFLICT" ? "Your progress changed elsewhere. Refresh to use the latest version." : "Progress is saved on this device. We’ll retry when you continue.");
    },
  });

  const complete = trpc.onboarding.complete.useMutation({
    onSuccess: async (result, variables) => {
      await Promise.all([utils.auth.me.invalidate(), utils.onboarding.state.invalidate()]);
      toast.success(profileMode ? "Profile updates saved" : "Your ZYLOBRIDGE workspace is ready");
      navigate(variables.patch.trust?.verificationIntent === "now" ? "/verification" : result.destination);
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin" || user.role === "SUPER_ADMIN") {
      navigate("/dashboard/admin");
    }
  }, [navigate, user]);

  useEffect(() => {
    const state = onboarding.data;
    if (!state || hydrated) return;
    if (state.status === "completed" && !profileMode) {
      navigate(state.destination);
      return;
    }
    const local = typeof window !== "undefined" ? window.localStorage.getItem("zylo-onboarding-draft") : null;
    let initialDraft = state.draft;
    let initialStep = profileMode ? 1 : state.currentStep;
    if (local && state.status !== "completed") {
      try {
        const parsed = JSON.parse(local) as { draft?: OnboardingDraft; step?: number };
        if (parsed.draft) initialDraft = { ...initialDraft, ...parsed.draft };
        if (parsed.step) initialStep = Math.max(1, Math.min(4, parsed.step));
      } catch {
        window.localStorage.removeItem("zylo-onboarding-draft");
      }
    }
    setDraft(initialDraft);
    setStep(initialStep);
    setRevision(state.revision);
    revisionRef.current = state.revision;
    lastSavedRef.current = JSON.stringify({ draft: initialDraft, step: initialStep });
    lastAttemptRef.current = lastSavedRef.current;
    setHydrated(true);
  }, [hydrated, navigate, onboarding.data, profileMode]);

  useEffect(() => {
    if (!hydrated || !user || saveProgress.isPending || complete.isPending) return;
    const serialized = JSON.stringify({ draft, step });
    if (serialized === lastSavedRef.current || serialized === lastAttemptRef.current) return;
    window.localStorage.setItem("zylo-onboarding-draft", serialized);
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      lastAttemptRef.current = serialized;
      saveProgress.mutate({ currentStep: step, expectedRevision: revisionRef.current, patch: draft, profileMode });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [complete.isPending, draft, hydrated, profileMode, saveProgress, saveProgress.isPending, step, user]);

  const role = draft.primaryRole;
  const selectedRole = roleOptions.find((option) => option.value === role);
  const progress = onboarding.data?.status === "completed" && profileMode ? Math.max(25, step * 25) : Math.max(onboarding.data?.progress ?? 0, step * 25);
  const roleLocked = Boolean(profileMode && user?.userType && user.userType !== "unset");

  const recommendations = useMemo(() => {
    if (role === "professional") return ["Complete your public profile", "Review recommended jobs", "Prepare verification documents"];
    if (role === "enterprise") return ["Invite authorized team members", "Define hiring and procurement needs", "Create your first organization project"];
    return ["Post a clear job brief", "Review matched professionals", "Fund only after candidate acceptance"];
  }, [role]);

  const update = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateNested = <K extends "identity" | "contractor" | "professional" | "enterprise" | "trust">(key: K, value: Partial<NonNullable<OnboardingDraft[K]>>) => {
    setDraft((current) => ({ ...current, [key]: { ...(current[key] as object ?? {}), ...value } }));
  };

  const canContinue = (() => {
    if (step === 1) return Boolean(role && draft.identity?.name?.trim());
    if (step === 2 && role === "professional") return Boolean(draft.professional?.vocation);
    if (step === 2 && role === "enterprise") return Boolean(draft.enterprise?.organizationName?.trim());
    return true;
  })();

  const persistAndMove = async (nextStep: number) => {
    if (!canContinue) {
      toast.error(step === 1 ? "Choose your workspace and add your name." : "Complete the required workspace field before continuing.");
      return;
    }
    try {
      const result = await saveProgress.mutateAsync({ currentStep: nextStep, expectedRevision: revisionRef.current, patch: draft, profileMode });
      revisionRef.current = result.revision;
      setRevision(result.revision);
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // Mutation callbacks provide the safe recovery message.
    }
  };

  const finish = () => complete.mutate({ expectedRevision: revisionRef.current, patch: draft, profileMode });

  useEffect(() => {
    if (authLoading || user) return;
    navigate(`/sign-in?next=${encodeURIComponent(signInNext)}`, { replace: true });
  }, [authLoading, navigate, signInNext, user]);

  if (authLoading || !user || onboarding.isLoading || (onboarding.data && !hydrated)) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white">
        <Navbar />
        <main className="mx-auto flex min-h-[78vh] max-w-6xl items-center justify-center px-4">
          <div className="w-full max-w-3xl space-y-5" aria-label="Loading onboarding">
            <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
          </div>
        </main>
      </div>
    );
  }

  if (onboarding.isError) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white">
        <Navbar />
        <main className="mx-auto flex min-h-[72vh] max-w-lg items-center px-4 text-center">
          <div className="w-full rounded-3xl border border-rose-400/20 bg-[#101827] p-8 shadow-2xl">
            <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-rose-300" />
            <h1 className="text-2xl font-bold">We couldn’t reach your setup</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">Your account is safe. Retry the secure connection or return to your dashboard.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => onboarding.refetch()}>Retry</Button>
              <Button variant="outline" onClick={() => navigate(resolveRoleDashboard(user))}>Go to dashboard</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <Navbar />
      <main className="relative overflow-hidden pb-20 pt-8 sm:pt-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_18%_15%,rgba(124,58,237,.18),transparent_38%),radial-gradient(circle_at_82%_8%,rgba(34,211,238,.1),transparent_32%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-violet-300">
                <ZylobridgeLogo compact showWordmark={false} imageClassName="h-9 w-9" />
                {profileMode ? "Profile completion" : "Personalized setup"}
              </div>
              <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight sm:text-5xl">
                {profileMode ? "Refine the workspace people see." : "Build your path across ZYLOBRIDGE."}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Four focused stages adapt your marketplace experience without blocking optional details. Your progress saves automatically.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-400">
              {saveState === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-300" /> : saveState === "offline" ? <LockKeyhole className="h-3.5 w-3.5 text-amber-300" /> : <Check className="h-3.5 w-3.5 text-emerald-300" />}
              {saveState === "saving" ? "Saving progress" : saveState === "offline" ? "Saved on this device" : "Progress saved"}
            </div>
          </header>

          <section className="mb-8 rounded-2xl border border-white/10 bg-[#0d1422]/90 p-4 shadow-xl backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-400"><span>Stage {step} of 4</span><span>{progress}% complete</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            <ol className="mt-4 grid grid-cols-4 gap-2">
              {steps.map((item) => <li key={item.number} aria-current={item.number === step ? "step" : undefined} className={`min-w-0 text-center text-[11px] sm:text-xs ${item.number <= step ? "text-white" : "text-slate-600"}`}><span className={`mx-auto mb-1 grid h-7 w-7 place-items-center rounded-full border ${item.number < step ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" : item.number === step ? "border-violet-400 bg-violet-500/20 text-violet-100" : "border-white/10 bg-white/[0.03]"}`}>{item.number < step ? <Check className="h-3.5 w-3.5" /> : item.number}</span><span className="hidden sm:block">{item.label}</span></li>)}
            </ol>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="rounded-3xl border border-white/10 bg-[#0d1422] p-5 shadow-2xl sm:p-8" aria-live="polite">
              {step === 1 ? (
                <div>
                  <p className="text-sm font-semibold text-violet-300">Stage 1 · Goal and identity</p>
                  <h2 className="mt-2 text-2xl font-bold">What do you want to accomplish first?</h2>
                  <p className="mt-2 text-sm text-slate-400">Choose one primary workspace. You can record additional interests without overwriting your main role.</p>
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {roleOptions.map((option) => {
                      const Icon = option.icon;
                      const active = role === option.value;
                      return <button key={option.value} type="button" disabled={roleLocked && !active} onClick={() => !roleLocked && update("primaryRole", option.value)} aria-pressed={active} className={`relative rounded-2xl border p-5 text-left transition ${active ? "border-violet-400 bg-violet-500/10" : "border-white/10 bg-white/[0.025] hover:border-white/25"} disabled:cursor-not-allowed disabled:opacity-40`}><Icon className={`h-7 w-7 ${option.accent === "cyan" ? "text-cyan-300" : option.accent === "amber" ? "text-amber-300" : "text-violet-300"}`} /><h3 className="mt-4 font-semibold">{option.title}</h3><p className="mt-2 text-xs leading-5 text-slate-400">{option.description}</p>{active ? <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-violet-500"><Check className="h-3.5 w-3.5" /></span> : null}</button>;
                    })}
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div><FieldLabel>Your name</FieldLabel><Input value={draft.identity?.name ?? ""} onChange={(event) => updateNested("identity", { name: event.target.value })} placeholder="How should we address you?" className="border-white/10 bg-[#080d17]" /></div>
                    <div><FieldLabel optional>Location</FieldLabel><Input value={draft.identity?.location ?? ""} onChange={(event) => updateNested("identity", { location: event.target.value })} placeholder="City, region, or service area" className="border-white/10 bg-[#080d17]" /></div>
                  </div>
                  <div className="mt-5"><FieldLabel optional>Also interested in</FieldLabel><div className="flex flex-wrap gap-2">{roleOptions.filter((option) => option.value !== role).map((option) => { const active = draft.additionalRoles?.includes(option.value) ?? false; return <button key={option.value} type="button" className={selectionButton(active)} onClick={() => update("additionalRoles", active ? draft.additionalRoles?.filter((item) => item !== option.value) : [...(draft.additionalRoles ?? []), option.value].slice(0, 2))}>{option.title}</button>; })}</div><p className="mt-2 text-xs text-slate-500">Additional roles inform recommendations only. They do not silently grant or replace your primary workspace.</p></div>
                </div>
              ) : null}

              {step === 2 && role === "professional" ? (
                <div>
                  <p className="text-sm font-semibold text-cyan-300">Stage 2 · Professional workspace</p><h2 className="mt-2 text-2xl font-bold">Shape your job-matching profile.</h2><p className="mt-2 text-sm text-slate-400">Only your vocation is required. Add more now for stronger discovery, or refine later.</p>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div><FieldLabel>Primary vocation</FieldLabel><VocationSelector value={draft.professional?.vocation ?? ""} onChange={(vocation) => updateNested("professional", { vocation })} /></div>
                    <div><FieldLabel optional>Experience level</FieldLabel><select value={draft.professional?.experienceLevel ?? ""} onChange={(event) => updateNested("professional", { experienceLevel: event.target.value as NonNullable<OnboardingDraft["professional"]>["experienceLevel"] })} className="h-10 w-full rounded-md border border-white/10 bg-[#080d17] px-3 text-sm"><option value="">Select level</option><option value="starting_out">Starting out</option><option value="developing">Developing · 1–3 years</option><option value="experienced">Experienced · 4–9 years</option><option value="expert">Expert · 10+ years</option></select></div>
                    <div><FieldLabel optional>Skills</FieldLabel><Input value={draft.professional?.skills?.join(", ") ?? ""} onChange={(event) => updateNested("professional", { skills: commaList(event.target.value) })} placeholder="Installation, diagnostics, maintenance" className="border-white/10 bg-[#080d17]" /></div>
                    <div><FieldLabel optional>Target hourly rate</FieldLabel><Input type="number" min="1" value={draft.professional?.hourlyRate ?? ""} onChange={(event) => updateNested("professional", { hourlyRate: event.target.value ? Number(event.target.value) : undefined })} placeholder="Your preferred rate" className="border-white/10 bg-[#080d17]" /></div>
                    <div><FieldLabel optional>Availability</FieldLabel><select value={draft.professional?.availabilityStatus ?? ""} onChange={(event) => updateNested("professional", { availabilityStatus: event.target.value as NonNullable<OnboardingDraft["professional"]>["availabilityStatus"] })} className="h-10 w-full rounded-md border border-white/10 bg-[#080d17] px-3 text-sm"><option value="">Choose availability</option><option value="available_now">Available now</option><option value="available_from">Available from a future date</option><option value="currently_working">Currently working</option><option value="emergency_only">Emergency work only</option><option value="not_available">Not available</option></select></div>
                    <div><FieldLabel optional>Service areas</FieldLabel><Input value={draft.professional?.serviceAreas?.join(", ") ?? ""} onChange={(event) => updateNested("professional", { serviceAreas: commaList(event.target.value) })} placeholder="Lagos, Abuja, remote" className="border-white/10 bg-[#080d17]" /></div>
                  </div>
                  <div className="mt-5"><FieldLabel optional>Short professional introduction</FieldLabel><Textarea value={draft.professional?.bio ?? ""} onChange={(event) => updateNested("professional", { bio: event.target.value })} placeholder="Describe the work you do well and the outcomes clients can expect." className="min-h-28 border-white/10 bg-[#080d17]" /></div>
                </div>
              ) : null}

              {step === 2 && role === "client" ? (
                <div>
                  <p className="text-sm font-semibold text-violet-300">Stage 2 · Hiring workspace</p><h2 className="mt-2 text-2xl font-bold">What kind of work do you coordinate?</h2><p className="mt-2 text-sm text-slate-400">These preferences shape shortcuts and discovery. Every field is editable later.</p>
                  <div className="mt-6"><FieldLabel optional>Common hiring needs</FieldLabel><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{hiringNeeds.map((item) => { const active = draft.contractor?.hiringNeeds?.includes(item) ?? false; return <button type="button" key={item} className={selectionButton(active)} onClick={() => updateNested("contractor", { hiringNeeds: active ? draft.contractor?.hiringNeeds?.filter((value) => value !== item) : [...(draft.contractor?.hiringNeeds ?? []), item] })}>{item}</button>; })}</div></div>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div><FieldLabel optional>Typical job size</FieldLabel><select value={draft.contractor?.typicalJobSize ?? ""} onChange={(event) => updateNested("contractor", { typicalJobSize: event.target.value as NonNullable<OnboardingDraft["contractor"]>["typicalJobSize"] })} className="h-10 w-full rounded-md border border-white/10 bg-[#080d17] px-3 text-sm"><option value="">Choose size</option><option value="small">Small repair or task</option><option value="medium">Multi-day project</option><option value="large">Complex or ongoing work</option></select></div>
                    <div><FieldLabel optional>Usual urgency</FieldLabel><select value={draft.contractor?.urgency ?? ""} onChange={(event) => updateNested("contractor", { urgency: event.target.value as NonNullable<OnboardingDraft["contractor"]>["urgency"] })} className="h-10 w-full rounded-md border border-white/10 bg-[#080d17] px-3 text-sm"><option value="">Choose timing</option><option value="planned">Planned</option><option value="soon">Starting soon</option><option value="urgent">Urgent</option></select></div>
                    <div><FieldLabel optional>Budget range</FieldLabel><Input value={draft.contractor?.budgetRange ?? ""} onChange={(event) => updateNested("contractor", { budgetRange: event.target.value })} placeholder="Example: ZAR 5k–25k" className="border-white/10 bg-[#080d17]" /></div>
                    <div><FieldLabel optional>Service locations</FieldLabel><Input value={draft.contractor?.serviceLocations?.join(", ") ?? ""} onChange={(event) => updateNested("contractor", { serviceLocations: commaList(event.target.value) })} placeholder="Cities or regions" className="border-white/10 bg-[#080d17]" /></div>
                  </div>
                </div>
              ) : null}

              {step === 2 && role === "enterprise" ? (
                <div>
                  <p className="text-sm font-semibold text-amber-300">Stage 2 · Organization workspace</p><h2 className="mt-2 text-2xl font-bold">Prepare your organization for coordinated work.</h2><p className="mt-2 text-sm text-slate-400">We create one secure workspace and owner membership when setup completes.</p>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2"><FieldLabel>Organization name</FieldLabel><Input value={draft.enterprise?.organizationName ?? ""} onChange={(event) => updateNested("enterprise", { organizationName: event.target.value })} placeholder="Registered or operating name" className="border-white/10 bg-[#080d17]" /></div>
                    <div><FieldLabel optional>Hiring volume</FieldLabel><select value={draft.enterprise?.hiringVolume ?? ""} onChange={(event) => updateNested("enterprise", { hiringVolume: event.target.value })} className="h-10 w-full rounded-md border border-white/10 bg-[#080d17] px-3 text-sm"><option value="">Choose volume</option><option value="occasional">Occasional roles</option><option value="monthly">Monthly hiring</option><option value="continuous">Continuous hiring</option></select></div>
                    <div><FieldLabel optional>Team size</FieldLabel><Input value={draft.enterprise?.teamSize ?? ""} onChange={(event) => updateNested("enterprise", { teamSize: event.target.value })} placeholder="Example: 25–100" className="border-white/10 bg-[#080d17]" /></div>
                    <div className="sm:col-span-2"><FieldLabel optional>Organization overview</FieldLabel><Textarea value={draft.enterprise?.organizationDescription ?? ""} onChange={(event) => updateNested("enterprise", { organizationDescription: event.target.value })} placeholder="What does your organization do, and what work will this team coordinate?" className="min-h-28 border-white/10 bg-[#080d17]" /></div>
                  </div>
                  <div className="mt-5"><FieldLabel optional>Services needed</FieldLabel><div className="flex flex-wrap gap-2">{serviceNeeds.map((item) => { const active = draft.enterprise?.servicesNeeded?.includes(item) ?? false; return <button type="button" key={item} className={selectionButton(active)} onClick={() => updateNested("enterprise", { servicesNeeded: active ? draft.enterprise?.servicesNeeded?.filter((value) => value !== item) : [...(draft.enterprise?.servicesNeeded ?? []), item] })}>{item}</button>; })}</div></div>
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Stage 3 · Trust and preferences</p><h2 className="mt-2 text-2xl font-bold">Choose how you want to participate.</h2><p className="mt-2 text-sm text-slate-400">Verification remains a separate, truthful process. Choosing “verify now” takes you to the existing verification center after setup.</p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button type="button" aria-pressed={draft.trust?.verificationIntent === "now"} className={selectionButton(draft.trust?.verificationIntent === "now")} onClick={() => updateNested("trust", { verificationIntent: "now", preferencesSkipped: false })}><BadgeCheck className="mb-2 h-5 w-5 text-emerald-300" /><strong className="block">Prepare to verify now</strong><span className="mt-1 block text-xs text-slate-400">Continue to the existing verification workflow after setup.</span></button>
                    <button type="button" aria-pressed={draft.trust?.verificationIntent === "later"} className={selectionButton(draft.trust?.verificationIntent === "later")} onClick={() => updateNested("trust", { verificationIntent: "later", preferencesSkipped: false })}><ShieldCheck className="mb-2 h-5 w-5 text-violet-300" /><strong className="block">Verify later</strong><span className="mt-1 block text-xs text-slate-400">Your account is not marked verified until review succeeds.</span></button>
                  </div>
                  <div className="mt-6 space-y-3">
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4"><input type="checkbox" checked={draft.trust?.emailUpdates ?? true} onChange={(event) => updateNested("trust", { emailUpdates: event.target.checked, preferencesSkipped: false })} className="mt-1 h-4 w-4 accent-violet-500" /><span><strong className="block text-sm">Useful account and marketplace updates</strong><span className="mt-1 block text-xs leading-5 text-slate-400">Receive relevant lifecycle, opportunity, and security notices. Required transactional notices are separate.</span></span></label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4"><input type="checkbox" checked={draft.trust?.marketplaceContact ?? true} onChange={(event) => updateNested("trust", { marketplaceContact: event.target.checked, preferencesSkipped: false })} className="mt-1 h-4 w-4 accent-violet-500" /><span><strong className="block text-sm">Allow relevant marketplace contact</strong><span className="mt-1 block text-xs leading-5 text-slate-400">For professionals, this controls whether authorized employers can start job-context conversations.</span></span></label>
                  </div>
                  <button type="button" onClick={() => { updateNested("trust", { preferencesSkipped: true }); persistAndMove(4); }} className="mt-5 text-sm font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline">Skip optional preferences for now</button>
                </div>
              ) : null}

              {step === 4 ? (
                <div>
                  <p className="text-sm font-semibold text-violet-300">Stage 4 · Review</p><h2 className="mt-2 text-2xl font-bold">Review and edit your personalized workspace.</h2><p className="mt-2 text-sm text-slate-400">You can edit any stage before completion. Setup never fabricates verification, reviews, earnings, jobs, or organization activity.</p>
                  <div className="mt-6 space-y-3">
                    {[
                      ["Primary workspace", selectedRole?.title ?? "Not selected"],
                      ["Name", draft.identity?.name ?? "Not provided"],
                      ["Location", draft.identity?.location ?? "Add later"],
                      [role === "professional" ? "Vocation" : role === "enterprise" ? "Organization" : "Hiring interests", role === "professional" ? draft.professional?.vocation ?? "Not selected" : role === "enterprise" ? draft.enterprise?.organizationName ?? "Not provided" : draft.contractor?.hiringNeeds?.join(", ") || "Add later"],
                      ["Verification", draft.trust?.verificationIntent === "now" ? "Continue after setup" : "Review later"],
                    ].map(([label, value], index) => <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-4"><div><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span><span className="mt-1 block text-sm font-medium text-white">{value}</span></div>{index < 3 ? <button type="button" onClick={() => setStep(index === 0 || index === 1 ? 1 : 2)} className="text-xs font-semibold text-violet-300 hover:text-violet-200">Edit</button> : null}</div>)}
                  </div>
                  <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-5"><h3 className="flex items-center gap-2 font-semibold text-emerald-100"><Sparkles className="h-5 w-5" /> Your first recommended actions</h3><ol className="mt-3 space-y-2">{recommendations.map((item, index) => <li key={item} className="flex gap-3 text-sm text-emerald-50/80"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-xs font-bold">{index + 1}</span>{item}</li>)}</ol></div>
                    <p className="mt-5 text-xs leading-5 text-slate-500">By completing setup, you agree to the <Link href="/terms" className="text-violet-300 hover:text-violet-200">Terms of Service</Link> and acknowledge the <Link href="/privacy-policy" className="text-violet-300 hover:text-violet-200">Privacy Policy</Link>.</p>
                </div>
              ) : null}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" disabled={step === 1 || saveProgress.isPending || complete.isPending} onClick={() => persistAndMove(step - 1)} className="border-white/10"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                {step < 4 ? <Button type="button" disabled={!canContinue || saveProgress.isPending || complete.isPending} onClick={() => persistAndMove(step + 1)} className="bg-violet-600 font-semibold hover:bg-violet-500">{saveProgress.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Continue <ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button type="button" disabled={!canContinue || complete.isPending || saveProgress.isPending} onClick={finish} className="bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold hover:from-violet-500 hover:to-cyan-400">{complete.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{profileMode ? "Save profile updates" : "Open my workspace"}</Button>}
              </div>
            </section>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#101827] shadow-xl">
                <div className="border-b border-white/10 bg-gradient-to-br from-violet-600/20 to-cyan-500/10 p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Live workspace preview</p><h2 className="mt-2 text-xl font-bold">{selectedRole?.title ?? "Choose your path"}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{selectedRole?.promise ?? "Your preview adapts as you make choices."}</p></div>
                <div className="space-y-3 p-5">
                  {(role === "professional" ? [[Target, "Job recommendations"], [BriefcaseBusiness, "Applications"], [CircleDollarSign, "Earnings & payouts"], [MessageSquareText, "Client messages"]] : role === "enterprise" ? [[Users, "Team workspace"], [BriefcaseBusiness, "Hiring pipeline"], [ShieldCheck, "Governed access"], [CircleDollarSign, "Escrow & procurement"]] : [[BriefcaseBusiness, "Job postings"], [Users, "Candidate pipeline"], [CircleDollarSign, "Escrow & funding"], [MessageSquareText, "Professional messages"]]).map(([Icon, label]) => { const PreviewIcon = Icon as typeof Target; return <div key={label as string} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#080d17] p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/10"><PreviewIcon className="h-4 w-4 text-violet-300" /></span><span className="text-sm font-medium">{label as string}</span><ChevronRight className="ml-auto h-4 w-4 text-slate-600" /></div>; })}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-xs leading-5 text-slate-400"><p className="flex items-center gap-2 font-semibold text-slate-200"><LockKeyhole className="h-4 w-4 text-emerald-300" /> Private by design</p><p className="mt-2">Your draft is visible only to your account. Public profile fields follow existing visibility controls, and verification is never implied before review.</p></div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
