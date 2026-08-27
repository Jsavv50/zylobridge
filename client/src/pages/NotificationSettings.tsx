import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Bell, Check, Mail, Megaphone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationShell, PageHeader } from "@/components/shell/ZyloShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const preferenceOptions = [
  {
    key: "emailEnabled" as const,
    title: "Email updates",
    description: "Receive supported account and marketplace notifications by email.",
    icon: Mail,
  },
  {
    key: "marketplaceEvents" as const,
    title: "Marketplace activity",
    description: "Enable in-app activity for messages, applications, candidate updates, jobs, escrow, and enterprise events.",
    icon: Bell,
  },
  {
    key: "marketingEnabled" as const,
    title: "Product announcements",
    description: "Receive optional ZYLOBRIDGE product and service announcements.",
    icon: Megaphone,
  },
];

type PreferenceKey = (typeof preferenceOptions)[number]["key"];

type PreferenceState = Record<PreferenceKey, boolean>;

export default function NotificationSettings() {
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/sign-in" });
  const utils = trpc.useUtils();
  const { data: preferences, isLoading } = trpc.notifications.preferences.useQuery(undefined, { enabled: isAuthenticated });
  const updatePreferences = trpc.notifications.updatePreferences.useMutation({
    onSuccess: async () => {
      await utils.notifications.preferences.invalidate();
      await utils.notifications.listUnread.invalidate();
    },
  });
  const [state, setState] = useState<PreferenceState>({ emailEnabled: true, marketplaceEvents: true, marketingEnabled: false });

  useEffect(() => {
    if (preferences) {
      setState({
        emailEnabled: preferences.emailEnabled,
        marketplaceEvents: preferences.marketplaceEvents,
        marketingEnabled: preferences.marketingEnabled,
      });
    }
  }, [preferences]);

  if (!isAuthenticated) return null;

  const toggle = (key: PreferenceKey) => {
    const nextValue = !state[key];
    setState((current) => ({ ...current, [key]: nextValue }));
    updatePreferences.mutate({ [key]: nextValue });
  };

  return (
    <ApplicationShell>
      <PageHeader
        title="Notification Settings"
        description="Choose how ZYLOBRIDGE keeps you informed. Changes are saved to your account."
        action={<Link href="/notifications"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to notifications</Button></Link>}
      />
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2"><ShieldCheck className="h-5 w-5 text-emerald-400" /></div>
            <div>
              <h2 className="font-semibold text-foreground">Security alerts stay enabled</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Critical security and account-protection notices are always delivered so important changes are not missed.</p>
            </div>
          </div>
          <div className="space-y-3">
            {preferenceOptions.map(({ key, title, description, icon: Icon }) => {
              const enabled = state[key];
              return (
                <button key={key} type="button" onClick={() => toggle(key)} disabled={isLoading || updatePreferences.isPending} aria-pressed={enabled} className="flex w-full items-center gap-4 rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/50 disabled:cursor-wait disabled:opacity-70">
                  <div className={`rounded-xl border p-2 ${enabled ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"}`}><Icon className="h-5 w-5" /></div>
                  <span className="min-w-0 flex-1"><span className="block font-medium text-foreground">{title}</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{description}</span></span>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${enabled ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`} aria-hidden="true"><Check className="h-4 w-4" /></span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </ApplicationShell>
  );
}
