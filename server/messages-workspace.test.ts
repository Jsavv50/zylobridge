import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, file), "utf8");

describe("professional messages workspace", () => {
  it("keeps server-side conversation access and search authorized", () => {
    const router = read("routers.ts");
    const db = read("db.ts");
    expect(router).toContain("myConversations: protectedProcedure");
    expect(router).toContain("context: protectedProcedure");
    expect(router).toContain("getProfessionalConversationContext(input.conversationId, ctx.user.id)");
    expect(router).toContain("getConversationById(input.conversationId)");
    expect(router).toContain("conversation.clientId !== ctx.user.id && conversation.professionalId !== ctx.user.id");
    expect(db).toContain("LOWER(searched_messages.\"content\") LIKE");
    expect(db).toContain("eq(conversations.professionalId, userId)");
  });

  it("supports conversation-specific routing and notification deep-links", () => {
    const app = read("../client/src/App.tsx");
    const messaging = read("../client/src/pages/Messaging.tsx");
    const notifications = read("../client/src/pages/Notifications.tsx");
    expect(app).toContain('<Route path="/messages/:id" component={Messaging} />');
    expect(messaging).toContain("location.match(/^\\/messages\\/(\\d+)/)");
    expect(messaging).toContain("navigate(`/messages/${id}`)");
    expect(notifications).toContain("/messages/${encodeURIComponent(referenceId)}");
  });

  it("prevents duplicate realtime messages and avoids unsupported marketplace claims", () => {
    const messaging = read("../client/src/pages/Messaging.tsx");
    expect(messaging).toContain("prev.some((message) => message.id === incoming.id)");
    expect(messaging).toContain("Connecting securely…");
    expect(messaging).toContain("Message couldn't be sent. Your text is preserved.");
    expect(messaging).toContain("Your professional conversations will appear here");
    expect(messaging).not.toContain("Sherry Witt");
    expect(messaging).not.toContain("Fixing New Door");
    expect(messaging).not.toContain("R3,000");
    expect(messaging).not.toContain("4.8");
  });
});
