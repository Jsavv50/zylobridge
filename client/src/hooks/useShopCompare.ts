import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "zylobridge:shop-compare";

function readHandles() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 4) : [];
  } catch {
    return [] as string[];
  }
}

export function useShopCompare() {
  const [handles, setHandles] = useState<string[]>(readHandles);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(handles));
  }, [handles]);
  const toggle = useCallback((handle: string) => {
    setHandles((current) => current.includes(handle) ? current.filter((item) => item !== handle) : current.length >= 4 ? current : [...current, handle]);
  }, []);
  const clear = useCallback(() => setHandles([]), []);
  return { handles, toggle, clear, isSelected: (handle: string) => handles.includes(handle), full: handles.length >= 4 };
}
