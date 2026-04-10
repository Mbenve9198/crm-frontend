"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { usePersistedState } from "@/hooks/usePersistedState";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import {
  Loader2, Activity, Brain, AlertTriangle, TrendingUp,
  Pencil, Phone, XCircle, Briefcase, ArrowRight,
  RefreshCw, DollarSign, Users, CheckCircle, XOctagon,
  ChevronRight, ExternalLink, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

// ─── Types ───

interface ActivityCard {
  type: "draft" | "sales_manager" | "error" | string;
  timestamp: string;
  conversationId?: string | null;
  contactName?: string;
  contactEmail?: string;
  channel?: string;
  costUsd?: number | null;
  narrative: string;
  draftPreview?: string | null;
  strategyTag?: string | null;
  toolsUsed?: string | null;
  toolCalls?: number | null;
  briefingHeadline?: string | null;
  alerts?: Array<{ severity: string; message: string }>;
  error?: string;
  events: number;
}

interface DashboardStats {
  conversations: Record<string, number>;
  convBySource: Record<string, number>;
  outcomes: { total: number; converted: number; conversionRate: string };
  feedback: { total: number; approved: number; modified: number; discarded: number; approvalRate: string };
  costs: { totalCost: number; totalCalls: number };
  bySource: Record<string, { contacted: number; responded: number; converted: number }>;
  activeDirectives: number;
  briefing: BriefingData | null;
  period: { days: number; since: string };
}

interface BriefingData {
  headline: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  call_insights?: string;
  next_actions?: string[];
  createdAt?: string;
}

interface StrategyData {
  tag: string;
  used: number;
  converted: number;
  lost: number;
  conversionRate: string;
  feedback: { approved: number; modified: number; discarded: number; total: number };
}

interface PeekData {
  id: string;
  contact: { id: string; name: string; email: string; phone?: string; source: string; status: string } | null;
  stage: string;
  status: string;
  channel: string;
  strategyTag?: string;
  lastMessages: Array<{ role: string; content: string; channel: string; isDraft: boolean; createdAt: string }>;
  emailDraft: string | null;
  whatsappDraft: string | null;
  messageCount: number;
  updatedAt: string;
  reviewUrl: string;
}

interface FilteredConversation {
  id: string;
  contactName: string;
  contactEmail: string;
  stage: string;
  status: string;
  source?: string;
  lastMessagePreview: string;
  updatedAt: string;
}

