import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationShell, EmptyState, PageHeader } from "@/components/shell/ZyloShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PaymentCallback() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();
  const submittedReference = useRef<string | null>(null);
  const query = new URLSearchParams(location.split("?")[1] ?? "");
  const reference = query.get("reference") ?? query.get("ref");
  const isMilestone = Boolean(reference?.startsWith("ZB-MS-"));
  const legacyVerify = trpc.escrow.verifyPaystack.useMutation();
  const milestoneVerify = trpc.finance.verifyPayment.useMutation();
  const activeVerify = isMilestone ? milestoneVerify : legacyVerify;

  useEffect(() => {
    if (!isAuthenticated || !reference || submittedReference.current === reference) return;
    submittedReference.current = reference;
    if (isMilestone) milestoneVerify.mutate({ reference });
    else legacyVerify.mutate({ reference });
  }, [isAuthenticated, reference, isMilestone]);

  const confirmed = isMilestone ? Boolean(milestoneVerify.data?.success) : legacyVerify.data?.status === "success";
  const pendingStatus = isMilestone ? "pending verification" : legacyVerify.data?.status ?? "pending";

  if (loading || (isAuthenticated && reference && activeVerify.isPending)) {
    return <ApplicationShell><div className="flex min-h-[60vh] items-center justify-center"><div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Verifying your payment securely…</div></div></ApplicationShell>;
  }
  if (!isAuthenticated) {
    return <ApplicationShell><EmptyState icon={ShieldCheck} title="Sign in to verify this payment" description="Your payment reference is preserved. Sign in to complete secure server-side verification." action={<Link href={`/sign-in?returnTo=${encodeURIComponent(location)}`}><Button>Sign in</Button></Link>} /></ApplicationShell>;
  }
  if (!reference) {
    return <ApplicationShell><EmptyState icon={AlertCircle} title="Payment reference missing" description="Open the confirmation link from the payment provider again, or return to escrow funding." action={<Link href="/payments"><Button><ArrowLeft className="mr-2 h-4 w-4" />Back to payments</Button></Link>} /></ApplicationShell>;
  }
  if (activeVerify.error) {
    return <ApplicationShell><PageHeader title="Payment needs attention" description="We could not confirm this payment reference." /><div className="mx-auto max-w-2xl rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" /><div><p className="font-semibold text-foreground">Payment not confirmed</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your financial data remains protected. Confirm you are signed in to the funding account, then retry. No payment is marked funded from this screen alone.</p><p className="mt-3 break-all font-mono text-xs text-muted-foreground">Reference: {reference}</p><div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" onClick={() => { submittedReference.current = null; window.location.reload(); }}>Try again</Button><Button variant="outline" asChild><Link href="/payments"><ArrowLeft className="mr-2 h-4 w-4" />Return to payments</Link></Button></div></div></div></div></ApplicationShell>;
  }
  if (!confirmed) {
    return <ApplicationShell><PageHeader title="Payment processing" description="Your payment has not been confirmed as successful yet." /><div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><p className="font-semibold text-foreground">Status: {pendingStatus}</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">You can safely return later. Escrow remains pending until the provider confirms the transaction and the server verifies its reference, amount, and currency.</p><p className="mt-3 break-all font-mono text-xs text-muted-foreground">Reference: {reference}</p><Link href={`/payment/callback?reference=${encodeURIComponent(reference)}`} className="mt-5 inline-flex"><Button variant="outline">Check again</Button></Link></div></div></div></ApplicationShell>;
  }
  return <ApplicationShell><PageHeader title="Payment confirmed" description="The provider verified your escrow funding successfully." /><div className="mx-auto max-w-2xl rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div><p className="font-semibold text-foreground">Escrow funded securely</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">The verified payment is recorded against the authorized engagement. Refreshing this page will not process the transaction twice.</p><p className="mt-3 break-all font-mono text-xs text-muted-foreground">Reference: {reference}</p><Link href="/payments" className="mt-5 inline-flex"><Button><ArrowLeft className="mr-2 h-4 w-4" />Back to payments</Button></Link></div></div></div></ApplicationShell>;
}
