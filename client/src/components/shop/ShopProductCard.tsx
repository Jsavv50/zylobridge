import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { useShopCompare } from "@/hooks/useShopCompare";
import { formatMoney } from "@/lib/format";
import { getProductCondition, getProductImage, getProductModality, PRODUCT_MODALITY_LABELS } from "@/lib/shopCatalog";
import { trpc } from "@/lib/trpc";
import type { Product } from "@shared/commerce/types";
import { Check, GitCompareArrows, Heart, Loader2, PackageCheck, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export function ShopProductCard({ product }: { product: Product }) {
  const { isAuthenticated } = useAuth();
  const { addItem, loading } = useCart();
  const compare = useShopCompare();
  const utils = trpc.useUtils();
  const { data: saved = [] } = trpc.shopExtensions.saved.list.useQuery(undefined, { enabled: isAuthenticated });
  const toggleSaved = trpc.shopExtensions.saved.toggle.useMutation({ onSuccess: () => utils.shopExtensions.saved.list.invalidate() });
  const image = getProductImage(product);
  const firstVariant = product.variants.find((variant) => variant.availableForSale) ?? product.variants[0];
  const isSaved = saved.some((item) => item.shopifyProductId === product.id);
  const modality = getProductModality(product);
  const condition = getProductCondition(product);

  const onSave = async () => {
    if (!isAuthenticated) return toast.info("Sign in to save products to your account.");
    await toggleSaved.mutateAsync({ shopifyProductId: product.id, productHandle: product.handle, saved: !isSaved });
    toast.success(isSaved ? "Removed from saved products" : "Product saved");
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111824] shadow-[0_20px_60px_-42px_rgba(124,58,237,.75)] transition duration-200 hover:-translate-y-1 hover:border-violet-400/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0b1017]">
        {image ? <img src={image} alt={product.images[0]?.altText ?? product.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center"><PackageCheck className="h-10 w-10 text-slate-700" /></div>}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">{PRODUCT_MODALITY_LABELS[modality] ?? modality}</span>
          {condition && <span className="rounded-full bg-teal-400 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-950">{condition}</span>}
        </div>
        <button type="button" onClick={onSave} aria-label={isSaved ? `Remove ${product.title} from saved products` : `Save ${product.title}`} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur transition hover:bg-violet-600"><Heart className={`h-4 w-4 ${isSaved ? "fill-current text-violet-300" : ""}`} /></button>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{product.productType ?? "Trade marketplace"}</p>
        <Link href={`/shop/product/${product.handle}`} className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-white hover:text-violet-300">{product.title}</Link>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{product.description}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Check className="h-3.5 w-3.5 text-teal-400" />Authoritative Shopify availability</div>
        <div className="mt-auto pt-5">
          <div className="mb-4 flex items-end justify-between gap-3"><span className="text-xl font-black text-white">{formatMoney(product.priceRange.min)}</span><span className="text-xs text-slate-500">{product.vendor}</span></div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            {modality === "physical-goods" ? <Button disabled={!firstVariant?.availableForSale || loading} onClick={() => firstVariant && addItem(firstVariant.id)} className="bg-violet-600 text-white hover:bg-violet-500">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}{firstVariant?.availableForSale ? "Add to cart" : "Unavailable"}</Button> : <Button asChild className="bg-violet-600 text-white hover:bg-violet-500"><Link href={`/shop/product/${product.handle}`}>View options</Link></Button>}
            <Button variant="outline" size="icon" aria-label={`Compare ${product.title}`} disabled={!compare.isSelected(product.handle) && compare.full} onClick={() => compare.toggle(product.handle)} className={compare.isSelected(product.handle) ? "border-teal-400 bg-teal-400/10 text-teal-300" : "border-white/15 text-slate-300"}><GitCompareArrows className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </article>
  );
}
