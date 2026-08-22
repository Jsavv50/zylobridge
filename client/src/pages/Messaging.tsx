import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { ZylobridgeLogo } from "@/components/ZylobridgeLogo";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Loader2, ArrowLeft, ChevronLeft } from "lucide-react";
import { getLoginUrl } from "@/const";
import { formatDistanceToNow } from "date-fns";
import { getSupabaseBrowserClient, initSupabaseRealtimeAuth } from "@/lib/supabase";
import { Link } from "wouter";

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
}

type RealtimeStatus = "CONNECTING" | "CONNECTED" | "ERROR";

export default function Messaging() {
  const { user, isAuthenticated, loading } = useAuth();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("CONNECTING");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, refetch: refetchConversations } = trpc.messaging.myConversations.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: fetchedMessages, isLoading: messagesLoading } = trpc.messaging.getMessages.useQuery(
    { conversationId: selectedConvId! },
    { enabled: !!selectedConvId }
  );

  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })));
    }
  }, [fetchedMessages]);

  const refetchConversationsRef = useRef(refetchConversations);
  useEffect(() => {
    refetchConversationsRef.current = refetchConversations;
  }, [refetchConversations]);

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
          return;
        }

        const supabase = getSupabaseBrowserClient();
        channel = supabase.channel(channelName, {
          config: { private: true },
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
          .subscribe((status) => {
            if (!isActive) return;
            if (status === "SUBSCRIBED") {
              setRealtimeStatus("CONNECTED");
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setRealtimeStatus("ERROR");
            }
          });
      } catch (error) {
        if (!isActive) return;
        setRealtimeStatus("ERROR");
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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md w-full">
          <MessageSquare className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Sign in to access messages</h2>
          <Button asChild className="w-full">
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border h-16 px-4 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground pl-0 pr-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="h-5 w-[1px] bg-border" />
          <ZylobridgeLogo imageClassName="h-7 w-7 object-contain" textSizeClass="text-lg font-extrabold tracking-tight" />
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              realtimeStatus === "CONNECTED"
                ? "bg-emerald-500"
                : realtimeStatus === "ERROR"
                ? "bg-rose-500"
                : "bg-amber-500 animate-pulse"
            }`}
          />
          <span className="text-xs md:text-sm text-muted-foreground">
            {realtimeStatus === "CONNECTED"
              ? "Live"
              : realtimeStatus === "ERROR"
              ? "Connection error"
              : "Connecting..."}
          </span>
        </div>
      </header>

      {/* Main Messaging Viewport Container */}
      <main className="flex-1 container mx-auto px-2 sm:px-4 lg:px-8 max-w-7xl py-4 sm:py-6 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Project Messages</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Secure real-time communication between clients and verified professionals.</p>
          </div>
        </div>

        {/* Responsive Messaging Split Layout */}
        <div className="flex-1 border border-border rounded-2xl bg-card overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px] max-h-[calc(100vh-10rem)] shadow-lg">
          {/* Conversation Sidebar (Collapsible / Full-width on mobile when no conv selected) */}
          <div className={`md:col-span-4 lg:col-span-4 border-r border-border flex flex-col bg-card/50 ${selectedConvId ? "hidden md:flex" : "flex"}`}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground">Conversations</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {conversations?.length ?? 0} active
              </span>
            </div>
            <ScrollArea className="flex-1">
              {!conversations || conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground space-y-3">
                  <MessageSquare className="h-10 w-10 mx-auto opacity-40 text-primary" />
                  <p className="text-sm font-medium">No conversations yet.</p>
                  <p className="text-xs max-w-xs mx-auto">Start a conversation directly from job postings or applications.</p>
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <Link href="/jobs">Browse Jobs</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {conversations.map((conv: Conversation) => {
                    const isSelected = conv.id === selectedConvId;
                    const otherUserId = conv.clientId === user?.id ? conv.professionalId : conv.clientId;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConvId(conv.id)}
                        className={`w-full p-4 text-left transition-all hover:bg-accent/40 flex items-start gap-3 ${
                          isSelected ? "bg-primary/15 border-l-4 border-l-primary" : ""
                        }`}
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                            {otherUserId.toString().padStart(2, "0")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-semibold text-foreground truncate">
                              Job #{conv.jobId}
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {conv.clientId === user?.id ? "Role: Contractor / Client" : "Role: Verified Professional"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Active Message Thread Panel */}
          <div className={`md:col-span-8 lg:col-span-8 flex flex-col bg-background min-h-0 ${!selectedConvId ? "hidden md:flex" : "flex"}`}>
            {!selectedConvId ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div className="space-y-3 max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Select a Conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose an active thread from the sidebar to inspect milestone discussions and exchange secure real-time messages.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b border-border bg-card flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConvId(null)}
                      className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-lg"
                      aria-label="Back to conversations"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">JB</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">
                        Job #{conversations?.find((c: Conversation) => c.id === selectedConvId)?.jobId} Discussion
                      </h3>
                      <p className="text-xs text-muted-foreground">Secure Escrow-Protected Chat</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="hidden sm:inline-flex text-xs font-medium text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                    Encrypted & Verified
                  </Badge>
                </div>

                {/* Message Scroll Area */}
                <ScrollArea className="flex-1 p-4 sm:p-6 min-h-0">
                  {messagesLoading ? (
                    <div className="flex justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground space-y-2">
                      <p className="text-sm font-medium">No messages in this thread yet.</p>
                      <p className="text-xs">Send your first message below to begin collaboration.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isMine = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                                isMine
                                  ? "bg-primary text-primary-foreground rounded-br-xs"
                                  : "bg-card border border-border text-foreground rounded-bl-xs"
                              }`}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                              <p className={`text-[10px] mt-1 text-right ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
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

                {/* Message Composer Bar */}
                <div className="p-3 sm:p-4 border-t border-border bg-card shrink-0">
                  <div className="flex items-center gap-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a secure message..."
                      className="flex-1 bg-background"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!inputValue.trim() || sendMessageMutation.isPending}
                      className="gap-2 shrink-0 px-4"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span className="hidden sm:inline">Send</span>
                          <Send className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
