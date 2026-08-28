import { useAuth } from "@/_core/hooks/useAuth";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { ShopCartDrawer } from "@/components/shop/ShopCartDrawer";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useShopCompare } from "@/hooks/useShopCompare";
import { formatMoney } from "@/lib/format";
import { getProductDepartment, getProductImage, getProductModality, PRODUCT_MODALITY_LABELS } from "@/lib/shopCatalog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, GitCompareArrows, Heart, Loader2, Package, ShieldCheck, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function ShopProductDetail() {
  const { handle = "" } = useParams<{ handle: string }>();
  const { isAuthenticated } = useAuth();
  const { addItem, loading } = useCart();
  const compare = useShopCompare();
  const utils = trpc.useUtils();
  const productQuery = trpc.commerce.products.byHandle.useQuery({ handle }, { enabled: Boolean(handle), retry: 1 });
  const product = productQuery.data;
  const { data: saved = [] } = trpc.shopExtensions.saved.list.useQuery(undefined, { enabled: isAuthenticated });
  const toggleSaved = trpc.shopExtensions.saved.toggle.useMutation({ onSuccess: () => utils.shopExtensions.saved.list.invalidate() });
  const requestMutation = trpc.shopExtensions.requests.create.useMutation({ onSuccess: () => { toast.success("Request submitted"); utils.shopExtensions.requests.listMine.invalidate(); } });
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [serviceLocation, setServiceLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  useEffect(() => {
    if (product?.variants[0] && !variantId) setVariantId(product.variants.find((variant) => variant.availableForSale)?.id ?? product.variants[0].id);
    if (product) {
      document.title = `${product.title} | ZYLOBRIDGE Shop`;
      const description = product.description.slice(0, 155);
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
      meta.content = description;
    }
  }, [product, variantId]);

  const related = trpc.commerce.products.search.useQuery({ department: product ? getProductDepartment(product) : undefined, modality: "all", sort: "relevance", availableOnly: false, limit: 4, offset: 0 }, { enabled: Boolean(product), retry: 1 });
  const variant = useMemo(() => product?.variants.find((item) => item.id === variantId) ?? product?.variants[0], [product, variantId]);
  const modality = product ? getProductModality(product) : "physical-goods";
  const isSaved = product ? saved.some((item) => item.shopifyProductId === product.id) : false;

  if (productQuery.isLoading) return <div className="grid min-h-screen place-items-center bg-[#080d14]"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>;
  if (!product || productQuery.error) return <div className="min-h-screen bg-[#080d14] text-white"><Navbar /><main className="mx-auto max-w-3xl px-4 py-24 text-center"><Package className="mx-auto h-10 w-10 text-slate-700" /><h1 className="mt-4 text-3xl font-black">Product unavailable</h1><p className="mt-3 text-slate-400">The listing may have been unpublished or the catalog may be temporarily unavailable.</p><Button asChild className="mt-6"><Link href="/shop">Return to Shop</Link></Button></main></div>;

  const image = getProductImage(product);
  const submitRequest = async () => {
    if (!isAuthenticated) return toast.info("Sign in to submit a protected request.");
    if (message.trim().length < 10) return toast.error("Add at least 10 characters describing your needs.");
    await requestMutation.mutateAsync({
      shopifyProductId: product.id,
      productHandle: product.handle,
      requestType: modality === "rental" || modality === "training" || modality === "service" || modality === "digital" ? modality : "service",
      quantity,
      message: message.trim(),
      serviceLocation: serviceLocation.trim() || undefined,
      startAt: startAt ? new Date(startAt).toISOString() : undefined,
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
    });
  };

  return <div className="min-h-screen bg-[#080d14] text-white"><Navbar /><ShopCartDrawer /><main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><Link href="/shop" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to Shop</Link><div className="mt-7 grid gap-10 lg:grid-cols-2"><div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#101824]">{image ? <img src={image} alt={product.images[0]?.altText ?? product.title} className="aspect-[4/3] h-full w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center"><Package className="h-14 w-14 text-slate-700" /></div>}</div><div className="self-center"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-violet-500/12 px-3 py-1 text-xs font-bold text-violet-200">{product.productType ?? "Trade product"}</span><span className="rounded-full bg-teal-500/12 px-3 py-1 text-xs font-bold text-teal-200">{PRODUCT_MODALITY_LABELS[modality] ?? modality}</span></div><h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">{product.title}</h1><p className="mt-4 text-base leading-8 text-slate-300">{product.description}</p><div className="mt-6 text-3xl font-black text-white">{formatMoney(variant?.price ?? product.priceRange.min)}</div>{product.options.length > 0 && product.variants.length > 1 && <div className="mt-6"><label className="text-sm font-semibold text-slate-300" htmlFor="shop-variant">Choose an option</label><select id="shop-variant" value={variantId} onChange={(event) => setVariantId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#111824] px-3 text-white">{product.variants.map((item) => <option key={item.id} value={item.id} disabled={!item.availableForSale}>{item.title}{!item.availableForSale ? " — unavailable" : ""}</option>)}</select></div>}<div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto_auto]">{modality === "physical-goods" ? <Button className="h-12 bg-violet-600 text-white hover:bg-violet-500" disabled={!variant?.availableForSale || loading} onClick={() => variant && addItem(variant.id, quantity)}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />} Add {quantity} to cart</Button> : <Dialog><DialogTrigger asChild><Button className="h-12 bg-violet-600 text-white hover:bg-violet-500">Request {PRODUCT_MODALITY_LABELS[modality]?.toLowerCase() ?? modality}</Button></DialogTrigger><DialogContent className="border-white/10 bg-[#101824] text-white"><DialogHeader><DialogTitle>Submit a protected request</DialogTitle><DialogDescription className="text-slate-400">The provider must review availability and scope before any payment is requested.</DialogDescription></DialogHeader><div className="space-y-4"><Input type="number" min={1} max={100} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} className="border-white/10 bg-white/[0.03]" />{modality === "rental" && <><Input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} className="border-white/10 bg-white/[0.03]" /><Input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} className="border-white/10 bg-white/[0.03]" /><Input value={serviceLocation} onChange={(event) => setServiceLocation(event.target.value)} placeholder="Site location" className="border-white/10 bg-white/[0.03]" /></>}<Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe requirements, dates, delivery, or outcomes" className="min-h-28 border-white/10 bg-white/[0.03]" /><Button className="w-full" disabled={requestMutation.isPending} onClick={submitRequest}>{requestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit request</Button></div></DialogContent></Dialog>}<Button variant="outline" size="icon" className={isSaved ? "h-12 border-violet-400 text-violet-300" : "h-12 border-white/15"} aria-label="Save product" onClick={async () => { if (!isAuthenticated) return toast.info("Sign in to save products."); await toggleSaved.mutateAsync({ shopifyProductId: product.id, productHandle: product.handle, saved: !isSaved }); }}><Heart className={isSaved ? "fill-current" : ""} /></Button><Button variant="outline" size="icon" className={compare.isSelected(product.handle) ? "h-12 border-teal-400 text-teal-300" : "h-12 border-white/15"} aria-label="Compare product" onClick={() => compare.toggle(product.handle)}><GitCompareArrows /></Button></div>{modality === "physical-goods" && <div className="mt-3 flex items-center gap-3"><label htmlFor="quantity" className="text-sm text-slate-400">Quantity</label><Input id="quantity" type="number" min={1} max={99} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} className="h-10 w-24 border-white/10 bg-white/[0.03]" /></div>}<div className="mt-7 rounded-2xl border border-teal-400/20 bg-teal-400/[0.07] p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-teal-300" /><div><h2 className="font-bold">Transaction clarity</h2><p className="mt-1 text-sm leading-6 text-slate-400">Price, availability, cart, checkout, payment confirmation, order creation, tax, and fulfillment are authoritative in Shopify. ZYLOBRIDGE records only authenticated marketplace requests and sourcing workflows.</p></div></div></div></div></div><section className="mt-16 border-t border-white/10 pt-12"><div className="grid gap-4 md:grid-cols-3">{["Server-validated catalog reference", "No fabricated reviews or certifications", "Restricted goods remain blocked"].map((item) => <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm text-slate-300"><CheckCircle2 className="h-5 w-5 shrink-0 text-teal-400" />{item}</div>)}</div>{related.data?.items.filter((item) => item.id !== product.id).length ? <><h2 className="mt-14 text-2xl font-black">Related live listings</h2><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{related.data.items.filter((item) => item.id !== product.id).map((item) => <ShopProductCard key={item.id} product={item} />)}</div></> : null}</section></main><Footer /></div>;
}
