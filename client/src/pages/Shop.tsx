import { useAuth } from "@/_core/hooks/useAuth";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { ShopCartDrawer } from "@/components/shop/ShopCartDrawer";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/contexts/CartContext";
import { SHOP_DEPARTMENTS } from "@/lib/shopCatalog";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight, Blocks, BriefcaseBusiness, Building2, CheckCircle2, ChevronRight,
  Factory, FileText, GraduationCap, Grid3X3, HardHat, Heart, Loader2, Package,
  Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Sprout, Sun,
  Truck, Wrench, Zap, Droplets,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

const MODALITIES = [
  { value: "all", label: "All types", description: "Everything available through the trade marketplace", icon: Grid3X3 },
  { value: "physical-goods", label: "Buy products", description: "Shopify-backed products and variants", icon: Package },
  { value: "rental", label: "Rent equipment", description: "Request equipment for a defined site period", icon: Wrench },
  { value: "training", label: "Book training", description: "Professional development and practical instruction", icon: GraduationCap },
  { value: "service", label: "Hire a service", description: "Installation, inspection, maintenance, and support", icon: BriefcaseBusiness },
  { value: "digital", label: "Access resources", description: "Controlled digital grants after confirmation", icon: FileText },
] as const;

function DepartmentIcon({ slug }: { slug: string }) {
  const icons: Record<string, typeof Wrench> = {
    "tools-equipment": Wrench,
    "construction-materials": Blocks,
    "safety-ppe": HardHat,
    electrical: Zap,
    "plumbing-water": Droplets,
    "energy-power": Sun,
    "vehicle-parts": Truck,
    agriculture: Sprout,
    "industrial-machinery": Factory,
    "training-certification": GraduationCap,
    "digital-resources": FileText,
    services: BriefcaseBusiness,
  };
  const Icon = icons[slug] ?? Package;
  return <Icon className="h-5 w-5" />;
}

function readFilters() {
  if (typeof window === "undefined") return { q: "", department: "", modality: "all", sort: "relevance" };
  const params = new URLSearchParams(window.location.search);
  return { q: params.get("q") ?? "", department: params.get("department") ?? "", modality: params.get("modality") ?? "all", sort: params.get("sort") ?? "relevance" };
}

