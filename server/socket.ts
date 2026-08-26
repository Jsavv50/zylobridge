import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { jwtVerify } from "jose";
import { getUserByOpenId, getDb } from "./db";
import { messages, conversations } from "../drizzle/schema";
import { eq, and, ne } from "drizzle-orm";
import { ENV } from "./_core/env";

const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret);
const COOKIE_NAME = "app_session_id";
const allowedOrigins = [
  "https://zylobridge.com",
  "https://www.zylobridge.com",
  ...(process.env.FRONTEND_URL ?? "").split(",").map((origin) => origin.trim()).filter(Boolean),
];

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userOpenId?: string;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k.trim(), decodeURIComponent(v.join("="))];
    })
  );
}

export function registerSocketIO(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin(origin, callback) {
        const permitted = !origin
          ? process.env.NODE_ENV !== "production"
          : allowedOrigins.includes(origin);
        callback(permitted ? null : new Error("Socket origin not allowed"), permitted);
      },
      credentials: true,
    },
    path: "/socket.io",
  });

  // ── Auth middleware ───────────────────────────────────────────────────────
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies[COOKIE_NAME];
      if (!token) return next(new Error("Unauthorized: no session cookie"));

      const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
      const openId = payload.openId as string;
      if (!openId) return next(new Error("Unauthorized: invalid token"));

      const user = await getUserByOpenId(openId);
      if (!user) return next(new Error("Unauthorized: user not found"));

      socket.userId = user.id;
      socket.userOpenId = openId;
      next();
    } catch {
      next(new Error("Unauthorized: token verification failed"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;

    // Join personal room for targeted notifications
    socket.join(`user:${userId}`);

    // ── Join conversation room ──────────────────────────────────────────────
    socket.on("join_conversation", async (conversationId: number) => {
      try {
        const db = await getDb();
        if (!db) return;
        const conv = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, conversationId))
          .limit(1);
        if (!conv[0]) return;
        const c = conv[0];
        // Only participants can join
        if (c.clientId !== userId && c.professionalId !== userId) return;
        socket.join(`conversation:${conversationId}`);
        socket.emit("joined_conversation", { conversationId });
      } catch (err) {
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    // ── Send message ────────────────────────────────────────────────────────
    socket.on(
      "send_message",
      async (data: { conversationId: number; content: string }) => {
        try {
          const { conversationId, content } = data;
          if (!content?.trim() || content.length > 5000) return;

          const db = await getDb();
          if (!db) return;

          // Verify sender is a participant
          const conv = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1);
          if (!conv[0]) return;
          const c = conv[0];
          if (c.clientId !== userId && c.professionalId !== userId) return;

          // Insert message
          const [newMessage] = await db.insert(messages).values({
            conversationId,
            senderId: userId,
            content: content.trim(),
            isRead: false,
          }).returning();
          if (!newMessage) return;

          // Update conversation lastMessageAt
          await db
            .update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, conversationId));

          // Broadcast to all in the conversation room
          io.to(`conversation:${conversationId}`).emit("new_message", newMessage);

          // Notify the other participant even if not in room
          const otherUserId = c.clientId === userId ? c.professionalId : c.clientId;
          io.to(`user:${otherUserId}`).emit("conversation_updated", {
            conversationId,
            lastMessage: content.trim(),
            lastMessageAt: newMessage.createdAt,
          });
        } catch (err) {
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    // ── Mark messages as read ───────────────────────────────────────────────
    socket.on("mark_read", async (conversationId: number) => {
      try {
        const db = await getDb();
        if (!db) return;
        const conv = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
        if (!conv[0] || (conv[0].clientId !== userId && conv[0].professionalId !== userId)) return;
        await db
          .update(messages)
          .set({ isRead: true })
          .where(
            and(
              eq(messages.conversationId, conversationId),
              eq(messages.isRead, false),
              ne(messages.senderId, userId)
            )
          );
        socket.to(`conversation:${conversationId}`).emit("messages_read", {
          conversationId,
          readBy: userId,
        });
      } catch {}
    });

    socket.on("disconnect", () => {
      // cleanup handled automatically by Socket.io
    });
  });

  return io;
}