// ─── Helpers ───

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s fa`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m fa`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h fa`;
  return `${Math.floor(hrs / 24)}g fa`;
}

function cardColor(type: string): string {
  switch (type) {
    case "draft": return "border-l-blue-500";
    case "sales_manager": return "border-l-purple-500";
    case "error": return "border-l-red-500";
    case "handoff": return "border-l-green-500";
    case "terminal_detected": return "border-l-orange-500";
    default: return "border-l-gray-300 dark:border-l-gray-700";
  }
}

function cardIcon(type: string) {
  switch (type) {
    case "draft": return Pencil;
    case "sales_manager": return Briefcase;
    case "error": return AlertTriangle;
    case "handoff": return Phone;
    case "terminal_detected": return XCircle;
    case "stage_change": return ArrowRight;
    case "planner_decision": return Brain;
    default: return Activity;
  }
}

function cardBg(type: string): string {
  switch (type) {
    case "draft": return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
    case "sales_manager": return "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400";
    case "error": return "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";
    case "handoff": return "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400";
    default: return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  }
}

// ─── Components ───

function ConversationPeekSheet({ convId, open, onClose }: { convId: string | null; open: boolean; onClose: () => void }) {
  const [data, setData] = useState<PeekData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!convId || !open) return;
    setLoading(true);
    apiClient.request<PeekData>(`/agent/conversations/${convId}/peek`)
      .then(res => { if (res?.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [convId, open]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-auto">
        <SheetHeader>
          <SheetTitle>{data?.contact?.name || "Conversazione"}</SheetTitle>
          <SheetDescription>{data?.contact?.email}</SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6" /></div>
        ) : data ? (
          <div className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{data.stage}</Badge>
              <Badge variant={data.status === "awaiting_human" ? "default" : "secondary"}>{data.status}</Badge>
              {data.channel && <Badge variant="outline">{data.channel}</Badge>}
              {data.strategyTag && <Badge variant="secondary">{data.strategyTag}</Badge>}
            </div>

            {data.contact?.phone && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Tel: {data.contact.phone}</p>
            )}

            <div>
              <h4 className="text-sm font-medium mb-2">Ultimi messaggi ({data.messageCount} totali)</h4>
              <div className="space-y-2">
                {data.lastMessages.map((m, i) => (
                  <div key={i} className={`rounded-lg p-3 text-sm ${
                    m.role === "lead"
                      ? "bg-blue-50 dark:bg-blue-950/30 ml-0 mr-8"
                      : m.isDraft
                        ? "bg-amber-50 dark:bg-amber-950/30 ml-8 mr-0 border border-dashed border-amber-300"
                        : "bg-gray-50 dark:bg-gray-900 ml-8 mr-0"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium uppercase text-gray-500">{m.role}</span>
                      <Badge variant="outline" className="text-[10px] h-4">{m.channel}</Badge>
                      {m.isDraft && <Badge variant="secondary" className="text-[10px] h-4">bozza</Badge>}
                      <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(m.createdAt)}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{m.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {data.emailDraft && (
              <div>
                <h4 className="text-sm font-medium mb-1 text-amber-600">Bozza email attuale</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-dashed border-amber-200">
                  {data.emailDraft}
                </p>
              </div>
            )}

            <div className="pt-2">
              <a href={data.reviewUrl} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <ExternalLink className="h-4 w-4" /> Apri in Review
              </a>
              {data.contact?.id && (
                <a href={`/contacts/${data.contact.id}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-600 font-medium ml-4">
                  <Eye className="h-4 w-4" /> Scheda contatto
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-8">Nessun dato disponibile</p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ConversationListSheet({
  open, onClose, title, filterParams,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  filterParams: string;
}) {
  const [conversations, setConversations] = useState<FilteredConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [peekId, setPeekId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !filterParams) return;
    setLoading(true);
    apiClient.request<FilteredConversation[]>(`/agent/conversations-by-filter?${filterParams}`)
      .then(res => { if (res?.data) setConversations(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, filterParams]);

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{conversations.length} conversazioni</SheetDescription>
          </SheetHeader>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Nessuna conversazione trovata</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 mt-4">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPeekId(c.id)}
                  className="w-full text-left py-3 px-1 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{c.contactName || c.contactEmail}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{c.stage}</Badge>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  {c.lastMessagePreview && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{c.lastMessagePreview}</p>
                  )}
                  <span className="text-[10px] text-gray-400">{timeAgo(c.updatedAt)}</span>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <ConversationPeekSheet convId={peekId} open={!!peekId} onClose={() => setPeekId(null)} />
    </>
  );
}

// ─── Main Dashboard ───

function DashboardContent() {
  const { user } = useAuth();
  const [cards, setCards] = useState<ActivityCard[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [strategies, setStrategies] = useState<StrategyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = usePersistedState<"today" | "week" | "month">("agent-dashboard:period", "week");

  const [peekConvId, setPeekConvId] = useState<string | null>(null);
  const [listSheet, setListSheet] = useState<{ open: boolean; title: string; params: string }>({ open: false, title: "", params: "" });

  const fetchFeed = useCallback(async () => {
    try {
      const res = await apiClient.request<{ cards: ActivityCard[] }>("/agent/activity-stream?limit=25");
      const raw = res as unknown as { cards?: ActivityCard[]; data?: { cards?: ActivityCard[] } };
      const result = raw?.cards ?? raw?.data?.cards;
      if (result) setCards(result);
    } catch { /* ignore */ }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.request<DashboardStats>(`/agent/dashboard-stats?period=${period}`);
      if (res?.data) setStats(res.data);
    } catch { /* ignore */ }
  }, [period]);

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await apiClient.request<BriefingData | null>("/agent/briefing");
      if (res?.data !== undefined) setBriefing(res.data ?? null);
    } catch { /* ignore */ }
  }, []);

  const fetchStrategies = useCallback(async () => {
    try {
      const res = await apiClient.request<StrategyData[]>("/agent/strategy-stats");
      if (res?.data) setStrategies(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchFeed(), fetchStats(), fetchBriefing(), fetchStrategies()]).finally(() => setLoading(false));
  }, [user, fetchFeed, fetchStats, fetchBriefing, fetchStrategies]);

  useEffect(() => {
    if (!user) return;
    const feedInterval = setInterval(fetchFeed, 10_000);
    const statsInterval = setInterval(fetchStats, 60_000);
    const briefingInterval = setInterval(fetchBriefing, 300_000);
    return () => { clearInterval(feedInterval); clearInterval(statsInterval); clearInterval(briefingInterval); };
  }, [user, fetchFeed, fetchStats, fetchBriefing]);

  useEffect(() => { if (user) fetchStats(); }, [period, user, fetchStats]);

  if (!user) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>;

  const convActive = stats?.conversations?.active || 0;
  const convAwaiting = stats?.conversations?.awaiting_human || 0;
  const convRate = stats?.outcomes?.conversionRate || "0";
  const costTotal = stats?.costs?.totalCost?.toFixed(2) || "0.00";
  const approvalRate = stats?.feedback?.approvalRate || "0";

  const openFilterSheet = (title: string, params: string) => {
    setListSheet({ open: true, title, params });
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <ModernSidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Agent Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monitoraggio real-time del team AI</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { fetchFeed(); fetchStats(); fetchBriefing(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Aggiorna
            </Button>
          </div>

          {/* KPI Cards — clickable */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openFilterSheet("Conversazioni attive", `status=active&period=${period}`)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><Users className="h-4 w-4" /> Conv. Attive</div>
                <div className="text-2xl font-bold mt-1">{convActive}</div>
                <button className="text-xs text-amber-600 hover:underline" onClick={(e) => { e.stopPropagation(); openFilterSheet("In attesa review", "status=awaiting_human&period=month"); }}>
                  {convAwaiting} in attesa
                </button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><TrendingUp className="h-4 w-4" /> Conv. Rate</div>
                <div className="text-2xl font-bold mt-1">{convRate}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><DollarSign className="h-4 w-4" /> Costo</div>
                <div className="text-2xl font-bold mt-1">${costTotal}</div>
                <div className="text-xs text-gray-400">{stats?.costs?.totalCalls || 0} chiamate LLM</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openFilterSheet("Approvate", `feedbackAction=approved&period=${period}`)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><CheckCircle className="h-4 w-4" /> Approval</div>
                <div className="text-2xl font-bold mt-1">{approvalRate}%</div>
                <div className="text-xs text-gray-400">
                  <button className="hover:underline" onClick={(e) => { e.stopPropagation(); openFilterSheet("Approvate", `feedbackAction=approved&period=${period}`); }}>
                    {stats?.feedback?.approved || 0}A
                  </button>
                  {" / "}
                  <button className="hover:underline" onClick={(e) => { e.stopPropagation(); openFilterSheet("Modificate", `feedbackAction=modified&period=${period}`); }}>
                    {stats?.feedback?.modified || 0}M
                  </button>
                  {" / "}
                  <button className="hover:underline" onClick={(e) => { e.stopPropagation(); openFilterSheet("Scartate", `feedbackAction=discarded&period=${period}`); }}>
                    {stats?.feedback?.discarded || 0}D
                  </button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><Brain className="h-4 w-4" /> Directives</div>
                <div className="text-2xl font-bold mt-1">{stats?.activeDirectives || 0}</div>
                <div className="text-xs text-gray-400">Sales Manager attive</div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Manager Briefing */}
          {briefing && (
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-purple-500" />
                  Sales Manager Briefing
                  {briefing.createdAt && <span className="text-xs font-normal text-gray-400 ml-auto">{timeAgo(briefing.createdAt)}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-semibold text-lg">{briefing.headline}</p>
                <p className="text-gray-600 dark:text-gray-300">{briefing.summary}</p>
                <div className="grid md:grid-cols-3 gap-4">
                  {briefing.highlights?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-600 mb-1">Highlights</h4>
                      <ul className="text-sm space-y-1">{briefing.highlights.map((h, i) => <li key={i} className="text-gray-600 dark:text-gray-300">+ {h}</li>)}</ul>
                    </div>
                  )}
                  {briefing.concerns?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-600 mb-1">Concerns</h4>
                      <ul className="text-sm space-y-1">{briefing.concerns.map((c, i) => <li key={i} className="text-gray-600 dark:text-gray-300">- {c}</li>)}</ul>
                    </div>
                  )}
                  {briefing.next_actions?.length ? (
                    <div>
                      <h4 className="text-sm font-medium text-blue-600 mb-1">Next Actions</h4>
                      <ul className="text-sm space-y-1">{briefing.next_actions.map((a, i) => <li key={i} className="text-gray-600 dark:text-gray-300">{a}</li>)}</ul>
                    </div>
                  ) : null}
                </div>
                {briefing.call_insights && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <h4 className="text-sm font-medium text-amber-600 mb-1 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Call Insights</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{briefing.call_insights}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Main Content: Feed + Metrics */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Activity Feed (3/5) */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Activity Feed
                    <span className="text-xs font-normal text-gray-400 ml-auto">Aggiornamento ogni 10s</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-auto">
                    {loading ? (
                      <div className="p-8 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></div>
                    ) : cards.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">Nessuna attivita recente</div>
                    ) : cards.map((card, idx) => {
                      const Icon = cardIcon(card.type);
                      const clickable = !!card.conversationId;

                      return (
                        <div
                          key={`${card.timestamp}-${idx}`}
                          className={`border-l-4 ${cardColor(card.type)} flex items-start gap-3 px-4 py-3 ${
                            clickable ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900" : ""
                          } transition-colors`}
                          onClick={() => { if (clickable) setPeekConvId(card.conversationId!); }}
                        >
                          <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${cardBg(card.type)}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {card.narrative.replace(/\*\*/g, "")}
                              </span>
                              {card.channel && <Badge variant="outline" className="text-[10px] h-5">{card.channel}</Badge>}
                              {card.events > 1 && <span className="text-[10px] text-gray-400">{card.events} eventi</span>}
                            </div>
                            {card.contactName && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.contactName}</p>
                            )}
                            {card.draftPreview && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 italic border-l-2 border-blue-200 dark:border-blue-800 pl-2">
                                {card.draftPreview}
                              </p>
                            )}
                            {card.briefingHeadline && (
                              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">{card.briefingHeadline}</p>
                            )}
                            {card.alerts && card.alerts.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {card.alerts.map((a, ai) => (
                                  <p key={ai} className={`text-xs ${a.severity === "critical" ? "text-red-600" : "text-amber-600"}`}>
                                    {a.severity === "critical" ? "🚨" : "⚠️"} {a.message}
                                  </p>
                                ))}
                              </div>
                            )}
                            {card.error && (
                              <p className="text-xs text-red-500 mt-0.5 truncate">{card.error}</p>
                            )}
                            {card.strategyTag && (
                              <Badge variant="secondary" className="text-[10px] h-4 mt-1">{card.strategyTag}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-right">
                            {card.costUsd != null && card.costUsd > 0 && (
                              <span className="text-xs text-gray-400">${card.costUsd.toFixed(3)}</span>
                            )}
                            <span className="text-xs text-gray-400">{timeAgo(card.timestamp)}</span>
                            {clickable && <ChevronRight className="h-4 w-4 text-gray-400" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metrics by Source (2/5) */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Metriche per Source</CardTitle>
                    <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                      <TabsList className="h-7">
                        <TabsTrigger value="today" className="text-xs px-2 h-6">Oggi</TabsTrigger>
                        <TabsTrigger value="week" className="text-xs px-2 h-6">7g</TabsTrigger>
                        <TabsTrigger value="month" className="text-xs px-2 h-6">30g</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent>
                  {stats?.bySource && Object.keys(stats.bySource).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(stats.bySource).map(([src, data]) => {
                        const rate = data.contacted > 0 ? (data.converted / data.contacted * 100).toFixed(1) : "0";
                        const periodParam = period === "today" ? "1d" : period === "week" ? "7d" : "30d";
                        return (
                          <div key={src} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize">{src.replace(/_/g, " ")}</span>
                              <span className="text-xs text-gray-400">{rate}% conv.</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => openFilterSheet(`${src} — Contattati`, `source=${src}&period=${periodParam}`)}
                                className="bg-gray-50 dark:bg-gray-900 rounded p-2 text-center hover:ring-2 hover:ring-blue-300 transition-all"
                              >
                                <div className="text-lg font-bold">{data.contacted}</div>
                                <div className="text-xs text-gray-400">Contattati</div>
                              </button>
                              <button
                                onClick={() => openFilterSheet(`${src} — Risposto`, `source=${src}&hasLeadReply=true&period=${periodParam}`)}
                                className="bg-gray-50 dark:bg-gray-900 rounded p-2 text-center hover:ring-2 hover:ring-blue-300 transition-all"
                              >
                                <div className="text-lg font-bold">{data.responded}</div>
                                <div className="text-xs text-gray-400">Risposto</div>
                              </button>
                              <button
                                onClick={() => openFilterSheet(`${src} — Convertiti`, `source=${src}&status=converted&period=${periodParam}`)}
                                className="bg-green-50 dark:bg-green-950/20 rounded p-2 text-center hover:ring-2 hover:ring-green-300 transition-all"
                              >
                                <div className="text-lg font-bold text-green-600">{data.converted}</div>
                                <div className="text-xs text-gray-400">Convertiti</div>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Nessun dato per questo periodo</p>
                  )}
                </CardContent>
              </Card>

              {/* Strategy Stats */}
              {strategies.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Strategy Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {strategies.slice(0, 6).map((s) => (
                        <div key={s.tag} className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium capitalize">{s.tag.replace(/_/g, " ")}</span>
                            <span className="text-xs text-gray-400 ml-2">({s.used}x)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={parseFloat(s.conversionRate) > 10 ? "default" : "outline"} className="text-xs">
                              {s.conversionRate}%
                            </Badge>
                            {s.feedback.total > 0 && (
                              <span className="text-xs text-gray-400">
                                {s.feedback.approved}
                                <CheckCircle className="h-3 w-3 inline text-green-500 mx-0.5" />
                                {s.feedback.discarded > 0 && <>{s.feedback.discarded}<XOctagon className="h-3 w-3 inline text-red-400 mx-0.5" /></>}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sheets */}
      <ConversationPeekSheet convId={peekConvId} open={!!peekConvId} onClose={() => setPeekConvId(null)} />
      <ConversationListSheet
        open={listSheet.open}
        onClose={() => setListSheet({ open: false, title: "", params: "" })}
        title={listSheet.title}
        filterParams={listSheet.params}
      />
    </div>
  );
}

export default function AgentDashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