export default function Shop() {
  const { user, isAuthenticated } = useAuth();
  const { itemCount, openCart } = useCart();
  const [location, setLocation] = useLocation();
  const filters = useMemo(readFilters, [location]);
  const [searchText, setSearchText] = useState(filters.q);
  useEffect(() => setSearchText(filters.q), [filters.q]);
  useEffect(() => {
    document.title = "Shop Tools, Equipment, Services & Trade Resources | ZYLOBRIDGE";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
    meta.content = "Browse Shopify-backed trade products, equipment requests, professional training, services, digital resources, procurement, and seller workflows on ZYLOBRIDGE.";
  }, []);
  const queryInput = useMemo(() => ({
    q: filters.q || undefined,
    department: filters.department || undefined,
    modality: (["physical-goods", "rental", "training", "service", "digital"].includes(filters.modality) ? filters.modality : "all") as "all" | "physical-goods" | "rental" | "training" | "service" | "digital",
    sort: (["newest", "price_asc", "price_desc", "title"].includes(filters.sort) ? filters.sort : "relevance") as "relevance" | "newest" | "price_asc" | "price_desc" | "title",
    availableOnly: false,
    limit: 24,
    offset: 0,
  }), [filters]);
  const products = trpc.commerce.products.search.useQuery(queryInput, { retry: 1 });

  const navigateWith = (changes: Partial<typeof filters>) => {
    const next = { ...filters, ...changes };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.department) params.set("department", next.department);
    if (next.modality !== "all") params.set("modality", next.modality);
    if (next.sort !== "relevance") params.set("sort", next.sort);
    setLocation(`/shop${params.size ? `?${params.toString()}` : ""}`);
  };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); navigateWith({ q: searchText.trim() }); };
  const accountLinks = isAuthenticated ? [
    { href: "/shop/account", label: "Shop account" },
    { href: "/shop/procurement", label: "Procurement" },
    { href: "/shop/seller", label: "Seller center" },
  ] : [{ href: "/sign-in?next=/shop", label: "Sign in" }];

  return (
    <div className="min-h-screen bg-[#080d14] text-white">
      <Navbar />
      <ShopCartDrawer />
      <header className="sticky top-16 z-40 border-b border-white/10 bg-[#0a1018]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/shop" className="hidden items-center gap-2 text-sm font-bold text-violet-300 lg:flex"><Building2 className="h-4 w-4" /> Trade Shop</Link>
          <form onSubmit={submitSearch} className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search tools, PPE, solar, training, services…" aria-label="Search Shop" className="h-11 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-slate-500" /></form>
          <div className="hidden items-center gap-4 lg:flex">{accountLinks.map((link) => <Link key={link.href} href={link.href} className="text-sm text-slate-400 transition hover:text-white">{link.label}</Link>)}</div>
          <Button variant="outline" className="relative border-white/15 bg-white/[0.03] text-white" onClick={openCart}><ShoppingBag className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Cart</span>{itemCount > 0 && <span className="ml-2 rounded-full bg-violet-500 px-2 py-0.5 text-xs font-bold text-white">{itemCount}</span>}</Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(124,58,237,.28),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(20,184,166,.18),transparent_28%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:py-24">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-200"><Sparkles className="h-3.5 w-3.5" /> Trade marketplace</div>
              <h1 className="max-w-4xl text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">Trade supply, services, and procurement—<span className="bg-gradient-to-r from-violet-300 to-teal-300 bg-clip-text text-transparent">in one protected workflow.</span></h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Buy available products through Shopify checkout, request rentals and specialist services, source training and digital resources, or publish a structured procurement request.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg" className="h-12 bg-violet-600 px-6 text-white hover:bg-violet-500"><a href="#catalog">Browse the catalog <ArrowRight className="ml-2 h-4 w-4" /></a></Button><Button asChild size="lg" variant="outline" className="h-12 border-white/15 bg-white/[0.03] px-6 text-white"><Link href="/shop/procurement">Request a quote</Link></Button><Button asChild size="lg" variant="outline" className="h-12 border-white/15 bg-white/[0.03] px-6 text-white"><Link href="/shop/seller">Become a seller</Link></Button></div>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-center">{[{ value: products.data?.total ?? "—", label: "live listings" }, { value: "12", label: "departments" }, { value: "5", label: "product modes" }].map((metric) => <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4"><p className="text-xl font-black text-white">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.label}</p></div>)}</div>
            </div>
            <div className="relative self-center rounded-[2rem] border border-white/10 bg-[#101824]/90 p-6 shadow-2xl shadow-violet-950/30">
              <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">Connected commerce</p><h2 className="mt-2 text-2xl font-black">Shopify-backed checkout</h2></div><ShieldCheck className="h-10 w-10 text-teal-300" /></div>
              <div className="mt-6 space-y-3">{["Catalog price and availability come from Shopify", "Server validates products and protected requests", "Hosted checkout creates the authoritative order", "ZYLOBRIDGE stores only marketplace-specific workflows"].map((item) => <div key={item} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />{item}</div>)}</div>
              <p className="mt-5 text-xs leading-5 text-slate-500">The connected development store currently uses ZAR. Payment methods, shipping, tax, and order confirmation are finalized in the hosted checkout.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">Shop by department</p><h2 className="mt-2 text-3xl font-black">Built for real trade workflows</h2></div><Link href="/shop" className="hidden items-center gap-1 text-sm font-semibold text-teal-300 sm:flex">View all <ChevronRight className="h-4 w-4" /></Link></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{SHOP_DEPARTMENTS.map((department) => { const count = products.data?.counts.departments[department.slug] ?? 0; return <Link key={department.slug} href={`/shop?department=${department.slug}`} className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-violet-500/[0.07]"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/12 text-violet-300"><DepartmentIcon slug={department.slug} /></span><span className="text-xs font-semibold text-slate-600">{count} live</span></div><h3 className="mt-4 font-bold text-white">{department.label}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{department.description}</p></Link>; })}</div>
        </section>

        <section className="border-y border-white/10 bg-[#0d141e]"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6"><p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-300">Choose the right transaction</p><h2 className="mt-2 text-3xl font-black">More than physical products</h2><div className="mt-7 grid gap-3 md:grid-cols-3 xl:grid-cols-6">{MODALITIES.map((mode) => <button key={mode.value} type="button" onClick={() => navigateWith({ modality: mode.value })} className={`rounded-2xl border p-4 text-left transition ${filters.modality === mode.value ? "border-teal-400/60 bg-teal-400/10" : "border-white/10 bg-white/[0.025] hover:border-white/20"}`}><mode.icon className="h-5 w-5 text-teal-300" /><h3 className="mt-3 text-sm font-bold text-white">{mode.label}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{mode.description}</p></button>)}</div></div></section>

        <section id="catalog" className="mx-auto max-w-7xl scroll-mt-36 px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">Live catalog</p><h2 className="mt-2 text-3xl font-black">{filters.department ? SHOP_DEPARTMENTS.find((item) => item.slug === filters.department)?.label ?? "Department" : filters.q ? `Results for “${filters.q}”` : "Recommended trade essentials"}</h2><p className="mt-2 text-sm text-slate-500">{products.data ? `${products.data.total} authoritative Shopify listing${products.data.total === 1 ? "" : "s"}` : "Loading catalog…"}</p></div><div className="flex flex-wrap items-center gap-3">{(filters.q || filters.department || filters.modality !== "all") && <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => { setSearchText(""); setLocation("/shop#catalog"); }}>Clear filters</Button>}<Select value={filters.sort} onValueChange={(value) => navigateWith({ sort: value })}><SelectTrigger className="w-48 border-white/10 bg-white/[0.03] text-white"><SlidersHorizontal className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="relevance">Recommended</SelectItem><SelectItem value="newest">Newest</SelectItem><SelectItem value="price_asc">Price: low to high</SelectItem><SelectItem value="price_desc">Price: high to low</SelectItem><SelectItem value="title">Product name</SelectItem></SelectContent></Select><Button asChild variant="outline" className="border-white/15 bg-white/[0.03] text-white"><Link href="/shop/compare">Compare</Link></Button></div></div>
          {products.isLoading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div> : products.error ? <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-500/10 p-8 text-center"><p className="font-semibold text-red-100">The catalog is temporarily unavailable.</p><Button className="mt-4" variant="outline" onClick={() => products.refetch()}>Try again</Button></div> : products.data?.items.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.data.items.map((product) => <ShopProductCard key={product.id} product={product} />)}</div> : <div className="mt-8 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"><Package className="mx-auto h-10 w-10 text-slate-700" /><h3 className="mt-4 text-xl font-bold">No matching live listings</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">This department is ready for verified sellers. Publish an RFQ or apply to supply this category without fabricating inventory.</p><div className="mt-5 flex justify-center gap-3"><Button asChild><Link href="/shop/procurement">Request a quote</Link></Button><Button asChild variant="outline"><Link href="/shop/seller">Become a seller</Link></Button></div></div>}
        </section>

        <section className="border-t border-white/10 bg-gradient-to-b from-[#0d141e] to-[#080d14]"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_.8fr]"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-300">Buyer protection</p><h2 className="mt-2 text-3xl font-black">Clear systems of record. Fewer surprises.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">Shopify controls catalog, cart, checkout, payment confirmation, orders, and fulfillment. ZYLOBRIDGE controls identity, saved products, supplier onboarding, requests, procurement, and marketplace audit records.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{["No fabricated reviews or supplier ratings", "Server-authoritative product and amount validation", "Restricted goods remain blocked", "Dispute and refund decisions follow the responsible commerce flow"].map((item) => <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-300"><ShieldCheck className="h-5 w-5 shrink-0 text-teal-300" />{item}</div>)}</div></div><div className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-7"><Heart className="h-8 w-8 text-violet-300" /><h3 className="mt-4 text-2xl font-black">Build your sourcing workspace</h3><p className="mt-3 leading-7 text-slate-300">Save products, compare options, manage rental and service requests, track procurement, and maintain controlled digital access from one authenticated account.</p><Button asChild className="mt-6 bg-white text-slate-950 hover:bg-slate-100"><Link href={isAuthenticated ? "/shop/account" : "/sign-in?next=/shop/account"}>{isAuthenticated ? `${user?.name?.split(" ")[0] ?? "Your"}’s Shop account` : "Create your Shop account"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div></section>
      </main>
      <Footer />
    </div>
  );
}
