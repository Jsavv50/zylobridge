import React from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

export function BackButton({ href, label = "Back", className = "mb-6" }: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleBack = (e: React.MouseEvent) => {
    if (!href) {
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        setLocation("/");
      }
    }
  };

  if (href) {
    return (
      <div className={className}>
        <Link href={href}>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground pl-0">
            <ArrowLeft className="h-4 w-4" />
            <span>{label}</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="gap-2 text-muted-foreground hover:text-foreground pl-0"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{label}</span>
      </Button>
    </div>
  );
}
