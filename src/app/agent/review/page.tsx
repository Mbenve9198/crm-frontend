"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Loader2, Bot, CheckCircle, XCircle, Edit3, Send, Clock, AlertTriangle, MessageSquare, Mail, Phone } from "lucide-react";

interface ConversationMessage {
  _id: string;
  role: "lead" | "agent" | "human";
  content: string;
  channel: "email" | "whatsapp";
  createdAt: string;
  metadata?: {
    aiConfidence?: number;
    wasAutoSent?: boolean;
    humanEdited?: boolean;
  };
}

interface Conversation {
  _id: string;
  status: string;
  stage: string;
  channel: string;
  agentIdentity: { name: string; surname: string; role: string };
  messages: ConversationMessage[];
  context: {
    leadCategory?: string;
    leadSource?: string;
    restaurantData?: {
      name?: string;
      city?: string;
      rank?: number | string;
      keyword?: string;
      rating?: number;
      reviewsCount?: number;
    };
    objections?: string[];
    nextAction?: string;
    humanNotes?: Array<{ note: string; at: string }>;
  };
  metrics: {
    messagesCount: number;
    agentMessagesCount: number;
    humanInterventions: number;
  };
  contact?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    status: string;
    source: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function AgentReviewPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>}>
      <AgentReviewPage />
    </Suspense>
  );
}

function AgentReviewPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("id");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [stats, setStats] = useState<{ active: number; awaitingHuman: number; converted: number; lost: number } | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiClient.request<Conversation[]>("/agent/conversations?status=awaiting_human&limit=50");
      if (res.success && res.data) {
        setConversations(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error("Errore fetch conversazioni:", err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.request<{ active: number; awaitingHuman: number; converted: number; lost: number }>("/agent/stats");
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Errore fetch stats:", err);
    }
  }, []);

  const fetchConversationDetail = useCallback(async (id: string) => {
    try {
      const res = await apiClient.request<Conversation>(`/agent/conversations/${id}`);
      if (res.success && res.data) {
        setSelectedConv(res.data);
      }
    } catch (err) {
      console.error("Errore fetch dettaglio:", err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLoading(true);
      Promise.all([fetchConversations(), fetchStats()]).finally(() => setLoading(false));
    }
  }, [authLoading, isAuthenticated, fetchConversations, fetchStats]);

  useEffect(() => {
    if (focusId) {
      fetchConversationDetail(focusId);
    }
  }, [focusId, fetchConversationDetail]);

  const handleApprove = async () => {
    if (!selectedConv) return;
    setActionLoading(true);
    try {
      await apiClient.request(`/agent/conversations/${selectedConv._id}/approve`, { method: "POST", body: JSON.stringify({}) });
      await fetchConversations();
      setSelectedConv(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendModified = async () => {
    if (!selectedConv || !editContent.trim()) return;
    setActionLoading(true);
    try {
      await apiClient.request(`/agent/conversations/${selectedConv._id}/reply`, {
        method: "POST",
        body: JSON.stringify({ content: editContent }),
      });
      await fetchConversations();
      setSelectedConv(null);
      setEditMode(false);
      setEditContent("");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!selectedConv) return;
    setActionLoading(true);
    try {
      await apiClient.request(`/agent/conversations/${selectedConv._id}/discard`, { method: "POST" });
      await fetchConversations();
      setSelectedConv(null);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Accesso richiesto</p>
      </div>
    );
  }

  const getLastLeadMessage = (conv: Conversation) => conv.messages.filter((m) => m.role === "lead").pop();
  const getAgentDraft = (conv: Conversation) => conv.messages.filter((m) => m.role === "agent").pop();

  return (
    <div className="flex h-screen bg-gray-50">
      <ModernSidebar />
      <div className="flex-1 flex overflow-hidden">
        {/* Lista conversazioni */}
        <div className="w-96 border-r bg-white overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-5 w-5 text-purple-600" />
              <h1 className="text-lg font-bold text-gray-900">AI Agent Review</h1>
              {stats?.awaitingHuman ? (
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {stats.awaitingHuman}
                </span>
              ) : null}
            </div>
            {stats && (
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-blue-50 rounded p-1.5 text-center">
                  <div className="font-bold text-blue-700">{stats.active}</div>
                  <div className="text-blue-500">Attive</div>
                </div>
                <div className="bg-orange-50 rounded p-1.5 text-center">
                  <div className="font-bold text-orange-700">{stats.awaitingHuman}</div>
                  <div className="text-orange-500">Review</div>
                </div>
                <div className="bg-green-50 rounded p-1.5 text-center">
                  <div className="font-bold text-green-700">{stats.converted}</div>
                  <div className="text-green-500">Convertiti</div>
                </div>
                <div className="bg-red-50 rounded p-1.5 text-center">
                  <div className="font-bold text-red-700">{stats.lost}</div>
                  <div className="text-red-500">Persi</div>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-400" />
              <p className="text-sm">Nessuna conversazione in attesa di review</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const lastLead = getLastLeadMessage(conv);
              return (
                <div
                  key={conv._id}
                  onClick={() => fetchConversationDetail(conv._id)}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedConv?._id === conv._id ? "bg-purple-50 border-l-2 border-l-purple-500" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {conv.contact?.name || "Lead"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(conv.updatedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    {conv.channel === "email" ? <Mail className="h-3 w-3 text-gray-400" /> : <MessageSquare className="h-3 w-3 text-green-500" />}
                    <span className="text-xs text-gray-500">{conv.contact?.email}</span>
                  </div>
                  {lastLead && (
                    <p className="text-xs text-gray-600 line-clamp-2">{lastLead.content}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">{conv.stage}</span>
                    <span className="text-xs text-gray-400">{conv.metrics.messagesCount} msg</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dettaglio conversazione */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Seleziona una conversazione per il review</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg text-gray-900">{selectedConv.contact?.name}</h2>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{selectedConv.contact?.email}</span>
                      {selectedConv.contact?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedConv.contact.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <div>Agent: {selectedConv.agentIdentity.name} {selectedConv.agentIdentity.surname}</div>
                    <div>Source: {selectedConv.context.leadSource}</div>
                  </div>
                </div>

                {/* Contesto ristorante */}
                {selectedConv.context.restaurantData && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedConv.context.restaurantData.rank && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        Rank: {selectedConv.context.restaurantData.rank}° per &quot;{selectedConv.context.restaurantData.keyword}&quot;
                      </span>
                    )}
                    {selectedConv.context.restaurantData.rating && (
                      <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                        {selectedConv.context.restaurantData.rating}/5 ({selectedConv.context.restaurantData.reviewsCount} recensioni)
                      </span>
                    )}
                    {selectedConv.context.objections && selectedConv.context.objections.length > 0 && (
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">
                        Obiezioni: {selectedConv.context.objections.join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Messaggi */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConv.messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${msg.role === "lead" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg p-3 ${
                        msg.role === "lead"
                          ? "bg-white border shadow-sm"
                          : msg.role === "human"
                          ? "bg-blue-100 border border-blue-200"
                          : "bg-purple-50 border border-purple-200"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          {msg.role === "lead" ? "Lead" : msg.role === "human" ? "Marco" : "AI Agent"}
                        </span>
                        <span className="text-xs text-gray-300">
                          {new Date(msg.createdAt).toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                        </span>
                        {msg.channel === "whatsapp" && <MessageSquare className="h-3 w-3 text-green-500" />}
                        {msg.metadata?.wasAutoSent === false && msg.role === "agent" && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">bozza</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {/* Motivo richiesta review */}
                {selectedConv.context.nextAction && (
                  <div className="flex justify-center">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 max-w-md text-center">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                      <p className="text-xs text-orange-700">{selectedConv.context.nextAction}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Azioni */}
              <div className="p-4 border-t bg-white">
                {editMode ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full border rounded-lg p-3 text-sm min-h-[120px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Scrivi la risposta modificata..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSendModified}
                        disabled={actionLoading || !editContent.trim()}
                        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Invia Modificata
                      </button>
                      <button
                        onClick={() => { setEditMode(false); setEditContent(""); }}
                        className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Approva e Invia
                    </button>
                    <button
                      onClick={() => {
                        const draft = getAgentDraft(selectedConv);
                        setEditContent(draft?.content || "");
                        setEditMode(true);
                      }}
                      disabled={actionLoading}
                      className="flex-1 bg-purple-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Edit3 className="h-4 w-4" />
                      Modifica e Invia
                    </button>
                    <button
                      onClick={handleDiscard}
                      disabled={actionLoading}
                      className="px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Scarta
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
