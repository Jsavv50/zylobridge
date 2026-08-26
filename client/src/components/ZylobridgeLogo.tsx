import React from "react";
import { Link } from "wouter";

interface ZylobridgeLogoProps {
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  textSizeClass?: string;
  textColorClass?: string;
}

const LOGO_URL = "/ZYLO.png";

export function ZylobridgeLogo({
  className = "flex items-center gap-3 shrink-0",
  imageClassName = "h-9 w-9 object-contain",
  showText = true,
  textSizeClass = "text-xl font-extrabold tracking-tight",
  textColorClass = "",
}: ZylobridgeLogoProps) {
  return (
    <Link href="/" className={`${className} focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg transition group`} aria-label="Go to Zylobridge homepage">
      <img
        src={LOGO_URL}
        alt="ZYLOBRIDGE Official Logo"
        className={`${imageClassName} transition-transform group-hover:scale-105`}
      />
      {showText && (
        <span
          className={`${textSizeClass} ${textColorClass}`}
          style={
            textColorClass
              ? undefined
              : {
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }
          }
        >
          ZYLOBRIDGE
        </span>
      )}
    </Link>
  );
}
