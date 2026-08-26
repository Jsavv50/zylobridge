import { Link } from "wouter";

type ZylobridgeLogoProps = {
  className?: string;
  imageClassName?: string;
  showWordmark?: boolean;
  compact?: boolean;
};

/**
 * The single canonical ZYLOBRIDGE brand mark used by shared navigation and
 * standalone authentication/fallback surfaces.
 */
export function ZylobridgeLogo({
  className = "",
  imageClassName = "",
  showWordmark = true,
  compact = false,
}: ZylobridgeLogoProps) {
  return (
    <Link
      href="/"
      aria-label="Go to Zylobridge homepage"
      className={`inline-flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117] ${className}`}
    >
      <img
        src="/ZYLO.png"
        alt="ZYLOBRIDGE official logo"
        width={546}
        height={519}
        className={`${compact ? "h-8 w-8" : "h-9 w-9"} shrink-0 object-contain ${imageClassName}`}
      />
      {showWordmark && (
        <span
          className={`${compact ? "text-lg" : "text-xl"} font-extrabold tracking-tight`}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            background: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          ZYLOBRIDGE
        </span>
      )}
    </Link>
  );
}

export default ZylobridgeLogo;
