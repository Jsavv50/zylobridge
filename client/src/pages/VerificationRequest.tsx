import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  ShieldCheck,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { formatDistanceToNow } from "date-fns";

const DOCUMENT_TYPES = [
  { value: "trade_licence", label: "Trade Licence" },
  { value: "certification", label: "Professional Certification" },
  { value: "government_id", label: "Government-Issued ID" },
  { value: "insurance_certificate", label: "Insurance Certificate" },
  { value: "guild_membership", label: "Guild / Union Membership" },
] as const;

type DocumentType = typeof DOCUMENT_TYPES[number]["value"];

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
  return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
}

export default function VerificationRequest() {
  const { user, isAuthenticated, loading } = useAuth();
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: myRequests, refetch } = trpc.verification.myRequests.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const submitMutation = trpc.verification.submit.useMutation({
    onSuccess: () => {
      toast.success("Verification request submitted! Admin will review within 2–3 business days.");
      setSubmitted(true);
      setFile(null);
      setDocumentType("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !documentType) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      submitMutation.mutate({
        documentType,
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <ShieldCheck className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Sign in to request verification</h2>
          <Button asChild><a href={getLoginUrl()}>Sign In</a></Button>
        </div>
      </div>
    );
  }

  const hasPending = myRequests?.some((r: { status: string }) => r.status === "pending");
  const isVerified = user?.isVerified;

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Professional Verification</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Get verified to display a trusted badge on your profile and applications, boosting your credibility with contractors.
          </p>
        </div>

        {/* Already verified */}
        {isVerified && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center mb-8">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-lg font-bold text-foreground">You are Verified!</p>
            <p className="text-muted-foreground text-sm mt-1">
              Your ZYLOBRIDGE Verified badge is active on your profile and all applications.
            </p>
          </div>
        )}

        {/* Benefits */}
        {!isVerified && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: ShieldCheck, title: "Verified Badge", desc: "Displayed on your profile and bids" },
              { icon: CheckCircle2, title: "Higher Trust", desc: "Contractors prefer verified professionals" },
              { icon: FileText, title: "Secure Process", desc: "Documents stored encrypted, reviewed by admins" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-xl p-4 text-center">
                <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Submission form */}
        {!isVerified && !hasPending && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Submit Verification Document</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Document Type</Label>
                <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {DOCUMENT_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Upload Document</Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    file ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <input
                    type="file"
                    id="doc-upload"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="doc-upload" className="cursor-pointer">
                    {file ? (
                      <div className="space-y-1">
                        <FileText className="h-8 w-8 text-primary mx-auto" />
                        <p className="text-sm font-medium text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PDF, JPG, PNG — max 5 MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400">
                    Documents are reviewed by ZYLOBRIDGE admins within 2–3 business days. Ensure the document is clear, valid, and not expired.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!file || !documentType || submitMutation.isPending}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Submit for Verification
              </Button>
            </form>
          </div>
        )}

        {hasPending && !isVerified && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
            <Clock className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <p className="text-lg font-bold text-foreground">Under Review</p>
            <p className="text-muted-foreground text-sm mt-1">
              Your verification request is being reviewed. You will be notified once a decision is made.
            </p>
          </div>
        )}

        {/* Request history */}
        {myRequests && myRequests.length > 0 && (
          <div className="mt-8">
            <Separator className="mb-6" />
            <h2 className="text-lg font-bold text-foreground mb-4">Request History</h2>
            <div className="space-y-3">
              {myRequests.map((req: { id: number; documentType: string; status: string; adminNote?: string | null; createdAt: Date; reviewedAt?: Date | null }) => (
                <div key={req.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground text-sm">
                      {DOCUMENT_TYPES.find((d) => d.value === req.documentType)?.label || req.documentType}
                    </p>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                  </p>
                  {req.adminNote && (
                    <div className="mt-2 p-2 bg-background rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Admin note: <span className="text-foreground">{req.adminNote}</span></p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
