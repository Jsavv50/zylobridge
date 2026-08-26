import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";
import superjson from "superjson";
import "./index.css";

const App = lazy(() => import("./App"));

class StartupErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Application startup error]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#0d1117] px-6 text-center text-white">
          <section className="max-w-md rounded-2xl border border-white/10 bg-[#131a26] p-8 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Zylobridge</p>
            <h1 className="mt-3 text-2xl font-bold">We could not start the workspace</h1>
            <p className="mt-3 text-sm leading-6 text-gray-300">Please refresh this page. If the issue continues, our team has been notified.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300">
              Refresh application
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function StartupFallback() {
  return <div className="min-h-screen bg-[#0d1117]" aria-busy="true" aria-label="Loading Zylobridge" />;
}

// Disable automatic retries for mutations globally.
// OTP verification mutations MUST NOT retry — a consumed OTP cannot be reused.
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: false },
    queries: { retry: 1, staleTime: 30_000 },
  },
});

/**
 * API_URL — base URL of the Railway backend.
 * Set VITE_API_URL in Vercel environment variables to your Railway domain,
 * e.g. https://zylobridge.up.railway.app
 * Falls back to empty string for same-origin requests (local development).
 */
const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const API_URL = (configuredApiUrl || (import.meta.env.PROD ? "https://api.zylobridge.com" : "")).replace(/\/$/, "");

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Do not redirect if already on sign-in or public landing/auth pages to prevent redirect loops / lag
  const path = window.location.pathname;
  if (path.startsWith("/sign-in") || path.startsWith("/login") || path === "/") return;

  window.history.pushState({}, "", "/sign-in");
  window.dispatchEvent(new PopStateEvent("popstate"));
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <StartupErrorBoundary>
        <Suspense fallback={<StartupFallback />}>
          <App />
        </Suspense>
      </StartupErrorBoundary>
    </QueryClientProvider>
  </trpc.Provider>
);
