import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { formatDistanceToNow } from "date-fns";
import { getSupabaseBrowserClient, initSupabaseRealtimeAuth } from "@/lib/supabase";

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

interface Conversation {
  id: number;
  jobId: number;
  clientId: number;
  professionalId: number;
  lastMessageAt: Date;
  createdAt: Date;
  unreadCount?: number;
}

type RealtimeStatus = "CONNECTING" | "CONNECTED" | "ERROR";

export default function Messaging() {
  const { user, isAuthenticated, loading } = useAuth();
  const [location] = useLocation();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("CONNECTING");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, refetch: refetchConversations } = trpc.messaging.myConversations.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const markAsReadMutation = trpc.messaging.markAsRead.useMutation({
    onSuccess: () => void refetchConversations(),
  });

  useEffect(() => {
    if (!conversations?.length) return;
    const requestedId = Number(new URLSearchParams(location.split("?")[1] ?? "").get("conv"));
    if (Number.isInteger(requestedId) && conversations.some((conversation) => conversation.id === requestedId)) {
      setSelectedConvId(requestedId);
    }
  }, [conversations, location]);

  useEffect(() => {
    if (selectedConvId) markAsReadMutation.mutate({ conversationId: selectedConvId });
  }, [selectedConvId]);

  const { data: fetchedMessages, isLoading: messagesLoading } = trpc.messaging.getMessages.useQuery(
    { conversationId: selectedConvId! },
    { enabled: !!selectedConvId }
  );

  // Sync fetched messages into local state
  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })));
    }
  }, [fetchedMessages]);

  const refetchConversationsRef = useRef(refetchConversations);

  useEffect(() => {
    refetchConversationsRef.current = refetchConversations;
  }, [refetchConversations]);

  // Realtime starts only after the centralized auth provider confirms a
  // server-accepted session. Cleanup is synchronous so a channel cannot be
  // left behind if the conversation changes while token auth is pending.
  useEffect(() => {
    if (!isAuthenticated || !selectedConvId) {
      setRealtimeStatus("CONNECTING");
      return;
    }

    let isActive = true;
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]> | null = null;
    const conversationId = selectedConvId;
    const channelName = `private-conversation-${conversationId}`;
    setRealtimeStatus("CONNECTING");

    const setupRealtimeChannel = async () => {
      try {
        const authSuccess = await initSupabaseRealtimeAuth();
        if (!isActive) return;

        if (!authSuccess) {
          setRealtimeStatus("ERROR");
          console.warn("[Messaging] Realtime authentication failed before subscription");
          return;
        }

        const supabase = getSupabaseBrowserClient();
        channel = supabase.channel(channelName, {
          config: {
            private: true,
          },
        });

        channel
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversationId=eq.${conversationId}`,
            },
            (payload) => {
              if (!isActive) return;
              const newMsg = payload.new as any;
              if (newMsg && newMsg.id && newMsg.conversationId === conversationId) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === newMsg.id)) return prev;
                  return [
                    ...prev,
                    {
                      id: newMsg.id,
                      conversationId: newMsg.conversationId,
                      senderId: newMsg.senderId,
                      content: newMsg.content,
                      isRead: newMsg.isRead ?? false,
                      createdAt: new Date(newMsg.createdAt),
                    },
                  ];
                });
                void refetchConversationsRef.current();
              }
            },
          )
          .subscribe((status, err) => {
            if (!isActive) return;
            if (status === "SUBSCRIBED") {
              setRealtimeStatus("CONNECTED");
              console.log(`[Messaging] Realtime channel ${channelName} SUBSCRIBED`);
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setRealtimeStatus("ERROR");
              console.warn(`[Messaging] Realtime channel ${channelName} status: ${status}`, err);
            } else if (status === "CLOSED") {
              // CLOSED is normal during teardown/rejoin and must not turn a
              // healthy active connection into a false connection error.
              console.debug(`[Messaging] Realtime channel ${channelName} CLOSED`);
            }
          });
      } catch (error) {
        if (!isActive) return;
        setRealtimeStatus("ERROR");
        console.error("[Messaging] Realtime setup error:", String(error));
      }
    };

    void setupRealtimeChannel();

    return () => {
      isActive = false;
      if (channel) {
        const supabase = getSupabaseBrowserClient();
        void supabase.removeChannel(channel);
      }
      setRealtimeStatus("CONNECTING");
    };
  }, [isAuthenticated, selectedConvId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageMutation = trpc.messaging.sendMessage.useMutation({
    onSuccess: (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [
          ...prev,
          {
            id: newMsg.id,
            conversationId: newMsg.conversationId,
            senderId: newMsg.senderId,
            content: newMsg.content,
            isRead: newMsg.isRead ?? false,
            createdAt: new Date(newMsg.createdAt),
          },
        ];
      });
      setInputValue("");
      refetchConversations();
    },
  });

  const sendMessage = useCallback(() => {
    if (!inputValue.trim() || !selectedConvId || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({
      conversationId: selectedConvId,
      content: inputValue.trim(),
    });
  }, [inputValue, selectedConvId, sendMessageMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <MessageSquare className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Sign in to access messages</h2>
          <Button asChild>
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                realtimeStatus === "CONNECTED"
                  ? "bg-green-500"
                  : realtimeStatus === "ERROR"
                  ? "bg-red-500"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            <span className="text-sm text-muted-foreground">
              {realtimeStatus === "CONNECTED"
                ? "Connected"
                : realtimeStatus === "ERROR"
                ? "Connection error"
                : "Connecting..."}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border rounded-xl overflow-hidden h-[600px]">
          {/* Conversation List */}
          <div className="border-r border-border bg-card flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Conversations</h2>
            </div>
            <ScrollArea className="flex-1">
              {!conversations || conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No conversations yet.</p>
                  <p className="text-xs mt-1">Start a conversation from a job page.</p>
                </div>
              ) : (
                conversations.map((conv: Conversation) => {
                  const isSelected = conv.id === selectedConvId;
                  const otherUserId = conv.clientId === user?.id ? conv.professionalId : conv.clientId;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`w-full p-4 text-left hover:bg-accent/50 transition-colors border-b border-border/50 ${
                        isSelected ? "bg-primary/10 border-l-2 border-l-primary" : conv.unreadCount ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                            {otherUserId.toString().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm truncate ${conv.unreadCount ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                              Job #{conv.jobId}
                            </span>
                            {Boolean(conv.unreadCount) && <Badge className="ml-2 shrink-0 bg-primary text-primary-foreground">{conv.unreadCount! > 99 ? "99+" : conv.unreadCount}</Badge>}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.clientId === user?.id ? "You are the contractor" : "You are the professional"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </div>

          {/* Message Thread */}
          <div className="col-span-2 flex flex-col bg-background">
            {!selectedConvId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Select a conversation</p>
                  <p className="text-sm mt-1">Choose a conversation from the left to start messaging.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 border-b border-border bg-card">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">JB</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        Job #{conversations?.find((c: Conversation) => c.id === selectedConvId)?.jobId}
                      </p>
                      <p className="text-xs text-muted-foreground">Project conversation</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => {
                        const isMine = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                                isMine
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-card border border-border text-foreground rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                              <p className={`text-xs mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-border bg-card">
                  <div className="flex gap-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!inputValue.trim() || sendMessageMutation.isPending}>
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
