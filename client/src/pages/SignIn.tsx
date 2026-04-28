import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Phone,
  Mail,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const LOGO_URL = "/manus-storage/ZYLO_b0d5fd45.png";

type AuthMethod = "choose" | "email_input" | "email_otp" | "phone_input" | "phone_otp" | "name_capture";
type NameCaptureFor = "email" | "phone";

export default function SignIn() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const [method, setMethod] = useState<AuthMethod>("choose");
  const [nameCaptureFor, setNameCaptureFor] = useState<NameCaptureFor>("email");

  // Email state
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");

  // Phone state
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");

  // Shared
  const [name, setName] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Email OTP mutations ────────────────────────────────────────────────────
  const sendEmailOtp = trpc.emailAuth.sendOtp.useMutation({
    onSuccess: () => {
      toast.success("OTP sent! Check your email inbox.");
      setMethod("email_otp");
      setCountdown(60);
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyEmailOtp = trpc.emailAuth.verifyOtp.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        if (!name) {
          setNameCaptureFor("email");
          setMethod("name_capture");
        } else {
          toast.success("Welcome to ZYLOBRIDGE!");
          window.location.href = "/";
        }
      }
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Phone OTP mutations ────────────────────────────────────────────────────
  const sendPhoneOtp = trpc.phoneAuth.sendOtp.useMutation({
    onSuccess: () => {
      toast.success("OTP sent! Check your SMS messages.");
      setMethod("phone_otp");
      setCountdown(60);
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyPhoneOtp = trpc.phoneAuth.verifyOtp.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        if (!name) {
          setNameCaptureFor("phone");
          setMethod("name_capture");
        } else {
          toast.success("Welcome to ZYLOBRIDGE!");
          window.location.href = "/";
        }
      }
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Name capture mutation (re-verify with name) ────────────────────────────
  const handleCompleteName = () => {
    if (!name.trim()) return toast.error("Please enter your name.");
    if (nameCaptureFor === "email") {
      verifyEmailOtp.mutate({ email, otp: emailOtp, name: name.trim() });
    } else {
      verifyPhoneOtp.mutate({ phone, otp: phoneOtp, name: name.trim() });
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    if (method === "email_otp") sendEmailOtp.mutate({ email });
    else if (method === "phone_otp") sendPhoneOtp.mutate({ phone });
  };

  const isLoading =
    sendEmailOtp.isPending || verifyEmailOtp.isPending ||
    sendPhoneOtp.isPending || verifyPhoneOtp.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #0a0d14 0%, #0d1117 60%, #0f0a1e 100%)" }}
    >
      {/* Grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(124,58,237,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Glow orb */}
      <div
        className="pointer-events-none fixed top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <img src={LOGO_URL} alt="ZYLOBRIDGE" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-xl font-extrabold tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ZYLOBRIDGE
            </span>
          </div>
        </Link>
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
        </Link>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* ── CHOOSE METHOD ── */}
          {method === "choose" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-violet-400 uppercase bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-2">
                  <Zap className="h-3 w-3" /> Welcome to ZYLOBRIDGE
                </div>
                <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Sign In or Get Started
                </h1>
                <p className="text-gray-400 text-sm">
                  Join thousands of contractors and skilled professionals already on the platform.
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-4">
                {/* Google OAuth — uses the correct platform OAuth URL */}
                <a href={getLoginUrl()} className="block">
                  <button className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:bg-white/10 active:scale-[0.98] border border-white/10 bg-white/5">
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
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

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-xs text-gray-500 font-medium">or continue with</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                {/* Email OTP */}
                <button
                  onClick={() => setMethod("email_input")}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-violet-500/30 transition-all duration-200 active:scale-[0.98]"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-violet-400" />
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-bold text-white">Sign in with Email</span>
                      <span className="block text-xs text-gray-500 font-normal">Receive a one-time code via email</span>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </button>

                {/* Phone OTP */}
                <button
                  onClick={() => setMethod("phone_input")}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-violet-500/30 transition-all duration-200 active:scale-[0.98]"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-violet-400" />
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-bold text-white">Sign in with Phone Number</span>
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

              <p className="text-center text-[11px] text-gray-600 leading-relaxed">
                By continuing, you agree to ZYLOBRIDGE's{" "}
                <span className="text-violet-400 cursor-pointer hover:underline">Terms of Service</span>{" "}
                and{" "}
                <span className="text-violet-400 cursor-pointer hover:underline">Privacy Policy</span>.
              </p>
            </div>
          )}

          {/* ── EMAIL INPUT ── */}
          {method === "email_input" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <button onClick={() => setMethod("choose")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-violet-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Enter Your Email
                </h2>
                <p className="text-gray-400 text-sm">We'll send a one-time code to verify your address.</p>
              </div>
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">Email Address</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendEmailOtp.mutate({ email })}
                  className="bg-[#0d1117] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500 h-12 text-base"
                  autoFocus
                />
              </div>
              <Button
                className="w-full h-12 font-bold text-base"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                onClick={() => sendEmailOtp.mutate({ email })}
                disabled={sendEmailOtp.isPending || !email.trim()}
              >
                {sendEmailOtp.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <>Send OTP Code <ChevronRight className="h-4 w-4 ml-1" /></>}
              </Button>
            </div>
          )}

          {/* ── EMAIL OTP VERIFY ── */}
          {method === "email_otp" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <button onClick={() => setMethod("email_input")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4" /> Change email
              </button>
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="h-6 w-6 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Enter the Code
                </h2>
                <p className="text-gray-400 text-sm">
                  A 6-digit code was sent to <span className="text-violet-400 font-semibold">{email}</span>
                </p>
                <p className="text-xs text-amber-400">Check your inbox and spam folder.</p>
              </div>
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">One-Time Password</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && verifyEmailOtp.mutate({ email, otp: emailOtp, name: name || undefined })}
                  className="bg-[#0d1117] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500 h-14 text-center text-2xl tracking-[0.5em] font-bold"
                  autoFocus
                />
              </div>
              <Button
                className="w-full h-12 font-bold text-base"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                onClick={() => verifyEmailOtp.mutate({ email, otp: emailOtp, name: name || undefined })}
                disabled={verifyEmailOtp.isPending || emailOtp.length < 6}
              >
                {verifyEmailOtp.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</> : <><ShieldCheck className="h-4 w-4 mr-1" />Verify & Sign In</>}
              </Button>
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-gray-500">Resend in <span className="text-violet-400 font-semibold tabular-nums">{countdown}s</span></p>
                ) : (
                  <button onClick={handleResend} className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors">Resend OTP</button>
                )}
              </div>
            </div>
          )}

          {/* ── PHONE INPUT ── */}
          {method === "phone_input" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <button onClick={() => setMethod("choose")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mx-auto mb-3">
                  <Phone className="h-6 w-6 text-violet-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Enter Your Phone
                </h2>
                <p className="text-gray-400 text-sm">We'll send a one-time code to verify your number.</p>
              </div>
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendPhoneOtp.mutate({ phone })}
                  className="bg-[#0d1117] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500 h-12 text-base"
                  autoFocus
                />
                <p className="text-[11px] text-gray-600">Include your country code, e.g. +234 for Nigeria.</p>
              </div>
              <Button
                className="w-full h-12 font-bold text-base"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                onClick={() => sendPhoneOtp.mutate({ phone })}
                disabled={sendPhoneOtp.isPending || !phone.trim()}
              >
                {sendPhoneOtp.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <>Send OTP Code <ChevronRight className="h-4 w-4 ml-1" /></>}
              </Button>
            </div>
          )}

          {/* ── PHONE OTP VERIFY ── */}
          {method === "phone_otp" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <button onClick={() => setMethod("phone_input")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4" /> Change number
              </button>
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="h-6 w-6 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Enter the Code
                </h2>
                <p className="text-gray-400 text-sm">
                  A 6-digit code was sent to <span className="text-violet-400 font-semibold">{phone}</span>
                </p>
              </div>
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">One-Time Password</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && verifyPhoneOtp.mutate({ phone, otp: phoneOtp, name: name || undefined })}
                  className="bg-[#0d1117] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500 h-14 text-center text-2xl tracking-[0.5em] font-bold"
                  autoFocus
                />
              </div>
              <Button
                className="w-full h-12 font-bold text-base"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                onClick={() => verifyPhoneOtp.mutate({ phone, otp: phoneOtp, name: name || undefined })}
                disabled={verifyPhoneOtp.isPending || phoneOtp.length < 6}
              >
                {verifyPhoneOtp.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</> : <><ShieldCheck className="h-4 w-4 mr-1" />Verify & Sign In</>}
              </Button>
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-gray-500">Resend in <span className="text-violet-400 font-semibold tabular-nums">{countdown}s</span></p>
                ) : (
                  <button onClick={handleResend} className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors">Resend OTP</button>
                )}
              </div>
            </div>
          )}

          {/* ── NAME CAPTURE (first-time users) ── */}
          {method === "name_capture" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  One Last Step
                </h2>
                <p className="text-gray-400 text-sm">Tell us your name so we can personalise your experience.</p>
              </div>
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">Full Name</Label>
                <Input
                  type="text"
                  placeholder="e.g. Adebayo Okafor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCompleteName()}
                  className="bg-[#0d1117] border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500 h-12 text-base"
                  autoFocus
                />
              </div>
              <Button
                className="w-full h-12 font-bold text-base"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }}
                onClick={handleCompleteName}
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account...</> : <>Complete Sign Up <ChevronRight className="h-4 w-4 ml-1" /></>}
              </Button>
            </div>
          )}

        </div>
      </main>

      <footer className="relative z-10 text-center py-6 text-[11px] text-gray-700">
        © {new Date().getFullYear()} ZYLOBRIDGE · All rights reserved
      </footer>
    </div>
  );
}
