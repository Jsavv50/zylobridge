import { Link } from "wouter";
import { Bookmark, Clock, DollarSign, MapPin, Zap } from "lucide-react";
import { VOCATION_ICONS, VOCATION_LABELS, type VocationKey } from "@shared/vocations";
import { VerificationBadge } from "@/components/VerificationBadge";

interface JobCardProps {
  id: number;
  title: string;
  vocation: string;
  location: string;
  budget: string;
  status: string;
  isUrgent: boolean;
  createdAt: Date | string;
  description?: string;
  clientVerified?: boolean;
  clientName?: string;
  organizationName?: string;
  organizationSlug?: string;
  saved?: boolean;
  savePending?: boolean;
  onToggleSave?: (saved: boolean) => void;
  returnTo?: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  completed: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/25",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function JobCard({
  id,
  title,
  vocation,
  location,
  budget,
  status,
  isUrgent,
  createdAt,
  description,
  clientVerified,
  clientName,
  organizationName,
  saved = false,
  savePending = false,
  onToggleSave,
  returnTo = "/jobs",
}: JobCardProps) {
  const vKey = vocation as VocationKey;
  const icon = VOCATION_ICONS[vKey] ?? "🔧";
  const label = VOCATION_LABELS[vKey] ?? vocation;
  const timeAgo = formatTimeAgo(new Date(createdAt));

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/8 bg-[#131a26] transition-all duration-200 hover:border-violet-500/30 hover:bg-[#1c2740]">
      {isUrgent && <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />}
      <Link href={`/jobs/${id}${returnTo !== "/jobs" ? `?from=${encodeURIComponent(returnTo)}` : ""}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400">
        <div className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span aria-hidden="true" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-xl">{icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-violet-300">{label}</p>
                <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-6 text-white transition-colors group-hover:text-violet-300">{title}</h3>
              </div>
            </div>
            <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.open}`}>
              {STATUS_LABELS[status] ?? "Open"}
            </span>
          </div>
          {description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-400">{description}</p>}
        </div>
      </Link>

      <div className="px-5 pb-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/5 pt-3 text-xs text-gray-400">
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-cyan-300" />{location}</span>
          <span className="inline-flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-emerald-300" />₦{Number(budget).toLocaleString()}</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gray-500" />{timeAgo}</span>
        </div>
        {(clientName || organizationName || isUrgent || onToggleSave) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {organizationName ? <><span className="text-gray-500">Organization</span><span className="truncate font-medium text-gray-300">{organizationName}</span></> : clientName ? <><span className="text-gray-500">Posted by</span><span className="truncate font-medium text-gray-300">{clientName}</span>{clientVerified && <VerificationBadge isVerified size="sm" />}</> : null}
              {isUrgent && <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-300"><Zap className="h-3 w-3" />Urgent</span>}
            </div>
            {onToggleSave && <button type="button" aria-pressed={saved} aria-label={saved ? `Remove ${title} from saved jobs` : `Save ${title}`} disabled={savePending} onClick={() => onToggleSave(!saved)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition hover:border-violet-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-wait disabled:opacity-60"><Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current text-violet-300" : ""}`} />{saved ? "Saved" : "Save"}</button>}
          </div>
        )}
      </div>
    </article>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}
