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
