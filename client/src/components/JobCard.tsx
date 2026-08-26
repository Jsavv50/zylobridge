import { Link } from "wouter";
import { MapPin, Clock, DollarSign, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VOCATION_LABELS, VOCATION_ICONS, type VocationKey } from "@shared/vocations";
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
}: JobCardProps) {
  const vKey = vocation as VocationKey;
  const icon = VOCATION_ICONS[vKey] ?? "🔧";
  const label = VOCATION_LABELS[vKey] ?? vocation;
  const timeAgo = formatTimeAgo(new Date(createdAt));

  return (
    <Link href={`/jobs/${id}`}>
      <div className="group relative rounded-xl border border-white/8 bg-[#131a26] hover:border-violet-500/30 hover:bg-[#1c2740] transition-all duration-200 cursor-pointer overflow-hidden">
        {/* Urgent indicator */}
        {isUrgent && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{icon}</span>
              <div>
                <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-1 text-sm">
                  {title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{label} · Job #{id}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[status] ?? STATUS_STYLES.open}`}>
                {STATUS_LABELS[status] ?? status}
              </span>
              {isUrgent && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <Zap className="h-3 w-3" />
                  Urgent
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">{description}</p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-gray-600" />
              {location}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-gray-600" />
              ₦{Number(budget).toLocaleString()}
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3 text-gray-600" />
              {timeAgo}
            </span>
          </div>

          {/* Poster and organization context */}
          {(clientName || organizationName) && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-3 pt-3 border-t border-white/5">
              {organizationName ? <><span className="text-xs text-gray-600">Organization</span><span className="text-xs text-gray-400 font-medium">{organizationName}</span></> : <><span className="text-xs text-gray-600">Posted by</span><span className="text-xs text-gray-400 font-medium">{clientName}</span>{clientVerified && <VerificationBadge isVerified size="sm" />}</>}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}
