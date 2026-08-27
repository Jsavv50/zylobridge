import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Bell, Check, Clock3, Mail, Megaphone, MessageSquare, Moon, Save, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApplicationShell, PageHeader } from "@/components/shell/ZyloShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { NOTIFICATION_CATEGORIES, notificationCategoryLabel, type NotificationChannelSettings, type NotificationCategory, type NotificationFrequency } from "@shared/notifications";

const legacyOptions = [
  { key: "emailEnabled" as const, title: "Email updates", description: "Receive supported account and marketplace notifications by email.", icon: Mail },
  { key: "marketplaceEvents" as const, title: "Marketplace activity", description: "Enable in-app activity for applications, jobs, messages, escrow, and professional events.", icon: Bell },
  { key: "marketingEnabled" as const, title: "Product announcements", description: "Receive optional ZYLOBRIDGE product and service announcements.", icon: Megaphone },
];
type LegacyKey = (typeof legacyOptions)[number]["key"];
type LegacyState = Record<LegacyKey, boolean>;
type ChannelState = { email: Partial<Record<NotificationCategory, boolean>>; push: Partial<Record<NotificationCategory, boolean>>; inApp: Partial<Record<NotificationCategory, boolean>>; frequency: Partial<Record<NotificationCategory, NotificationFrequency>>; quietHours: { enabled: boolean; start: string; end: string } };
const frequencies: NotificationFrequency[] = ["immediately", "daily", "weekly", "never"];
const frequencyLabel: Record<NotificationFrequency, string> = { immediately: "Immediately", daily: "Daily digest", weekly: "Weekly digest", never: "Never" };
const blankChannel = (): ChannelState => ({ email: {}, push: {}, inApp: {}, frequency: {}, quietHours: { enabled: false, start: "22:00", end: "07:00" } });

