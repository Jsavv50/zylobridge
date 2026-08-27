import { Bell, CheckCircle2, ExternalLink, Settings2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ApplicationShell, EmptyState, PageHeader, StatusBadge } from "@/components/shell/ZyloShell";

function referenceHref(referenceType: string | null, referenceId: string | null) {
  if (!referenceId) return "/notifications";
  if (referenceType === "job") return `/jobs/${referenceId}`;
  if (referenceType === "message") return referenceId ? `/messages?conv=${encodeURIComponent(referenceId)}` : "/messages";
  if (referenceType === "application") return "/applications";
  if (referenceType === "enterprise" || referenceType === "organization") return "/enterprise";
  return "/notifications";
}

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: notifications = [], isLoading, isError } = trpc.notifications.listUnread.useQuery(undefined, { enabled: isAuthenticated });
  const { data: preferences } = trpc.notifications.preferences.useQuery(undefined, { enabled: isAuthenticated });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => void utils.notifications.listUnread.invalidate(),
  });

  if (!isAuthenticated) {
    return <ApplicationShell><EmptyState icon={Bell} title="Sign in to view notifications" description="Your account notifications are protected and available after sign-in." action={<Link href="/sign-in"><Button>Sign in</Button></Link>} /></ApplicationShell>;
  }

  return (
    <ApplicationShell>
      <PageHeader
        title="Notifications"
        description="Review important account, marketplace, messaging, and organization updates."
        action={<Link href="/notifications/settings"><Button variant="outline"><Settings2 className="mr-2 h-4 w-4" />Notification settings</Button></Link>}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <StatusBadge status="info" label={`${notifications.length} unread`} />
        <span>Email updates {preferences?.emailEnabled === false ? "disabled" : "enabled"}</span>
      </div>
      {isLoading ? <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading notifications…</div> : isError ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-8 text-sm text-rose-300">Notifications are temporarily unavailable. Please try again.</div> : notifications.length === 0 ? <EmptyState icon={CheckCircle2} title="You’re all caught up" description="New account and marketplace events will appear here when they are available." /> : <div className="space-y-3">{notifications.map((notification) => <article key={notification.id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><Bell className="h-4 w-4 shrink-0 text-primary" /><h2 className="font-semibold text-foreground">{notification.title}</h2></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{notification.content}</p><p className="mt-3 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()} · {notification.category}</p></div><div className="flex shrink-0 gap-2"><Link href={referenceHref(notification.referenceType, notification.referenceId)}><Button variant="outline" size="sm">Open <ExternalLink className="ml-2 h-3.5 w-3.5" /></Button></Link><Button size="sm" onClick={() => markRead.mutate({ id: notification.id })} disabled={markRead.isPending}>Mark read</Button></div></div></article>)}</div>}
    </ApplicationShell>
  );
}
