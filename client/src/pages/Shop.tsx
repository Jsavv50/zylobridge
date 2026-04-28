import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ShoppingCart,
  Package,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Tag,
  Infinity,
} from "lucide-react";
import { Link } from "wouter";

function ProductCard({
  product,
  onBuy,
  buying,
}: {
  product: {
    id: number;
    name: string;
    description: string;
    price: string;
    currency: string;
    imageUrl?: string | null;
    category?: string | null;
    stock: number;
    isActive: boolean;
  };
  onBuy: (productId: number) => void;
  buying: boolean;
}) {
  const price = Number(product.price).toLocaleString("en-NG", {
    style: "currency",
    currency: product.currency || "NGN",
    minimumFractionDigits: 0,
  });

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 flex flex-col overflow-hidden group">
      {/* Product image / placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-purple-900/30 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-primary/40" />
          </div>
        )}
        {product.category && (
          <Badge className="absolute top-3 left-3 bg-primary/90 text-white text-xs">
            <Tag className="w-3 h-3 mr-1" />
            {product.category}
          </Badge>
        )}
        {product.stock !== -1 && product.stock <= 5 && product.stock > 0 && (
          <Badge className="absolute top-3 right-3 bg-amber-500/90 text-white text-xs">
            Only {product.stock} left
          </Badge>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold text-lg">Out of Stock</span>
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <h3 className="font-bold text-foreground text-lg leading-tight">{product.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-2xl font-extrabold text-primary">{price}</span>
          {product.stock === -1 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Infinity className="w-3 h-3" /> Unlimited
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-2">
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
          {product.description}
        </p>
      </CardContent>

      <CardFooter className="pt-2">
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
          onClick={() => onBuy(product.id)}
          disabled={buying || product.stock === 0}
        >
          {buying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy Now
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Shop() {
  const { user, isAuthenticated } = useAuth();
  const [buyingId, setBuyingId] = useState<number | null>(null);

  const { data: products, isLoading } = trpc.products.list.useQuery({ activeOnly: true });
  const initiateMutation = trpc.orders.initiate.useMutation({
    onSuccess: (data) => {
      setBuyingId(null);
      // Redirect to Paystack checkout
      window.location.href = data.authorizationUrl;
    },
    onError: (err) => {
      setBuyingId(null);
      toast.error(err.message || "Failed to initiate payment. Please try again.");
    },
  });

  const handleBuy = (productId: number) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase products.");
      window.location.href = getLoginUrl();
      return;
    }
    setBuyingId(productId);
    initiateMutation.mutate({ productId, quantity: 1 });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-purple-900/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="container relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <ShoppingCart className="w-4 h-4" />
              ZYLOBRIDGE SHOP
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
              Tools & Resources for{" "}
              <span className="text-primary">Trade Professionals</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Purchase premium tools, safety gear, certifications, and resources to grow your
              trade career. Secure checkout powered by Paystack.
            </p>
            {isAuthenticated && (
              <Link href="/orders">
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                  View My Orders
                </Button>
              </Link>
            )}
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-12">
          <div className="container">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-7 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-10 w-full mt-2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : !products || products.length === 0 ? (
              <div className="text-center py-24">
                <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Products Yet</h3>
                <p className="text-muted-foreground">
                  Products will appear here once the admin adds them.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onBuy={handleBuy}
                    buying={buyingId === product.id}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trust badges */}
        <section className="py-12 border-t border-border">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              {[
                {
                  icon: <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />,
                  title: "Secure Payments",
                  desc: "All transactions are processed securely via Paystack — Nigeria's most trusted payment gateway.",
                },
                {
                  icon: <ShoppingCart className="w-8 h-8 text-primary mx-auto mb-3" />,
                  title: "Instant Access",
                  desc: "Digital products are available immediately after payment confirmation.",
                },
                {
                  icon: <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />,
                  title: "Buyer Protection",
                  desc: "Contact support within 7 days of purchase if you have any issues.",
                },
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-xl bg-card border border-border">
                  {item.icon}
                  <h4 className="font-semibold text-foreground mb-2">{item.title}</h4>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