export default function NotificationSettings() {
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/sign-in" });
  const utils = trpc.useUtils();
  const { data: preferences, isLoading } = trpc.notifications.preferences.useQuery(undefined, { enabled: isAuthenticated });
  const updatePreferences = trpc.notifications.updatePreferences.useMutation({ onSuccess: async () => { await Promise.all([utils.notifications.preferences.invalidate(), utils.notifications.listUnread.invalidate()]); } });
  const [legacy, setLegacy] = useState<LegacyState>({ emailEnabled: true, marketplaceEvents: true, marketingEnabled: false });
  const [channels, setChannels] = useState<ChannelState>(blankChannel);

  useEffect(() => {
    if (!preferences) return;
    const incoming = ("channelSettings" in preferences ? preferences.channelSettings : undefined) as NotificationChannelSettings | null | undefined;
    const defaults = blankChannel();
    setLegacy({ emailEnabled: preferences.emailEnabled, marketplaceEvents: preferences.marketplaceEvents, marketingEnabled: preferences.marketingEnabled });
    setChannels({
      email: { ...defaults.email, ...(incoming?.email || {}) },
      push: { ...defaults.push, ...(incoming?.push || {}) },
      inApp: { ...defaults.inApp, ...(incoming?.inApp || {}) },
      frequency: { ...defaults.frequency, ...(incoming?.frequency || {}) },
      quietHours: { ...defaults.quietHours, ...(incoming?.quietHours || {}) },
    });
  }, [preferences]);

  if (!isAuthenticated) return null;
  const persist = (next: ChannelState) => updatePreferences.mutate({ channelSettings: next });
  const toggleLegacy = (key: LegacyKey) => { const next = { ...legacy, [key]: !legacy[key] }; setLegacy(next); updatePreferences.mutate({ [key]: next[key] }); };
  const toggleChannel = (channel: "email" | "push" | "inApp", key: NotificationCategory) => { const next = { ...channels, [channel]: { ...channels[channel], [key]: !channels[channel][key] } }; setChannels(next); persist(next); };
  const setFrequency = (key: NotificationCategory, frequency: NotificationFrequency) => { const next = { ...channels, frequency: { ...channels.frequency, [key]: frequency } }; setChannels(next); persist(next); };
  const setQuiet = (patch: Partial<ChannelState["quietHours"]>) => { const next = { ...channels, quietHours: { ...channels.quietHours, ...patch } }; setChannels(next); persist(next); };

  return <ApplicationShell><PageHeader title="Notification Settings" description="Choose how ZYLOBRIDGE keeps you informed. Changes are saved to your account." action={<Link href="/notifications"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to notifications</Button></Link>} />
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2"><ShieldCheck className="h-5 w-5 text-emerald-400" /></div><div><h2 className="font-semibold text-foreground">Security alerts stay enabled</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Critical security, account-protection, and appropriate payment notices remain eligible so important changes are not missed.</p></div></div><div className="grid gap-3 lg:grid-cols-3">{legacyOptions.map(({ key, title, description, icon: Icon }) => <button key={key} type="button" onClick={() => toggleLegacy(key)} disabled={isLoading || updatePreferences.isPending} aria-pressed={legacy[key]} className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/50 disabled:cursor-wait disabled:opacity-70"><div className={`rounded-xl border p-2 ${legacy[key] ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"}`}><Icon className="h-5 w-5" /></div><span className="min-w-0 flex-1"><span className="block font-medium text-foreground">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${legacy[key] ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`}><Check className="h-4 w-4" /></span></button>)}</div></section>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Delivery matrix</p><h2 className="mt-2 text-xl font-semibold text-foreground">Choose the signal for each category</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Control email, push, and in-app delivery per notification category. Your choices are persisted server-side.</p></div><Save className="hidden h-5 w-5 text-muted-foreground sm:block" /></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground"><th className="pb-3 pr-4">Category</th><th className="pb-3 px-2"><span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />Email</span></th><th className="pb-3 px-2"><span className="inline-flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" />Push</span></th><th className="pb-3 px-2"><span className="inline-flex items-center gap-1"><Bell className="h-3.5 w-3.5" />In-app</span></th><th className="pb-3 pl-2">Frequency</th></tr></thead><tbody>{NOTIFICATION_CATEGORIES.map((key) => <tr key={key} className="border-b border-border/60 last:border-0"><th className="py-4 pr-4 font-medium text-foreground">{notificationCategoryLabel[key]}</th>{(["email", "push", "inApp"] as const).map((channel) => <td key={channel} className="px-2 py-4"><button type="button" onClick={() => toggleChannel(channel, key)} aria-pressed={!!channels[channel][key]} className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${channels[channel][key] ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent hover:border-primary/50"}`}><Check className="h-4 w-4" /></button></td>)}<td className="py-4 pl-2"><select value={channels.frequency[key] || "immediately"} onChange={(event) => setFrequency(key, event.target.value as NotificationFrequency)} className="rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">{frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequencyLabel[frequency]}</option>)}</select></td></tr>)}</tbody></table></div></section>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl border border-indigo-400/20 bg-indigo-400/10 p-2"><Moon className="h-5 w-5 text-indigo-300" /></div><div><h2 className="font-semibold text-foreground">Quiet hours</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Suppress non-critical push notifications during your chosen hours. Critical account, security, and appropriate payment alerts remain eligible.</p></div></div><div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end"><label className="flex items-center gap-3 text-sm text-foreground"><input type="checkbox" checked={channels.quietHours.enabled} onChange={(event) => setQuiet({ enabled: event.target.checked })} className="h-4 w-4 accent-violet-500" />Enable quiet hours</label><label className="text-xs text-muted-foreground">Start<Input type="time" value={channels.quietHours.start} onChange={(event) => setQuiet({ start: event.target.value })} className="mt-1 w-32" /></label><label className="text-xs text-muted-foreground">End<Input type="time" value={channels.quietHours.end} onChange={(event) => setQuiet({ end: event.target.value })} className="mt-1 w-32" /></label><span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" />{channels.quietHours.enabled ? `${channels.quietHours.start} — ${channels.quietHours.end}` : "Quiet hours disabled"}</span></div></section>
      <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start gap-3"><MessageSquare className="mt-0.5 h-5 w-5 text-cyan-300" /><p className="text-sm leading-6 text-muted-foreground">Notification delivery depends on supported events and configured channels. ZYLOBRIDGE will not create placeholder activity, and your notification history remains protected by your account authorization.</p></div></section>
    </div>
  </ApplicationShell>;
}
