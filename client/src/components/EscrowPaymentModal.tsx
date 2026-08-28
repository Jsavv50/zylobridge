import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EscrowPaymentModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  professionalId: number;
  jobTitle: string;
  bidAmount: number;
}

type Country = "nigeria" | "south_africa";
type Step = "review" | "provider";

export default function EscrowPaymentModal({ open, onClose, jobId, professionalId, jobTitle, bidAmount }: EscrowPaymentModalProps) {
  const [country, setCountry] = useState<Country>("nigeria");
  const [step, setStep] = useState<Step>("review");
  const [authorizationUrl, setAuthorizationUrl] = useState("");
  const { data: existingEscrow } = trpc.escrow.getByJobId.useQuery({ jobId }, { enabled: open });
  const sharedError = () => toast.error("We couldn't initialize this payment. Confirm the candidate is accepted and try again.");
  const initPaystack = trpc.escrow.initPaystack.useMutation({ onSuccess: (data) => { setAuthorizationUrl(data.authorizationUrl); setStep("provider"); }, onError: sharedError });
  const initSouthAfricaEft = trpc.escrow.initSouthAfricaEft.useMutation({ onSuccess: (data) => { setAuthorizationUrl(data.authorizationUrl); setStep("provider"); }, onError: sharedError });
  const pending = initPaystack.isPending || initSouthAfricaEft.isPending;

  const beginFunding = () => {
    if (country === "south_africa") initSouthAfricaEft.mutate({ jobId, professionalId });
    else initPaystack.mutate({ jobId, professionalId });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep("review");
      setAuthorizationUrl("");
      onClose();
    }
  };

  if (existingEscrow?.status === "funded") {
    return <Dialog open={open} onOpenChange={handleOpenChange}><DialogContent className="max-w-md border-border bg-card"><DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-400" />Escrow funded</DialogTitle><DialogDescription>This job already has protected funds.</DialogDescription></DialogHeader><div className="py-6 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" /><p className="mt-4 text-lg font-semibold">{existingEscrow.currency} {Number(existingEscrow.amount).toLocaleString()}</p><p className="mt-2 text-sm text-muted-foreground">Funding status remains server-authoritative.</p></div></DialogContent></Dialog>;
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogContent className="max-w-lg border-border bg-card">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Fund escrow</DialogTitle><DialogDescription>Review the accepted engagement before continuing to the configured payment provider.</DialogDescription></DialogHeader>
      {step === "review" ? <div className="space-y-5">
        <div className="rounded-xl border border-border bg-background/40 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Job</p><p className="mt-2 font-semibold">{jobTitle}</p><p className="mt-1 text-sm text-muted-foreground">Displayed accepted bid: {bidAmount.toLocaleString()}. The server independently retrieves and verifies the payable amount.</p></div>
        <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground" htmlFor="escrow-country">Payment market</label><Select value={country} onValueChange={(value: Country) => setCountry(value)}><SelectTrigger id="escrow-country"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nigeria">Nigeria — NGN via Paystack</SelectItem><SelectItem value="south_africa">South Africa — ZAR EFT via Paystack/Ozow</SelectItem></SelectContent></Select></div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /><div><p className="font-medium">Protected provider flow</p><p className="mt-1 text-sm leading-6 text-muted-foreground">No card or bank credentials are collected by ZYLOBRIDGE. Payment is confirmed only after server-side provider verification.</p></div></div></div>
        <Button className="w-full" onClick={beginFunding} disabled={pending}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Continue securely</Button>
      </div> : <div className="space-y-5 py-2 text-center"><CreditCard className="mx-auto h-12 w-12 text-primary" /><div><p className="font-semibold">Payment request created</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Continue to the configured provider. Escrow remains pending until the callback or webhook is verified on the server.</p></div><Button asChild className="w-full"><a href={authorizationUrl} rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open secure payment</a></Button><Button variant="outline" className="w-full" onClick={() => setStep("review")}>Back to review</Button></div>}
    </DialogContent>
  </Dialog>;
}
