import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DollarSign, ShieldCheck, ShoppingBag, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

export default function Payments() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"orders">("orders");

  const { data: myOrders, isLoading: ordersLoading } = trpc.orders.myOrders.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Earnings, Orders & Payments</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Secure marketplace orders, product purchases, and financial transaction history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="default">
              <ShoppingBag className="w-4 h-4 mr-2" /> Marketplace Orders
            </Button>
          </div>
        </div>

        {/* Trust banner */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-transparent p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">PCI-DSS Compliant Secure Checkout</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                All marketplace purchases and payment settlements are processed securely via Paystack.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Secured by Paystack
            </span>
          </div>
        </div>

        {!isAuthenticated ? (
          <Card className="border-border bg-card text-center py-16">
            <CardContent className="space-y-4">
              <DollarSign className="w-16 h-16 text-primary mx-auto opacity-40" />
              <h2 className="text-2xl font-bold">Sign in to view your payments</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Access your purchase orders, invoices, and transaction history by signing into your Zylobridge account.
              </p>
              <Button asChild className="mt-2">
                <Link href="/sign-in">Sign In Now</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Marketplace Purchase Orders</h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/shop">Visit Shop</Link>
              </Button>
            </div>

            {ordersLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
            ) : !myOrders || myOrders.length === 0 ? (
              <Card className="border-border bg-card text-center py-16">
                <CardContent className="space-y-3">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold">No Orders Placed Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Orders for verified equipment, safety gear, or professional tools will show up here.
                  </p>
                  <Button asChild className="mt-2">
                    <Link href="/shop">Browse Shop</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myOrders.map((order: any) => (
                  <Card key={order.id} className="border-border bg-card">
                    <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">Order #{order.id}</span>
                          <Badge variant={order.status === "paid" ? "default" : "outline"} className="capitalize">
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Amount: ₦{Number(order.amount).toLocaleString()} ({order.currency})
                        </p>
                      </div>
                      {order.paystackAuthorizationUrl && order.status === "pending" && (
                        <Button asChild size="sm">
                          <a href={order.paystackAuthorizationUrl} target="_blank" rel="noopener noreferrer">
                            Complete Payment <ArrowUpRight className="w-4 h-4 ml-1" />
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
