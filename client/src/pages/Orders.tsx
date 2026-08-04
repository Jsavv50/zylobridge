import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ShoppingBag,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Package,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  paid: { label: "Paid", icon: CheckCircle, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  failed: { label: "Failed", icon: XCircle, color: "bg-red-500/20 text-red-400 border-red-500/30" },
  refunded: { label: "Refunded", icon: RefreshCw, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export default function Orders() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();
  const [verifyRef, setVerifyRef] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.orders.myOrders.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const verifyMutation = trpc.orders.verify.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Payment confirmed! Your order is now complete.");
      } else {
        toast.error("Payment verification failed. Please contact support.");
      }
      utils.orders.myOrders.invalidate();
      setVerifyRef(null);
    },
    onError: (err) => {
      toast.error(err.message || "Verification failed.");
      setVerifyRef(null);
    },
  });

  // Auto-verify if redirected back from Paystack with ?ref=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && isAuthenticated) {
      setVerifyRef(ref);
      verifyMutation.mutate({ reference: ref });
      // Clean the URL
      window.history.replaceState({}, "", "/orders");
    }
  }, [isAuthenticated]);

  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">Please sign in to view your orders.</p>
            <Link href="/">
              <Button className="bg-primary hover:bg-primary/90 text-white">Go Home</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/shop">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shop
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-foreground">My Orders</h1>
              <p className="text-muted-foreground mt-1">Track your purchase history and payment status.</p>
            </div>
            <Link href="/shop">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Shop More
              </Button>
            </Link>
          </div>

          {/* Verifying banner */}
          {verifyRef && (
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-3 py-4">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-foreground font-medium">Verifying your payment...</span>
              </CardContent>
            </Card>
          )}

          {/* Orders list */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="text-center py-24">
              <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground mb-6">
                You haven't purchased anything yet. Browse the shop to get started.
              </p>
              <Link href="/shop">
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Browse Products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = statusConfig[order.status as keyof typeof statusConfig] ?? statusConfig.pending;
                const StatusIcon = status.icon;
                const amount = Number(order.amount).toLocaleString("en-NG", {
                  style: "currency",
                  currency: order.currency || "NGN",
                  minimumFractionDigits: 0,
                });
                return (
                  <Card key={order.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              Order #{order.id}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Product ID: {order.productId} · Qty: {order.quantity}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString("en-NG", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {order.paystackReference && (
                              <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
                                Ref: {order.paystackReference}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xl font-extrabold text-primary">{amount}</span>
                          <Badge className={`${status.color} border text-xs font-medium flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                          {order.status === "pending" && order.paystackAuthorizationUrl && (
                            <a
                              href={order.paystackAuthorizationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white text-xs">
                                Complete Payment
                              </Button>
                            </a>
                          )}
                          {order.status === "pending" && order.paystackReference && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                              onClick={() => verifyMutation.mutate({ reference: order.paystackReference! })}
                              disabled={verifyMutation.isPending}
                            >
                              {verifyMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Verify Payment"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
