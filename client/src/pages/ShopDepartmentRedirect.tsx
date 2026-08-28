import { useEffect } from "react";
import { useLocation, useParams } from "wouter";

export default function ShopDepartmentRedirect() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  useEffect(() => setLocation(`/shop?department=${encodeURIComponent(slug)}`), [setLocation, slug]);
  return <div className="grid min-h-screen place-items-center bg-[#080d14] text-sm text-slate-400">Opening department…</div>;
}
