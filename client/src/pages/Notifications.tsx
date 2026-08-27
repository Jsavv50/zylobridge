import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Bell, BriefcaseBusiness, CalendarClock, Check, CheckCircle2, ChevronRight, Clock3, ExternalLink, FileCheck2, Filter, Globe2, Loader2, MessageSquare, PiggyBank, Search, Settings2, ShieldAlert, ShieldCheck, Star, UserRound, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApplicationShell, EmptyState, PageHeader } from "@/components/shell/ZyloShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getSupabaseBrowserClient, initSupabaseRealtimeAuth } from "@/lib/supabase";
import { deriveNotificationPriority, notificationCategoryLabel, notificationDestination, NOTIFICATION_CATEGORIES, type NotificationCategory } from "@shared/notifications";

const categoryIcons: Record<NotificationCategory, typeof Bell> = {
  application: BriefcaseBusiness,
  job: Search,
  message: MessageSquare,
  payment: WalletCards,
  verification: ShieldCheck,
  profile: UserRound,
  review: Star,
  scheduling: CalendarClock,
  system: Bell,
};

const filters: Array<{ key: "all" | "unread" | NotificationCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  ...NOTIFICATION_CATEGORIES.map((key) => ({ key, label: notificationCategoryLabel[key] })),
];

type FilterKey = (typeof filters)[number]["key"];
type NotificationRecord = { id: number; userId: number; title: string; content: string; category: string; referenceType: string | null; referenceId: string | null; isRead: boolean; createdAt: Date };

