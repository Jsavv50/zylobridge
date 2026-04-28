import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Briefcase, HardHat, ArrowRight, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

const LOGO_URL = "/manus-storage/ZYLO_7d32e9f2.png";

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selected, setSelected] = useState<"client" | "professional" | null>(null);
  const utils = trpc.useUtils();

  const { mutate: setUserType, isPending } = trpc.auth.setUserType.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Profile type set successfully!");
      if (selected === "client") navigate("/dashboard/client");
      else navigate("/dashboard/professional");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (user.userType !== "unset") {
    if (user.userType === "client") navigate("/dashboard/client");
    else if (user.userType === "professional") navigate("/dashboard/professional");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl py-20">
        <div className="text-center mb-12">
          <img src={LOGO_URL} alt="ZYLOBRIDGE" className="h-14 w-14 object-contain mx-auto mb-6" />
          <h1
            className="text-3xl font-extrabold text-white mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Welcome to ZYLOBRIDGE
          </h1>
          <p className="text-gray-400">
            Tell us how you'll be using the platform so we can personalize your experience.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {/* Client / Contractor */}
          <button
            onClick={() => setSelected("client")}
            className={`group relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 transition-all duration-200 text-center ${
              selected === "client"
                ? "border-violet-500 bg-violet-500/10"
                : "border-white/10 bg-[#131a26] hover:border-violet-500/40 hover:bg-[#1c2740]"
            }`}
          >
            {selected === "client" && (
              <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-violet-500 flex items-center justify-center">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div className="h-14 w-14 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Briefcase className="h-7 w-7 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Contractor / Client</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Post jobs, receive bids from skilled professionals, and manage your projects from start to finish.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Post Jobs", "Review Bids", "Manage Projects"].map((tag) => (
                <span key={tag} className="text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          </button>

          {/* Professional */}
          <button
            onClick={() => setSelected("professional")}
            className={`group relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 transition-all duration-200 text-center ${
              selected === "professional"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-white/10 bg-[#131a26] hover:border-cyan-500/40 hover:bg-[#1c2740]"
            }`}
          >
            {selected === "professional" && (
              <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-cyan-500 flex items-center justify-center">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div className="h-14 w-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
              <HardHat className="h-7 w-7 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Skilled Professional</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Browse jobs in your trade, submit competitive bids, build your profile, and grow your career.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Browse Jobs", "Submit Bids", "Build Reputation"].map((tag) => (
                <span key={tag} className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        </div>

        <div className="flex justify-center">
          <Button
            disabled={!selected || isPending}
            onClick={() => selected && setUserType({ userType: selected })}
            size="lg"
            className="font-bold px-10 h-12"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Continue as {selected === "client" ? "Contractor" : selected === "professional" ? "Professional" : "..."}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
