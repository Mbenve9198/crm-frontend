"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import {
  Loader2, Bot, CheckCircle, XCircle, Edit3, Send, Clock,
  AlertTriangle, MessageSquare, Mail, Phone, Search, Filter
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

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
    isDraft?: boolean;
    draftSubject?: string;
    whatsappDraft?: string;
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
    emailSubject?: string;
    whatsappDraft?: string;
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

interface Stats {
  active: number;
  awaitingHuman: number;
  converted: number;
  lost: number;
  paused: number;
  dead: number;
  totalConvs: number;
}

export default function AgentReviewPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>}>
      <AgentReviewPage />
    </Suspense>
  );
}

function AgentReviewPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("id");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const [activeTab, setActiveTab] = useState("awaiting_human");
  const [searchQuery, setSearchQuery] = useState("");

  const [editEmailMode, setEditEmailMode] = useState(false);
  const [editWaMode, setEditWaMode] = useState(false);
  const [editEmailContent, setEditEmailContent] = useState("");
  const [editEmailSubject, setEditEmailSubject] = useState("");
  const [editWaContent, setEditWaContent] = useState("");

  const fetchConversations = useCallback(async (status: string, search?: string) => {
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("limit", "50");
      if (search) params.set("search", search);

      const res = await apiClient.request<Conversation[]>(`/agent/conversations?${params.toString()}`);
      if (res.success && res.data) {
        setConversations(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error("Errore fetch conversazioni:", err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.request<Stats>("/agent/stats");
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
      Promise.all([fetchConversations(activeTab, searchQuery), fetchStats()]).finally(() => setLoading(false));
    }
  }, [authLoading, isAuthenticated, activeTab, fetchConversations, fetchStats, searchQuery]);

  useEffect(() => {
    if (focusId) {
      fetchConversationDetail(focusId);
    }
  }, [focusId, fetchConversationDetail]);

  const resetEditState = () => {
    setEditEmailMode(false);
    setEditWaMode(false);
    setEditEmailContent("");
    setEditEmailSubject("");
    setEditWaContent("");
  };

  const handleSelectConv = (conv: Conversation) => {
    resetEditState();
    fetchConversationDetail(conv._id);
  };

  const getEmailDraft = (conv: Conversation) => conv.messages.filter(m => m.role === "agent").pop();
  const getWaDraft = (conv: Conversation) => {
    const lastAgent = conv.messages.filter(m => m.role === "agent").pop();
    return lastAgent?.metadata?.whatsappDraft || conv.context?.whatsappDraft || null;
  };

  const handleApprove = async () => {
    if (!selectedConv) return;
    setActionLoading(true);
    try {
      const body: Record<string, string | undefined> = {};
      if (editEmailMode && editEmailContent.trim()) body.emailContent = editEmailContent;
      if (editEmailSubject.trim()) body.emailSubject = editEmailSubject;
      if (editWaMode && editWaContent.trim()) body.whatsappContent = editWaContent;

      await apiClient.request(`/agent/conversations/${selectedConv._id}/approve`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      resetEditState();
      setSelectedConv(null);
      await Promise.all([fetchConversations(activeTab, searchQuery), fetchStats()]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!selectedConv) return;
    setActionLoading(true);
    try {
      await apiClient.request(`/agent/conversations/${selectedConv._id}/discard`, { method: "POST" });
      resetEditState();
      setSelectedConv(null);
      await Promise.all([fetchConversations(activeTab, searchQuery), fetchStats()]);
    } finally {
      setActionLoading(false);
    }
  };

  const startEditEmail = () => {
    if (!selectedConv) return;
    const draft = getEmailDraft(selectedConv);
    setEditEmailContent(draft?.content || "");
    setEditEmailSubject(selectedConv.context?.emailSubject || draft?.metadata?.draftSubject || "");
    setEditEmailMode(true);
  };

  const startEditWa = () => {
    if (!selectedConv) return;
    const wa = getWaDraft(selectedConv);
    setEditWaContent(wa || "");
    setEditWaMode(true);
  };

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ora";
    if (mins < 60) return `${mins}m fa`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h fa`;
    const days = Math.floor(hours / 24);
    return `${days}g fa`;
  };

  const statusLabel: Record<string, string> = {
    active: "Attiva",
    awaiting_human: "In Review",
    paused: "In Pausa",
    escalated: "Escalata",
    converted: "Convertita",
    dead: "Chiusa",
  };

  const statusColor: Record<string, string> = {
    active: "bg-blue-100 text-blue-700",
    awaiting_human: "bg-orange-100 text-orange-700",
    paused: "bg-gray-100 text-gray-600",
    escalated: "bg-red-100 text-red-700",
    converted: "bg-green-100 text-green-700",
    dead: "bg-gray-100 text-gray-500",
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-600">Accesso richiesto</p></div>;
  }

  return (
    <div className="h-screen bg-gray-50">
      <ModernSidebar />
      <div className="pl-16 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="border-b bg-white px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-900">AI Agent Dashboard</h1>
            </div>
            {stats && (
              <div className="flex gap-2">
                {[
                  { label: "Review", value: stats.awaitingHuman, color: "bg-orange-50 text-orange-700 border-orange-200" },
                  { label: "Attive", value: stats.active, color: "bg-blue-50 text-blue-700 border-blue-200" },
                  { label: "Convertite", value: stats.converted, color: "bg-green-50 text-green-700 border-green-200" },
                  { label: "Totali", value: stats.totalConvs, color: "bg-gray-50 text-gray-600 border-gray-200" },
                ].map((s) => (
                  <div key={s.label} className={`px-3 py-1 rounded-lg border text-xs font-medium ${s.color}`}>
                    <span className="font-bold text-sm">{s.value}</span> {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="px-6 py-2 bg-white border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedConv(null); resetEditState(); }}>
              <TabsList>
                <TabsTrigger value="awaiting_human" className="text-xs">
                  In Review {stats?.awaitingHuman ? <Badge variant="destructive" className="ml-1 h-4 text-[10px] px-1">{stats.awaitingHuman}</Badge> : null}
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs">Attive</TabsTrigger>
                <TabsTrigger value="paused" className="text-xs">In Pausa</TabsTrigger>
                <TabsTrigger value="all" className="text-xs">Tutte</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Cerca nome o email..."
                className="pl-8 h-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") fetchConversations(activeTab, searchQuery); }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Conversation List */}
          <div className="w-80 border-r bg-white overflow-y-auto flex-shrink-0">
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-400" />
                <p className="text-sm">Nessuna conversazione</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const lastLead = conv.messages.filter(m => m.role === "lead").pop();
                const isSelected = selectedConv?._id === conv._id;
                return (
                  <div
                    key={conv._id}
                    onClick={() => handleSelectConv(conv)}
                    className={`p-3 border-b cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? "bg-purple-50 border-l-2 border-l-purple-500" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900 truncate max-w-[180px]">{conv.contact?.name || "Lead"}</span>
                      <span className="text-[10px] text-gray-400">{timeAgo(conv.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColor[conv.status] || "bg-gray-100 text-gray-500"}`}>
                        {statusLabel[conv.status] || conv.status}
                      </span>
                      {conv.contact?.phone && <Phone className="h-3 w-3 text-gray-300" />}
                      <span className="text-[10px] text-gray-400 truncate">{conv.contact?.email}</span>
                    </div>
                    {lastLead && (
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{lastLead.content}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Conversation Detail */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedConv ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Seleziona una conversazione</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 border-b bg-white flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-lg text-gray-900">{selectedConv.contact?.name}</h2>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{selectedConv.contact?.email}</span>
                        {selectedConv.contact?.phone && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedConv.contact.phone}</span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded font-medium ${statusColor[selectedConv.status] || ""}`}>
                          {statusLabel[selectedConv.status] || selectedConv.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <div>Agent: {selectedConv.agentIdentity.name} {selectedConv.agentIdentity.surname}</div>
                      <div>Source: {selectedConv.context.leadSource}</div>
                      <div>{selectedConv.metrics.messagesCount} msg | {selectedConv.stage}</div>
                    </div>
                  </div>

                  {selectedConv.context.restaurantData && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedConv.context.restaurantData.rank && (
                        <Badge variant="outline" className="text-[10px]">
                          Rank: {selectedConv.context.restaurantData.rank} per &quot;{selectedConv.context.restaurantData.keyword}&quot;
                        </Badge>
                      )}
                      {selectedConv.context.restaurantData.rating && (
                        <Badge variant="outline" className="text-[10px]">
                          {selectedConv.context.restaurantData.rating}/5 ({selectedConv.context.restaurantData.reviewsCount} rec.)
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Thread */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {selectedConv.messages.map((msg) => (
                    <div key={msg._id} className={`flex ${msg.role === "lead" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[70%] rounded-lg p-3 ${
                        msg.role === "lead" ? "bg-white border shadow-sm" :
                        msg.role === "human" ? "bg-blue-50 border border-blue-200" :
                        "bg-purple-50 border border-purple-200"
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-medium text-gray-500">
                            {msg.role === "lead" ? "Lead" : msg.role === "human" ? "Umano" : "AI"}
                          </span>
                          {msg.channel === "whatsapp" ? <MessageSquare className="h-3 w-3 text-green-500" /> : <Mail className="h-3 w-3 text-blue-400" />}
                          <span className="text-[10px] text-gray-300">
                            {new Date(msg.createdAt).toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                          </span>
                          {msg.metadata?.isDraft && <Badge variant="outline" className="text-[9px] h-4 px-1 text-orange-600 border-orange-300">bozza</Badge>}
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Approval Panel */}
                {selectedConv.status === "awaiting_human" && (
                  <div className="border-t bg-white p-4 flex-shrink-0 space-y-3">
                    {/* Dual Channel Preview / Edit */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Email */}
                      <Card className="border-blue-200">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-blue-500" />
                              <span className="text-xs font-semibold text-gray-700">Email</span>
                            </div>
                            {!editEmailMode && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={startEditEmail}>
                                <Edit3 className="h-3 w-3 mr-1" /> Modifica
                              </Button>
                            )}
                          </div>
                          {editEmailMode ? (
                            <div className="space-y-1.5">
                              <Input
                                placeholder="Oggetto email..."
                                className="h-7 text-xs"
                                value={editEmailSubject}
                                onChange={(e) => setEditEmailSubject(e.target.value)}
                              />
                              <Textarea
                                value={editEmailContent}
                                onChange={(e) => setEditEmailContent(e.target.value)}
                                className="text-xs min-h-[100px] resize-none"
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400">{wordCount(editEmailContent)} parole</span>
                                <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => setEditEmailMode(false)}>Annulla</Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              {selectedConv.context?.emailSubject && (
                                <p className="text-[10px] text-gray-400 mb-1">Oggetto: {selectedConv.context.emailSubject}</p>
                              )}
                              <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-6">
                                {getEmailDraft(selectedConv)?.content || "Nessun draft"}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* WhatsApp */}
                      <Card className={`${getWaDraft(selectedConv) ? "border-green-200" : "border-gray-200 opacity-50"}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                              <span className="text-xs font-semibold text-gray-700">WhatsApp</span>
                              {!selectedConv.contact?.phone && <span className="text-[10px] text-gray-400">(no telefono)</span>}
                            </div>
                            {getWaDraft(selectedConv) && !editWaMode && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={startEditWa}>
                                <Edit3 className="h-3 w-3 mr-1" /> Modifica
                              </Button>
                            )}
                          </div>
                          {editWaMode ? (
                            <div className="space-y-1.5">
                              <Textarea
                                value={editWaContent}
                                onChange={(e) => setEditWaContent(e.target.value)}
                                className="text-xs min-h-[100px] resize-none"
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400">{wordCount(editWaContent)} parole</span>
                                <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => setEditWaMode(false)}>Annulla</Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-6">
                              {getWaDraft(selectedConv) || "Nessun draft WhatsApp"}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                        {editEmailMode || editWaMode ? "Invia Modificati" : "Approva e Invia"}
                      </Button>
                      <Button
                        onClick={handleDiscard}
                        disabled={actionLoading}
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Scarta
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
