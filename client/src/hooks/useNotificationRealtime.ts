import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient, initSupabaseRealtimeAuth } from "@/lib/supabase";

type NotificationRow = {
  id: number;
  userId: number;
  title: string;
  content: string;
  category: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string | Date;
};

type Listener = (event: { type: "notification" | "sync"; notification?: NotificationRow }) => void;
type SharedConnection = {
  channel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]> | null;
  listeners: Set<Listener>;
  reconnectTimer: number | null;
  stopping: boolean;
  started: boolean;
};

const connections = new Map<number, SharedConnection>();

function emit(connection: SharedConnection, event: { type: "notification" | "sync"; notification?: NotificationRow }) {
  connection.listeners.forEach((listener) => listener(event));
}

function scheduleReconnect(userId: number, connection: SharedConnection) {
  if (connection.stopping || connection.reconnectTimer !== null) return;
  connection.reconnectTimer = window.setTimeout(() => {
    connection.reconnectTimer = null;
    void startConnection(userId, connection);
  }, 2000);
}

async function startConnection(userId: number, connection: SharedConnection) {
  if (connection.stopping || connection.started) return;
  connection.started = true;
  try {
    const authenticated = await initSupabaseRealtimeAuth();
    if (!authenticated || connection.stopping) return;
    const supabase = getSupabaseBrowserClient();
    const channelName = `private-user-notifications-${userId}`;
    connection.channel = supabase
      .channel(channelName, { config: { private: true } })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          if (connection.stopping) return;
          emit(connection, { type: "notification", notification: payload.new as NotificationRow });
        },
      )
      .subscribe((status) => {
        if (connection.stopping) return;
        if (status === "SUBSCRIBED") {
          emit(connection, { type: "sync" });
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          connection.started = false;
          scheduleReconnect(userId, connection);
        }
      });
  } catch {
    connection.started = false;
    scheduleReconnect(userId, connection);
  }
}

function subscribe(userId: number, listener: Listener) {
  let connection = connections.get(userId);
  if (!connection) {
    connection = { channel: null, listeners: new Set(), reconnectTimer: null, stopping: false, started: false };
    connections.set(userId, connection);
    void startConnection(userId, connection);
  }
  connection.listeners.add(listener);
  return () => {
    const current = connections.get(userId);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size > 0) return;
    current.stopping = true;
    if (current.reconnectTimer !== null) window.clearTimeout(current.reconnectTimer);
    if (current.channel) void getSupabaseBrowserClient().removeChannel(current.channel);
    connections.delete(userId);
  };
}

export function useNotificationRealtime(
  userId: number | undefined,
  onEvent: (event: { type: "notification" | "sync"; notification?: NotificationRow }) => void,
) {
  const listenerRef = useRef(onEvent);
  useEffect(() => {
    listenerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!userId) return;
    return subscribe(userId, (event) => listenerRef.current(event));
  }, [userId]);
}
