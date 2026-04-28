import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Phone,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "wouter";

// ── Logo URL (CDN) ──────────────────────────────────────────────────────────
const LOGO_URL = "/manus-storage/ZYLO_b0d5fd45.png";

type AuthMode = "choose" | "phone_number" | "phone_otp" | "phone_name";

export default function SignIn() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const [mode, setMode] = useState<AuthMode>("choose");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  // ── Paystack-style OAuth login URL ─────────────────────────────────────
  const getLoginUrl = () => {
    const { VITE_OAUTH_PORTAL_URL, VITE_APP_ID } = import.meta.env;
    const state = btoa(
      JSON.stringify({ origin: window.location.origin, returnPath: "/" })
    );
    return `${VITE_OAUTH_PORTAL_URL}/oauth/authorize?client_id=${VITE_APP_ID}&state=${state}&redirect_uri=${window.location.origin}/api/oauth/callback`;
  };

  // ── Phone OTP mutations ─────────────────────────────────────────────────
  const sendOtpMutation = trpc.phoneAuth.sendOtp.useMutation({
    onSuccess: () => {
      toast.success("OTP sent! Check your phone.");
      setMode("phone_otp");
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyOtpMutation = trpc.phoneAuth.verifyOtp.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        if (!name) {
          setMode("phone_name");
        } else {
          toast.success("Welcome to ZYLOBRIDGE!");
          window.location.href = "/";
        }
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSendOtp = () => {
    const cleaned = phone.trim();
    if (!cleaned) return toast.error("Please enter your phone number.");
    sendOtpMutation.mutate({ phone: cleaned });
  };

  const handleVerifyOtp = () => {
    if (otp.length < 4) return toast.error("Enter the full OTP code.");
    verifyOtpMutation.mutate({ phone, otp, name: name || undefined });
  };

  const handleResend = () => {
    if (countdown > 0) return;
    sendOtpMutation.mutate({ phone });
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #0a0d14 0%, #0d1117 60%, #0f0a1e 100%)" }}
    >
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(124,58,237,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow orbs */}
      <div className="pointer-events-none fixed top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }} />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <img src={LOGO_URL} alt="ZYLOBRIDGE" className="h-9 w-9 rounded-lg object-contain" />
            <span
              className="text-xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              ZYLOBRIDGE
            </span>
          </div>
        </Link>
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        </Link>
      </header>

      {/* ── Main card ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* ── CHOOSE MODE ── */}
          {mode === "choose" && (
            <div className="space-y-6">
              {/* Title */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-violet-400 uppercase bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-2">
                  <Zap className="h-3 w-3" />
                  Welcome to ZYLOBRIDGE
                </div>
                <h1
                  className="text-3xl font-extrabold text-white"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Sign In or Get Started
                </h1>
                <p className="text-gray-400 text-sm">
                  Join thousands of contractors and skilled professionals already on the platform.
                </p>
              </div>

              {/* Card */}
              <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-4">
                {/* Google OAuth button */}
                <a href={getLoginUrl()} className="block">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:bg-white/10 active:scale-[0.98] border border-white/10 bg-white/5"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                        {/* Official Google G logo */}
                        <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      </span>
                      <span className="text-left">
                        <span className="block text-sm font-bold text-white">Sign in with Google</span>
                        <span className="block text-xs text-gray-400 font-normal">Fast, secure, one-click sign in</span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </button>
                </a>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-xs text-gray-500 font-medium">or</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                {/* Phone OTP button */}
                <button
                  onClick={() => setMode("phone_number")}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-violet-500/30 transition-all duration-200 active:scale-[0.98]"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-violet-400" />
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-bold text-white">Continue with Phone Number</span>
                      <span className="block text-xs text-gray-500 font-normal">Receive a one-time code via SMS</span>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </button>

                {/* Trust indicators */}
                <div className="pt-2 flex items-center justify-center gap-5">
                  {[
                    { icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />, label: "Secure & Encrypted" },
                    { icon: <KeyRound className="h-3.5 w-3.5 text-violet-400" />, label: "No Password Needed" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      {item.icon}
                      <span className="text-[11px] text-gray-500">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms */}
              <p className="text-center text-[11px] text-gray-600 leading-relaxed">
                By continuing, you agree to ZYLOBRIDGE's{" "}
                <span className="text-violet-400 cursor-pointer hover:underline">Terms of Service</span>{" "}
                and{" "}
                <span className="text-violet-400 cursor-pointer hover:underline">Privacy Policy</span>.
              </p>
            </div>
          )}

          {/* ── PHONE NUMBER ENTRY ── */}
          {mode === "phone_number" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <button
                onClick={() => setMode("choose")}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mx-auto mb-3">
                  <Phone className="h-6 w-6 text-violet-400" />
                </div>
                <h2
                  className="text-2xl font-extrabold text-white"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Enter Your Phone
                </h2>
                <p className="text-gray-400 text-sm">
                  We'll send a one-time code to verify your number.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  className="bg-[#0d1117] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500 h-12 text-base"
                  autoFocus
                />
                <p className="text-[11px] text-gray-600">
                  Include your country code, e.g. +234 for Nigeria.
                </p>
              </div>

              <Button
                className="w-full h-12 font-bold text-base"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                onClick={handleSendOtp}
                disabled={sendOtpMutation.isPending || !phone.trim()}
              >
                {sendOtpMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending OTP...</>
                ) : (
                  <>Send OTP Code <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          )}

          {/* ── OTP VERIFICATION ── */}
          {mode === "phone_otp" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <button
                onClick={() => setMode("phone_number")}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Change number
              </button>

              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="h-6 w-6 text-emerald-400" />
                </div>
                <h2
                  className="text-2xl font-extrabold text-white"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Enter the Code
                </h2>
                <p className="text-gray-400 text-sm">
                  A 6-digit code was sent to{" "}
                  <span className="text-violet-400 font-semibold">{phone}</span>
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">One-Time Password</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  className="bg-[#0d1117] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500 h-14 text-center text-2xl tracking-[0.5em] font-bold"
                  autoFocus
                />
              </div>

              <Button
                className="w-full h-12 font-bold text-base"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                onClick={handleVerifyOtp}
                disabled={verifyOtpMutation.isPending || otp.length < 4}
              >
                {verifyOtpMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</>
                ) : (
                  <>Verify & Sign In <ShieldCheck className="h-4 w-4 ml-1" /></>
                )}
              </Button>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-gray-500">
                    Resend code in{" "}
                    <span className="text-violet-400 font-semibold tabular-nums">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── NAME CAPTURE (first-time users) ── */}
          {mode === "phone_name" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h2
                  className="text-2xl font-extrabold text-white"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  One Last Step
                </h2>
                <p className="text-gray-400 text-sm">
                  Tell us your name so we can personalise your experience.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">Full Name</Label>
                <Input
                  type="text"
                  placeholder="e.g. Adebayo Okafor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim()) {
                      verifyOtpMutation.mutate({ phone, otp, name: name.trim() });
                    }
                  }}
                  className="bg-[#0d1117] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500 h-12 text-base"
                  autoFocus
                />
              </div>

              <Button
                className="w-full h-12 font-bold text-base"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                onClick={() => {
                  if (!name.trim()) return toast.error("Please enter your name.");
                  verifyOtpMutation.mutate({ phone, otp, name: name.trim() });
                }}
                disabled={verifyOtpMutation.isPending || !name.trim()}
              >
                {verifyOtpMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account...</>
                ) : (
                  <>Complete Sign Up <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Footer strip */}
      <footer className="relative z-10 text-center py-6 text-[11px] text-gray-700">
        © {new Date().getFullYear()} ZYLOBRIDGE · All rights reserved
      </footer>
    </div>
  );
}
