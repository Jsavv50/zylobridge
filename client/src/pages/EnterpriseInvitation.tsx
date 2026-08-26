import { useMemo } from "react";
import { CheckCircle2, MailCheck, ShieldAlert } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function EnterpriseInvitation() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") ?? "", []);
  const accept = trpc.enterprise.acceptInvitation.useMutation({
    onSuccess: result => {
      toast.success("Invitation accepted. Welcome to the organization.");
      navigate(`/dashboard/enterprise?organizationId=${result.organizationId}`);
    },
    onError: error => toast.error(error.message),
  });
  const reject = trpc.enterprise.rejectInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation declined.");
      navigate("/");
    },
    onError: error => toast.error(error.message),
  });

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-[#0d1117] text-white"><Navbar /><main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center"><ShieldAlert className="h-10 w-10 text-amber-300" /><h1 className="mt-5 text-2xl font-bold">Sign in to review this invitation</h1><p className="mt-3 text-sm leading-relaxed text-gray-400">Use the same email address that received the invitation, then return to this link.</p><Link href={`/sign-in?returnPath=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="mt-6"><Button className="bg-amber-500 text-black hover:bg-amber-400">Go to sign in</Button></Link></main></div>;
  }
  if (token.length < 32) {
    return <div className="min-h-screen bg-[#0d1117] text-white"><Navbar /><main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center"><ShieldAlert className="h-10 w-10 text-red-300" /><h1 className="mt-5 text-2xl font-bold">Invitation link is incomplete</h1><p className="mt-3 text-sm text-gray-400">Request a new invitation from your organization administrator.</p><Link href="/dashboard/enterprise" className="mt-6"><Button variant="outline" className="border-white/10 bg-transparent text-gray-300">Return to workspace</Button></Link></main></div>;
  }

  return <div className="min-h-screen bg-[#0d1117] text-white"><Navbar /><main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10"><MailCheck className="h-8 w-8 text-amber-300" /></div><h1 className="mt-6 text-3xl font-bold">Review your organization invitation</h1><p className="mt-3 text-sm leading-relaxed text-gray-400">Accepting confirms your signed-in email matches the invitation recipient. The invitation is single-use and expires automatically.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button className="bg-amber-500 text-black hover:bg-amber-400" disabled={accept.isPending || reject.isPending} onClick={() => accept.mutate({ token })}>{accept.isPending ? "Accepting…" : <><CheckCircle2 className="mr-2 h-4 w-4" />Accept invitation</>}</Button><Button variant="outline" className="border-white/10 bg-transparent text-gray-300" disabled={accept.isPending || reject.isPending} onClick={() => reject.mutate({ token })}>{reject.isPending ? "Declining…" : "Decline"}</Button></div></main></div>;
}
