import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CreditCard,
  Building2,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Copy,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

interface EscrowPaymentModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  professionalId: number;
  jobTitle: string;
  bidAmount: number;
}

type PaymentMethod = "paystack" | "bank_transfer" | "south_africa_eft";
type Step = "choose" | "paystack_init" | "bank_details" | "bank_proof" | "success";

export default function EscrowPaymentModal({
  open,
  onClose,
  jobId,
  professionalId,
  jobTitle,
  bidAmount,
}: EscrowPaymentModalProps) {
  const [country, setCountry] = useState<"nigeria" | "south_africa">("nigeria");
  const [method, setMethod] = useState<PaymentMethod>("paystack");
  const [step, setStep] = useState<Step>("choose");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedAccount, setResolvedAccount] = useState<{ account_name: string; account_number: string } | null>(null);
  const [bankName, setBankName] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
    const [paystackUrl, setPaystackUrl] = useState("");
  const { data: banks } = trpc.escrow.listBanks.useQuery(undefined, { enabled: country === "nigeria" && method === "bank_transfer" });
  const { data: existingEscrow, refetch: refetchEscrow } = trpc.escrow.getByJobId.useQuery({ jobId });

  const initPaystack = trpc.escrow.initPaystack.useMutation({
    onSuccess: (data) => {
      setPaystackUrl(data.authorizationUrl);
      setStep("paystack_init");
    },
    onError: (e) => toast.error(e.message),
  });

  const initSouthAfricaEft = trpc.escrow.initSouthAfricaEft.useMutation({
    onSuccess: (data) => {
      setPaystackUrl(data.authorizationUrl);
      setStep("paystack_init");
    },
    onError: (e) => toast.error(e.message),
  });
  const initBankTransfer = trpc.escrow.initBankTransfer.useMutation({
    onSuccess: () => {
      setStep("bank_details");
    },
    onError: (e) => toast.error(e.message),
  });

  const resolveAccount = trpc.escrow.resolveAccount.useMutation({
    onSuccess: (data) => {
      setResolvedAccount(data);
    },
    onError: (e) => {
      toast.error("Could not resolve account: " + e.message);
      setResolvedAccount(null);
    },
  });

  const uploadProof = trpc.escrow.uploadTransferProof.useMutation({
    onSuccess: () => {
      setStep("success");
      refetchEscrow();
      toast.success("Transfer proof uploaded. Admin will confirm within 24 hours.");
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyPaystack = trpc.escrow.verifyPaystack.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setStep("success");
        refetchEscrow();
        toast.success("Payment verified! Escrow funded successfully.");
      } else {
        toast.info(`Payment status: ${data.status}. Escrow remains pending.`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // Auto-resolve account when number + bank code are ready
  useEffect(() => {
    if (accountNumber.length === 10 && bankCode) {
      resolveAccount.mutate({ accountNumber, bankCode });
    } else {
      setResolvedAccount(null);
    }
  }, [accountNumber, bankCode]);

  // Listen for Paystack callback in new tab
  useEffect(() => {
    if (step !== "paystack_init") return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "paystack_callback" && e.data?.reference) {
        verifyPaystack.mutate({ reference: e.data.reference });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [step]);

  const handlePaystackInit = () => {
    if (country === "south_africa") {
      initSouthAfricaEft.mutate({ jobId, professionalId, amount: bidAmount });
      return;
    }
    initPaystack.mutate({
      jobId,
      professionalId,
      amount: bidAmount,
      callbackUrl: window.location.origin + "/payment/callback",
    });
  };

  const handleBankTransferInit = () => {
    if (!resolvedAccount || !bankCode) {
      toast.error("Please resolve your account number first.");
      return;
    }
    const selectedBank = banks?.find((b: { code: string; name: string }) => b.code === bankCode);
    initBankTransfer.mutate({
      jobId,
      professionalId,
      amount: bidAmount,
      bankAccountNumber: accountNumber,
      bankAccountName: resolvedAccount.account_name,
      bankName: selectedBank?.name || bankName,
    });
  };

  const handleUploadProof = async () => {
    if (!proofFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadProof.mutate({
        jobId,
        fileBase64: base64,
        fileName: proofFile.name,
        mimeType: proofFile.type,
      });
    };
    reader.readAsDataURL(proofFile);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // If escrow already funded
  if (existingEscrow?.status === "funded") {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              Escrow Funded
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-foreground font-semibold text-lg">₦{Number(existingEscrow.amount).toLocaleString()} secured</p>
            <p className="text-muted-foreground text-sm mt-2">
              Funds are held in escrow and will be released to the professional upon job completion.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Fund Escrow
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Secure <strong className="text-foreground">{country === "south_africa" ? "R" : "₦"}{bidAmount.toLocaleString()}</strong> for <em>{jobTitle}</em>
          </DialogDescription>
        </DialogHeader>

        {/* Step: Choose method */}
        {step === "choose" && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Protected by ZYLOBRIDGE Escrow</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Funds are held securely and only released when you confirm the job is complete.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Payment country</Label>
              <Select value={country} onValueChange={(value: "nigeria" | "south_africa") => {
                setCountry(value);
                setMethod(value === "south_africa" ? "south_africa_eft" : "paystack");
                setBankCode("");
                setAccountNumber("");
              }}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="nigeria">Nigeria — NGN</SelectItem>
                  <SelectItem value="south_africa">South Africa — ZAR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMethod(country === "south_africa" ? "south_africa_eft" : "paystack")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  (method === "paystack" || method === "south_africa_eft")
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <CreditCard className="h-6 w-6 text-primary mb-2" />
                <p className="font-semibold text-foreground text-sm">{country === "south_africa" ? "EFT" : "Card / USSD"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{country === "south_africa" ? "Pay securely with Ozow via Paystack" : "Pay with Paystack"}</p>
                <Badge variant="secondary" className="mt-2 text-xs">Instant</Badge>
              </button>

              <button
                type="button"
                disabled={country !== "nigeria"}
                onClick={() => country === "nigeria" && setMethod("bank_transfer")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  method === "bank_transfer" && country === "nigeria"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Building2 className="h-6 w-6 text-primary mb-2" />
                <p className="font-semibold text-foreground text-sm">Bank Transfer</p>
                <p className="text-xs text-muted-foreground mt-0.5">{country === "nigeria" ? "Manual Nigerian transfer" : "Unavailable for this country"}</p>
                <Badge variant="outline" className="mt-2 text-xs">1–24 hrs</Badge>
              </button>
            </div>

            {country === "south_africa" && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                South African EFT is processed through Paystack’s documented Ozow provider in ZAR. No local bank account details are collected or hardcoded here.
              </div>
            )}

            {method === "bank_transfer" && country === "nigeria" && (
              <div className="space-y-3 pt-2">
                <Separator />
                <p className="text-sm font-medium text-foreground">Your bank details (for our records)</p>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Select Bank</Label>
                  <Select value={bankCode} onValueChange={setBankCode}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Choose your bank" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-48">
                      {banks?.map((bank: { id: number; code: string; name: string }) => (
                        <SelectItem key={bank.id} value={bank.code}>{bank.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Account Number</Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit account number"
                    className="bg-background border-border"
                  />
                  {resolveAccount.isPending && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Resolving account...
                    </p>
                  )}
                  {resolvedAccount && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {resolvedAccount.account_name}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={method === "bank_transfer" ? handleBankTransferInit : handlePaystackInit}
              disabled={
                initPaystack.isPending ||
                initSouthAfricaEft.isPending ||
                initBankTransfer.isPending ||
                (method === "bank_transfer" && (!resolvedAccount || !bankCode))
              }
              className="w-full bg-primary hover:bg-primary/90"
            >
              {initPaystack.isPending || initSouthAfricaEft.isPending || initBankTransfer.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {method === "bank_transfer" ? "Get Transfer Details" : country === "south_africa" ? "Continue with South African EFT" : "Pay with Paystack"}
            </Button>
          </div>
        )}

        {/* Step: Paystack redirect */}
        {step === "paystack_init" && (
          <div className="space-y-4 text-center py-4">
            <CreditCard className="h-12 w-12 text-primary mx-auto" />
            <p className="font-semibold text-foreground">Complete Payment on Paystack</p>
            <p className="text-sm text-muted-foreground">
              Click the button below to open the secure Paystack payment page. Return here after completing payment.
            </p>
            <Button
              asChild
              className="w-full bg-primary hover:bg-primary/90"
            >
              <a href={paystackUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Paystack Payment
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">After payment, paste your reference below to verify:</p>
            <div className="flex gap-2">
              <Input
                id="paystack-ref"
                placeholder="Paste Paystack reference (e.g. ZB-ESC-...)"
                className="bg-background border-border text-sm"
              />
              <Button
                variant="outline"
                onClick={() => {
                  const ref = (document.getElementById("paystack-ref") as HTMLInputElement)?.value;
                  if (ref) verifyPaystack.mutate({ reference: ref });
                }}
                disabled={verifyPaystack.isPending}
              >
                {verifyPaystack.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Bank transfer instructions */}
        {step === "bank_details" && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400">
                  Transfer the exact amount to the account below. Include the narration so we can match your payment.
                </p>
              </div>
            </div>

            {[
              { label: "Bank Name", value: "Zenith Bank" },
              { label: "Account Number", value: "1234567890" },
              { label: "Account Name", value: "ZYLOBRIDGE ESCROW SERVICES LTD" },
              { label: "Amount", value: `₦${bidAmount.toLocaleString()}` },
              { label: "Narration", value: `ZYLOBRIDGE-JOB-${jobId}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-mono font-semibold text-foreground text-sm">{value}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => copyToClipboard(value)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            <Separator />
            <p className="text-sm font-medium text-foreground">Upload payment proof</p>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              className="bg-background border-border"
            />
            <Button
              onClick={handleUploadProof}
              disabled={!proofFile || uploadProof.isPending}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {uploadProof.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Transfer Proof
            </Button>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <p className="text-xl font-bold text-foreground">Escrow Initiated!</p>
            <p className="text-muted-foreground text-sm">
              {method === "paystack"
                ? "Your payment has been verified and funds are secured in escrow."
                : "Your transfer proof has been submitted. Admin will confirm within 24 hours."}
            </p>
            <Button onClick={onClose} className="bg-primary hover:bg-primary/90">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