function category(value: string | null | undefined): NotificationCategory {
  const normalized = (value || "system").toLowerCase();
  if (normalized === "applications") return "application";
  if (normalized === "messages") return "message";
  if (normalized === "payments" || normalized === "escrow") return "payment";
  if (normalized === "security") return "verification";
  if (normalized === "reviews" || normalized === "reputation") return "review";
  if (normalized === "schedule" || normalized === "interview") return "scheduling";
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(normalized) ? normalized as NotificationCategory : "system";
}
function formatTime(value: Date | string) { return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
function relativeTime(value: Date | string) { const diff = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (diff < 3600) return `${Math.floor(diff / 60) || 1}m ago`; if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`; if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`; return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function dateBucket(value: Date | string) { const then = new Date(value); const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); const day = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime(); const delta = Math.round((today - day) / 86_400_000); if (delta === 0) return "Today"; if (delta === 1) return "Yesterday"; if (delta <= 7) return "Earlier this week"; if (then.getFullYear() === now.getFullYear() && then.getMonth() === now.getMonth()) return "Earlier this month"; return "Older"; }
function isActionRequired(item: { title: string; content: string; category: string }) { return deriveNotificationPriority(item) === "action_required"; }
function referenceHref(referenceType: string | null, referenceId: string | null) { if (referenceType === "message" && referenceId && /^\\d+$/.test(referenceId)) return `/messages/${encodeURIComponent(referenceId)}`; if (referenceType === "application" && referenceId && /^\\d+$/.test(referenceId)) return `/applications/${referenceId}`; return notificationDestination(referenceType, referenceId); }

function NotificationIcon({ type, unread, action }: { type: NotificationCategory; unread: boolean; action: boolean }) { const Icon = categoryIcons[type]; return <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${action ? "border-amber-400/25 bg-amber-400/10 text-amber-300" : unread ? "border-violet-400/25 bg-violet-400/10 text-violet-200" : "border-white/10 bg-white/[.04] text-gray-500"}`}><Icon className="h-4.5 w-4.5" />{unread && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0e1622] bg-violet-300" aria-label="Unread" />}</div>; }

export default function Notifications() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [allItems, setAllItems] = useState<NotificationRecord[]>([]);
  const limit = 25;
  const queryInput = useMemo(() => ({ category: filter !== "all" && filter !== "unread" ? filter : undefined, unreadOnly: filter === "unread" || undefined, search: search.trim() || undefined, limit, offset }), [filter, search, offset]);
  const notificationQuery = trpc.notifications.list.useQuery(queryInput, { enabled: isAuthenticated });
  const unreadQuery = trpc.notifications.listUnread.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 30_000 });
  const preferencesQuery = trpc.notifications.preferences.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: async () => { await Promise.all([utils.notifications.list.invalidate(), utils.notifications.listUnread.invalidate()]); } });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: async () => { setOffset(0); setAllItems([]); await Promise.all([utils.notifications.list.invalidate(), utils.notifications.listUnread.invalidate()]); } });

  useEffect(() => {
    if (!notificationQuery.data) return;
    setAllItems((current) => offset === 0 ? notificationQuery.data.items : [...current, ...notificationQuery.data.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
  }, [notificationQuery.data, offset]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]> | undefined;
    let cancelled = false;
    void initSupabaseRealtimeAuth().then((ready) => {
      if (!ready || cancelled) return;
      const supabase = getSupabaseBrowserClient();
      channel = supabase.channel(`private-notifications-${user.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `userId=eq.${user.id}` }, () => { void utils.notifications.list.invalidate(); void utils.notifications.listUnread.invalidate(); }).subscribe();
    }).catch(() => undefined);
    return () => { cancelled = true; if (channel) void getSupabaseBrowserClient().removeChannel(channel); };
  }, [isAuthenticated, user?.id, utils]);

  useEffect(() => { setOffset(0); setAllItems([]); }, [filter, search]);

  const unreadCount = notificationQuery.data?.unreadCount ?? unreadQuery.data?.length ?? 0;
  const categoryCounts = notificationQuery.data?.categoryCounts ?? {};
  const actionRequiredCount = notificationQuery.data?.actionRequiredCount ?? unreadQuery.data?.filter((item) => isActionRequired(item)).length ?? 0;
  const grouped = useMemo(() => allItems.reduce<Record<string, NotificationRecord[]>>((groups, item) => { const bucket = dateBucket(item.createdAt); (groups[bucket] ||= []).push(item); return groups; }, {}), [allItems]);
  const bucketOrder = ["Today", "Yesterday", "Earlier this week", "Earlier this month", "Older"];

  const openNotification = (item: (typeof allItems)[number]) => {
    if (!item.isRead) markRead.mutate({ id: item.id });
    navigate(notificationDestination(item.referenceType, item.referenceId));
  };

  if (!isAuthenticated) return <ApplicationShell><EmptyState icon={Bell} title="Sign in to view notifications" description="Your account notifications are protected and available after sign-in." action={<Link href="/sign-in"><Button>Sign in</Button></Link>} /></ApplicationShell>;

  return <ApplicationShell><PageHeader title="Notifications" description="Stay up to date with your applications, jobs, messages, payments, profile, and marketplace activity." action={<div className="flex flex-wrap gap-2"><Link href="/notifications/settings"><Button variant="outline"><Settings2 className="mr-2 h-4 w-4" />Settings</Button></Link>{unreadCount > 0 && <Button onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending} className="bg-violet-600 hover:bg-violet-500">{markAllRead.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Mark all as read</Button>}</div>} />
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Unread", value: unreadCount, icon: Bell, filter: "unread" as const, tone: "violet" }, { label: "Application updates", value: categoryCounts.application ?? 0, icon: BriefcaseBusiness, filter: "application" as const, tone: "cyan" }, { label: "Messages", value: categoryCounts.message ?? 0, icon: MessageSquare, filter: "message" as const, tone: "emerald" }, { label: "Action required", value: actionRequiredCount, icon: ShieldAlert, filter: "unread" as const, tone: "amber" }].map(({ label, value, icon: Icon, filter: targetFilter, tone }) => <button type="button" key={label} onClick={() => setFilter(targetFilter)} className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone === "amber" ? "bg-amber-400/10 text-amber-300" : tone === "emerald" ? "bg-emerald-400/10 text-emerald-300" : tone === "cyan" ? "bg-cyan-400/10 text-cyan-300" : "bg-violet-400/10 text-violet-300"}`}><Icon className="h-4 w-4" /></div><p className="mt-4 text-2xl font-semibold text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></button>)}
      </section>
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search payments, employers, jobs, applications…" aria-label="Search notifications" className="pl-9 pr-9" />{search && <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear notification search"><X className="h-4 w-4" /></button>}</div><div className="flex items-center gap-2 text-xs text-muted-foreground"><Filter className="h-4 w-4" />{notificationQuery.data?.total ?? 0} matching notifications</div></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Notification filters">{filters.map(({ key, label }) => <button type="button" role="tab" aria-selected={filter === key} key={key} onClick={() => setFilter(key)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition ${filter === key ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>{label}{key === "unread" && unreadCount > 0 ? ` ${unreadCount}` : key !== "all" && key !== "unread" && categoryCounts[key] ? ` ${categoryCounts[key]}` : ""}</button>)}</div></section>
      {notificationQuery.isLoading && offset === 0 ? <div className="space-y-3" aria-label="Loading notifications">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />)}</div> : notificationQuery.isError ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center"><ShieldAlert className="mx-auto h-7 w-7 text-rose-300" /><h2 className="mt-3 font-semibold text-foreground">We couldn’t load your notifications.</h2><p className="mt-1 text-sm text-muted-foreground">Please try again. Your read state remains protected on the server.</p><Button className="mt-4" onClick={() => void notificationQuery.refetch()}>Retry</Button></div> : allItems.length === 0 ? <EmptyState icon={CheckCircle2} title={filter === "all" ? "You’re all caught up" : `No ${filter === "unread" ? "unread" : notificationCategoryLabel[filter as NotificationCategory].toLowerCase()} notifications`} description="We’ll let you know when something important happens with your applications, jobs, messages, payments, or profile." action={<div className="flex flex-wrap justify-center gap-2"><Link href="/jobs"><Button>Browse jobs</Button></Link><Link href="/applications"><Button variant="outline">View applications</Button></Link></div>} /> : <div className="space-y-7">{bucketOrder.filter((bucket) => grouped[bucket]?.length).map((bucket) => <section key={bucket} aria-labelledby={`notifications-${bucket.replaceAll(" ", "-").toLowerCase()}`}><div className="mb-3 flex items-center gap-3"><h2 id={`notifications-${bucket.replaceAll(" ", "-").toLowerCase()}`} className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">{bucket}</h2><div className="h-px flex-1 bg-border" /></div><div className="space-y-3">{grouped[bucket].map((item) => { const type = category(item.category); const action = isActionRequired(item); const destination = referenceHref(item.referenceType, item.referenceId); return <article key={item.id} className={`rounded-2xl border p-4 transition sm:p-5 ${item.isRead ? "border-border bg-card" : action ? "border-amber-400/20 bg-amber-400/[.04]" : "border-primary/20 bg-primary/[.035]"}`}><div className="flex items-start gap-3 sm:gap-4"><NotificationIcon type={type} unread={!item.isRead} action={action} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><h3 className={`font-semibold ${item.isRead ? "text-foreground" : "text-foreground"}`}>{item.title}</h3>{action && <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">Action required</span>}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.content}</p></div><span className="shrink-0 text-xs text-muted-foreground" title={formatTime(item.createdAt)}>{relativeTime(item.createdAt)}</span></div><div className="mt-4 flex flex-wrap items-center gap-2"><Button size="sm" onClick={() => openNotification(item)}>{action ? "Take action" : "Open"}<ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Button>{!item.isRead && <Button size="sm" variant="outline" onClick={() => markRead.mutate({ id: item.id })} disabled={markRead.isPending}><Check className="mr-2 h-3.5 w-3.5" />Mark as read</Button>}<span className="text-[11px] text-muted-foreground">{notificationCategoryLabel[type]}</span>{destination !== "/notifications" && <Link href={destination} className="ml-auto inline-flex items-center text-xs text-primary hover:underline">View destination <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link>}</div></div></div></article>; })}</div></section>)}</div>}
      {notificationQuery.data && offset + limit < notificationQuery.data.total && <div className="flex justify-center"><Button variant="outline" onClick={() => setOffset((current) => current + limit)} disabled={notificationQuery.isFetching}>{notificationQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Load older notifications</Button></div>}
      <div className="grid gap-4 sm:grid-cols-3"><Link href="/notifications/settings" className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"><Settings2 className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-semibold text-foreground">Notification settings</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{preferencesQuery.data?.emailEnabled === false ? "Email updates are disabled." : "Choose channels and preferences."}</p></Link><Link href="/verification" className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"><FileCheck2 className="h-5 w-5 text-emerald-400" /><p className="mt-3 text-sm font-semibold text-foreground">Trust & verification</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Review outstanding verification actions.</p></Link><Link href="/profile" className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"><Globe2 className="h-5 w-5 text-cyan-400" /><p className="mt-3 text-sm font-semibold text-foreground">Marketplace profile</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Keep your professional profile current.</p></Link></div>
    </div>
  </ApplicationShell>;
}
