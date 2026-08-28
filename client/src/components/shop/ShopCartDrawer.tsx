import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { formatMoney } from "@/lib/format";
import { Loader2, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";

export function ShopCartDrawer() {
  const { cart, isOpen, closeCart, loading, updateQuantity, removeItem, proceedToCheckout } = useCart();
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent className="flex w-full flex-col border-white/10 bg-[#0b1017] text-white sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-white"><ShoppingBag className="h-5 w-5 text-violet-400" /> Your cart</SheetTitle>
          <SheetDescription className="text-slate-400">Catalog, price, inventory, and checkout are secured by the connected Shopify store.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-5">
          {!cart?.items.length ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center">
              <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-slate-600" />
              <p className="font-medium text-slate-200">Your cart is empty</p>
              <p className="mt-1 text-sm text-slate-500">Add an available product to start a protected hosted checkout.</p>
            </div>
          ) : cart.items.map((item) => (
            <div key={item.lineId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex gap-3">
                {item.image?.url ? <img src={item.image.url} alt={item.image.altText ?? item.productTitle} className="h-20 w-20 rounded-xl object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-xl bg-white/5"><ShoppingBag className="h-6 w-6 text-slate-600" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold text-white">{item.productTitle}</p>
                  {item.variantTitle !== "Default Title" && <p className="mt-1 text-xs text-slate-500">{item.variantTitle}</p>}
                  <p className="mt-2 text-sm font-semibold text-teal-300">{formatMoney(item.lineTotal)}</p>
                </div>
                <button type="button" onClick={() => removeItem(item.lineId)} aria-label={`Remove ${item.productTitle}`} className="h-9 w-9 rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center rounded-lg border border-white/10">
                  <button type="button" className="p-2 text-slate-300 hover:text-white" onClick={() => updateQuantity(item.lineId, Math.max(0, item.quantity - 1))} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                  <span className="min-w-9 text-center text-sm font-semibold">{item.quantity}</span>
                  <button type="button" className="p-2 text-slate-300 hover:text-white" onClick={() => updateQuantity(item.lineId, item.quantity + 1)} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
                </div>
                <span className="text-sm text-slate-400">{formatMoney(item.unitPrice)} each</span>
              </div>
            </div>
          ))}
        </div>
        <SheetFooter className="border-t border-white/10 pt-4">
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Estimated total</span><span className="text-lg font-bold text-white">{cart ? formatMoney(cart.total) : "—"}</span></div>
            <div className="flex items-start gap-2 rounded-xl bg-teal-500/10 p-3 text-xs text-teal-100"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Checkout, tax, shipping, payment confirmation, and order creation are completed on Shopify.</div>
            <Button className="h-12 w-full bg-violet-600 text-white hover:bg-violet-500" disabled={!cart?.items.length || loading} onClick={proceedToCheckout}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Secure checkout</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
