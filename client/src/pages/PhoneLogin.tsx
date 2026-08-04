import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Phone, ShieldCheck, ArrowLeft, KeyRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Step = "phone" | "otp" | "name";

export default function PhoneLogin() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const sendOtpMutation = trpc.phoneAuth.sendOtp.useMutation({
    onSuccess: () => {
      toast.success("OTP sent! Check your phone.");
      setStep("otp");
      // 60-second resend countdown
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    },
    onError: (err) => toast.error(err.message || "Failed to send OTP."),
  });

  const verifyOtpMutation = trpc.phoneAuth.verifyOtp.useMutation({
    onSuccess: () => {
      toast.success("Phone verified! Welcome to ZYLOBRIDGE.");
      window.location.href = "/";
    },
    onError: (err) => toast.error(err.message || "Invalid OTP. Please try again."),
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast.error("Please enter your phone number."); return; }
    sendOtpMutation.mutate({ phone: phone.trim() });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) { toast.error("Please enter the 6-digit OTP."); return; }
    verifyOtpMutation.mutate({ phone: phone.trim(), otp: otp.trim(), name: name.trim() || undefined });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          {/* Back link */}
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <Card className="bg-card border-border shadow-2xl shadow-primary/10">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                {step === "phone" ? (
                  <Phone className="w-8 h-8 text-primary" />
                ) : (
                  <KeyRound className="w-8 h-8 text-primary" />
                )}
              </div>
              <CardTitle className="text-2xl font-extrabold text-foreground">
                {step === "phone" ? "Sign In with Phone" : "Enter Your OTP"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {step === "phone"
                  ? "Enter your phone number to receive a one-time password."
                  : `We sent a 6-digit code to ${phone}. Enter it below.`}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {step === "phone" && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground font-medium">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+234 800 000 0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10 bg-background border-border focus:border-primary"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Include your country code, e.g. +234 for Nigeria.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11"
                    disabled={sendOtpMutation.isPending}
                  >
                    {sendOtpMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending OTP...</>
                    ) : (
                      <><Phone className="w-4 h-4 mr-2" />Send OTP</>
                    )}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Link href="/">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-border text-foreground hover:bg-muted"
                      onClick={() => window.location.href = `${import.meta.env.VITE_OAUTH_PORTAL_URL ?? ""}/oauth/authorize?app_id=${import.meta.env.VITE_APP_ID}&redirect_uri=${encodeURIComponent(window.location.origin + "/api/oauth/callback")}&state=${encodeURIComponent(JSON.stringify({ origin: window.location.origin }))}`}
                    >
                      Sign In with Manus Account
                    </Button>
                  </Link>
                </form>
              )}

              {step === "otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground font-medium">
                      Your Name <span className="text-muted-foreground font-normal">(optional for new accounts)</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g. John Adeyemi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-background border-border focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-foreground font-medium">
                      One-Time Password
                    </Label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="pl-10 bg-background border-border focus:border-primary text-center text-2xl tracking-[0.5em] font-mono"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      OTP expires in 10 minutes. Max 5 attempts.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11"
                    disabled={verifyOtpMutation.isPending || otp.length !== 6}
                  >
                    {verifyOtpMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4 mr-2" />Verify & Sign In</>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => { setStep("phone"); setOtp(""); }}
                    >
                      ← Change number
                    </button>
                    <button
                      type="button"
                      className={`transition-colors ${countdown > 0 ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:text-primary/80"}`}
                      disabled={countdown > 0 || sendOtpMutation.isPending}
                      onClick={() => sendOtpMutation.mutate({ phone: phone.trim() })}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                    </button>
                  </div>
                </form>
              )}

              {/* Security note */}
              <div className="mt-6 p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Your phone number is stored securely and never shared with third parties. OTPs are
                  single-use and expire after 10 minutes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
