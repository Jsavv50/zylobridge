import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VerificationBadgeProps {
  isVerified: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function VerificationBadge({ isVerified, size = "md", showLabel = false }: VerificationBadgeProps) {
  if (!isVerified) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-emerald-400 cursor-default">
          <ShieldCheck className={`${sizeMap[size]} fill-emerald-400/20`} />
          {showLabel && (
            <span className="text-xs font-semibold tracking-wide">VERIFIED</span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-card border-border text-foreground text-xs">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Identity & credentials verified by ZYLOBRIDGE
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
