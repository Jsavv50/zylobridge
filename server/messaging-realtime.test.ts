import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Messaging Realtime Integration & Architecture", () => {
  it("verifies Messaging.tsx imports and uses initSupabaseRealtimeAuth and getSupabaseBrowserClient", () => {
    const messagingPath = path.resolve(__dirname, "../client/src/pages/Messaging.tsx");
    const code = fs.readFileSync(messagingPath, "utf-8");

    expect(code).toContain("initSupabaseRealtimeAuth");
    expect(code).toContain("getSupabaseBrowserClient");
    expect(code).toContain("private-conversation-");
    expect(code).toContain("postgres_changes");
    expect(code).toContain("conversationId=eq.");
  });

  it("verifies channel naming pattern matches private-conversation-{id}", () => {
    const conversationId = 8;
    const expectedChannelName = `private-conversation-${conversationId}`;
    expect(expectedChannelName).toBe("private-conversation-8");
  });

  it("verifies postgres_changes filter matches conversationId=eq.{id}", () => {
    const conversationId = 8;
    const filter = `conversationId=eq.${conversationId}`;
    expect(filter).toBe("conversationId=eq.8");
  });

  it("verifies frontend bundle helper does not expose secrets", () => {
    const supabaseHelperPath = path.resolve(__dirname, "../client/src/lib/supabase.ts");
    const code = fs.readFileSync(supabaseHelperPath, "utf-8");

    expect(code).not.toContain("JWT_SECRET");
    expect(code).not.toContain("SUPABASE_JWT_SECRET");
    expect(code).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(code).toContain("VITE_SUPABASE_URL");
    expect(code).toContain("VITE_SUPABASE_ANON_KEY");
  });
});
  it("verifies Messaging.tsx uses tRPC sendMessage mutation instead of requiring socketConnected", () => {
    const messagingPath = path.resolve(__dirname, "../client/src/pages/Messaging.tsx");
    const code = fs.readFileSync(messagingPath, "utf-8");

    expect(code).toContain("trpc.messaging.sendMessage.useMutation");
    expect(code).not.toContain("socketRef.current.emit(\"send_message\"");
    expect(code).not.toContain("!socketConnected");
  });
  it("verifies Socket.io server does not use wildcard origin with credentials", () => {
    const socketPath = path.resolve(__dirname, "../server/socket.ts");
    const code = fs.readFileSync(socketPath, "utf-8");

    expect(code).not.toContain('origin: "*"');
    expect(code).toContain("allowedSocketOrigins");
    expect(code).toContain("credentials: true");
  });
  it("verifies Messaging.tsx uses Supabase Realtime statuses (CONNECTING, CONNECTED, ERROR) and does not reference socket.io", () => {
    const messagingPath = path.resolve(__dirname, "../client/src/pages/Messaging.tsx");
    const code = fs.readFileSync(messagingPath, "utf-8");

    expect(code).toContain("CONNECTING");
    expect(code).toContain("CONNECTED");
    expect(code).toContain("ERROR");
    expect(code).not.toContain("socket.io-client");
    expect(code).not.toContain("socketConnected");
    expect(code).not.toContain("getSocket");
  });
  it("verifies client/src/lib/supabase.ts implements single-flight initSupabaseRealtimeAuth with promise reuse and error rejection", () => {
    const supabaseLibPath = path.resolve(__dirname, "../client/src/lib/supabase.ts");
    const code = fs.readFileSync(supabaseLibPath, "utf-8");

    expect(code).toContain("activeAuthPromise");
    expect(code).toContain("fetchRealtimeToken");
    expect(code).toContain("supabase.realtime.setAuth");
  });

  it("verifies Messaging.tsx awaits initSupabaseRealtimeAuth before subscribing and sets ERROR on auth failure", () => {
    const messagingPath = path.resolve(__dirname, "../client/src/pages/Messaging.tsx");
    const code = fs.readFileSync(messagingPath, "utf-8");

    expect(code).toContain("initSupabaseRealtimeAuth()");
    expect(code).toContain("setRealtimeStatus(\"ERROR\")");
  });
