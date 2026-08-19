import { trpc } from "@/lib/trpc";
import { disconnectSupabaseRealtime } from "@/lib/supabase";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { TRPCClientError } from "@trpc/client";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type AuthUser = NonNullable<RouterOutputs["auth"]["me"]>;

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isLoggingOut: boolean;
  error: unknown;
  isAuthenticated: boolean;
  refresh: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

const AUTH_STORAGE_KEY = "manus-runtime-user-info";
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The single frontend authentication bootstrap for the application.
 *
 * The provider owns the only auth.me query. Components consume this state
 * through useAuth instead of creating independent session checks.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 30_000,
  });

  const logoutMutation = trpc.auth.logout.useMutation();

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const result = await meQuery.refetch();
      return result.data ?? null;
    } catch {
      return null;
    }
  }, [meQuery.refetch]);

  const logout = useCallback(async () => {
    let clearLocalState = false;
    try {
      await logoutMutation.mutateAsync();
      clearLocalState = true;
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        clearLocalState = true;
      } else {
        throw error;
      }
    } finally {
      // The server is the authority. Only a successful or already-invalid
      // session may clear local auth state and disconnect Realtime.
      if (clearLocalState) {
        disconnectSupabaseRealtime();
        localStorage.removeItem(AUTH_STORAGE_KEY);
        utils.auth.me.setData(undefined, null);
      }
    }
  }, [logoutMutation, utils]);

  useEffect(() => {
    if (meQuery.data) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(meQuery.data));
    } else if (!meQuery.isLoading) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [meQuery.data, meQuery.isLoading]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      isLoggingOut: logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
      refresh,
      logout,
    }),
    [
      meQuery.data,
      meQuery.error,
      meQuery.isLoading,
      logoutMutation.error,
      logoutMutation.isPending,
      refresh,
      logout,
    ],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(options?: UseAuthOptions): AuthContextValue {
  const auth = useContext(AuthContext);
  const [, navigate] = useLocation();
  const {
    redirectOnUnauthenticated = false,
    redirectPath = "/sign-in",
  } = options ?? {};

  if (!auth) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  useEffect(() => {
    if (!redirectOnUnauthenticated || auth.loading || auth.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    navigate(redirectPath);
  }, [auth.loading, auth.user, navigate, redirectOnUnauthenticated, redirectPath]);

  return auth;
}
