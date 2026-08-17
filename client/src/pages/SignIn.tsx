import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

// Railway backend base URL — must be set in Vercel env vars as VITE_API_URL
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");

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

const LOGO_URL = "/ZYLO.png";

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

  // Verified user stored after first (and only) verifyOtp call
  const [verifiedUserId, setVerifiedUserId] = useState<number | null>(null);

  // Prevent multiple Google OAuth initiation clicks
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);

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

  // Handle Google OAuth click with double-click / duplicate navigation safeguard
  const handleGoogleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (isGoogleRedirecting) return;
    setIsGoogleRedirecting(true);
    const returnPath = window.location.pathname === "/sign-in" ? "/" : window.location.pathname;
    const targetUrl = `${API_URL}/api/auth/google?returnPath=${encodeURIComponent(returnPath)}`;
    window.location.href = targetUrl;
  };

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
    retry: false,
    onSuccess: (data) => {
      if (data.success) {
        if (data.user?.id) setVerifiedUserId(data.user.id);
        if (!name && !data.user?.name) {
          setNameCaptureFor("email");
          setMethod("name_capture");
        } else {
          toast.success("Welcome to ZYLOBRIDGE!");
          window.location.href = "/";
        }
      }
    },
    onError: (err) => {
      if (err.message.toLowerCase().includes("expired") || err.message.toLowerCase().includes("invalid")) {
        toast.error("This code has expired or is invalid. Please request a new one.");
      } else {
        toast.error(err.message);
      }
    },
  });

  // ── Phone OTP mutations ────────────────────────────────────────────────    const sendPhoneOtp = trpc.phoneAuth.sendOtp.useMutation({
  const sendPhoneOtp = trpc.phoneAuth.sendOtp.useMutation({
    onSuccess: () => {
      toast.success("OTP sent! Check your SMS messages.");
      setMethod("phone_otp");
      setCountdown(60);
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyPhoneOtp = trpc.phoneAuth.verifyOtp.useMutation({
    retry: false,
    onSuccess: (data) => {
      if (data.success) {
        if (data.user?.id) setVerifiedUserId(data.user.id);
        if (!name && !data.user?.name) {
          setNameCaptureFor("phone");
          setMethod("name_capture");
        } else {
          toast.success("Welcome to ZYLOBRIDGE!");
          window.location.href = "/";
        }
      }
    },
    onError: (err) => {
      if (err.message.toLowerCase().includes("expired") || err.message.toLowerCase().includes("invalid")) {
        toast.error("This code has expired or is invalid. Please request a new one.");
      } else {
        toast.error(err.message);
      }
    },
  });

  const completeEmailName = trpc.emailAuth.completeName.useMutation({
    onSuccess: () => {
      toast.success("Account set up successfully!");
      window.location.href = "/";
    },
    onError: (err: any) => toast.error(err.message),
  });

  const completePhoneName = trpc.phoneAuth.completeName.useMutation({
    onSuccess: () => {
      toast.success("Account set up successfully!");
      window.location.href = "/";
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleCompleteName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (nameCaptureFor === "email") {
      completeEmailName.mutate({ name: name.trim(), userId: verifiedUserId ?? undefined });
    } else {
      completePhoneName.mutate({ name: name.trim(), userId: verifiedUserId ?? undefined });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white flex flex-col justify-between relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="w-full border-b border-white/8 bg-[#0a0e17]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30 group-hover:scale-105 transition-transform">
              <img src={LOGO_URL} alt="Logo" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ZYLOBRIDGE
            </span>
          </div>
        </Link>
        <Link href="/">
          <span className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {method === "choose" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-400 text-xs font-semibold mb-2">
                  <Zap className="h-3.5 w-3.5" /> Secure Authentication
                </div>
                <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Sign In or Get Started
                </h1>
                <p className="text-gray-400 text-sm">
                  Join thousands of contractors and skilled professionals already on the platform.
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-4">
                {/* Google OAuth with click safeguard */}
                <a
                  href={`${API_URL}/api/auth/google`}
                  onClick={handleGoogleClick}
                  className={`block ${isGoogleRedirecting ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <button
                    disabled={isGoogleRedirecting}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:bg-white/10 active:scale-[0.98] border border-white/10 bg-white/5 cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                        {isGoogleRedirecting ? (
                          <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        )}
                      </span>
                      <span className="text-left">
                        <span className="block text-sm font-bold text-white">
                          {isGoogleRedirecting ? "Connecting to Google..." : "Sign in with Google"}
                        </span>
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
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-violet-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
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
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-violet-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
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
              <button onClick={() => setMethod("choose")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Sign in with Email</h2>
                <p className="text-sm text-gray-400">Enter your email address to receive a 6-digit verification code.</p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!email || !email.includes("@")) {
                    toast.error("Please enter a valid email address");
                    return;
                  }
                  sendEmailOtp.mutate({ email });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sendEmailOtp.isPending}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-600/25"
                >
                  {sendEmailOtp.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Verification Code
                </Button>
              </form>
            </div>
          )}

          {/* ── EMAIL OTP ── */}
          {method === "email_otp" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <button onClick={() => setMethod("email_input")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                <ArrowLeft className="h-4 w-4" /> Change Email
              </button>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Enter Verification Code</h2>
                <p className="text-sm text-gray-400">We sent a 6-digit code to <span className="text-white font-medium">{email}</span>.</p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (emailOtp.length !== 6) {
                    toast.error("Please enter the full 6-digit code");
                    return;
                  }
                  verifyEmailOtp.mutate({ email, otp: emailOtp });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-center tracking-widest text-lg font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={verifyEmailOtp.isPending}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-600/25"
                >
                  {verifyEmailOtp.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verify & Sign In
                </Button>
                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-gray-500">Didn't receive the code?</span>
                  <button
                    type="button"
                    disabled={countdown > 0 || sendEmailOtp.isPending}
                    onClick={() => sendEmailOtp.mutate({ email })}
                    className="text-violet-400 hover:underline disabled:text-gray-600 disabled:no-underline cursor-pointer font-medium"
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── PHONE INPUT ── */}
          {method === "phone_input" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <button onClick={() => setMethod("choose")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Sign in with Phone</h2>
                <p className="text-sm text-gray-400">Enter your phone number (e.g. +1234567890) to receive an SMS code.</p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!phone || phone.length < 8) {
                    toast.error("Please enter a valid phone number");
                    return;
                  }
                  sendPhoneOtp.mutate({ phone });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sendPhoneOtp.isPending}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-600/25"
                >
                  {sendPhoneOtp.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send SMS Code
                </Button>
              </form>
            </div>
          )}

          {/* ── PHONE OTP ── */}
          {method === "phone_otp" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <button onClick={() => setMethod("phone_input")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                <ArrowLeft className="h-4 w-4" /> Change Phone
              </button>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Enter SMS Code</h2>
                <p className="text-sm text-gray-400">We sent a 6-digit code to <span className="text-white font-medium">{phone}</span>.</p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (phoneOtp.length !== 6) {
                    toast.error("Please enter the full 6-digit code");
                    return;
                  }
                  verifyPhoneOtp.mutate({ phone, otp: phoneOtp });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="potp">SMS Verification Code</Label>
                  <Input
                    id="potp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-center tracking-widest text-lg font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={verifyPhoneOtp.isPending}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-600/25"
                >
                  {verifyPhoneOtp.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verify & Sign In
                </Button>
                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-gray-500">Didn't receive the SMS?</span>
                  <button
                    type="button"
                    disabled={countdown > 0 || sendPhoneOtp.isPending}
                    onClick={() => sendPhoneOtp.mutate({ phone })}
                    className="text-violet-400 hover:underline disabled:text-gray-600 disabled:no-underline cursor-pointer font-medium"
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Resend SMS"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── NAME CAPTURE ── */}
          {method === "name_capture" && (
            <div className="rounded-2xl border border-white/8 bg-[#131a26]/80 backdrop-blur-sm p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">What is your name?</h2>
                <p className="text-sm text-gray-400">Please provide your name to complete your ZYLOBRIDGE account profile.</p>
              </div>
              <form onSubmit={handleCompleteName} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullname">Full Name</Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={nameCaptureFor === "email" ? completeEmailName.isPending : completePhoneName.isPending}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-600/25"
                >
                  {(nameCaptureFor === "email" ? completeEmailName.isPending : completePhoneName.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Complete Sign Up
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/8 py-6 text-center text-xs text-gray-600">
        &copy; {new Date().getFullYear()} ZYLOBRIDGE. All rights reserved.
      </footer>
    </div>
  );
}
