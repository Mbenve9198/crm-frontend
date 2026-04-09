"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import {
  Loader2, Activity, Brain, AlertTriangle, TrendingUp,
  Send, Pencil, Phone, XCircle, Briefcase, ArrowRight,
  Trash2, ChevronRight, RefreshCw, DollarSign, Users,
  MessageSquare, CheckCircle, Edit3, XOctagon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface FeedEvent {
  id: string;
  timestamp: string;
  type: string;
  icon: string;
  contactName: string;
  contactEmail: string;
  description: string;
  details: Record<string, unknown>;
  conversationId: string | null;
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

const ICON_MAP: Record<string, typeof Activity> = {
  pencil: Pencil, send: Send, brain: Brain, "alert-triangle": AlertTriangle,
  "x-circle": XCircle, briefcase: Briefcase, "arrow-right": ArrowRight,
  trash: Trash2, phone: Phone, loader: Loader2, activity: Activity,
};

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

function DashboardContent() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [strategies, setStrategies] = useState<StrategyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");

  const fetchFeed = useCallback(async () => {
    try {
      const res = await apiClient.request<{ events: FeedEvent[] }>("/agent/live-feed?limit=30");
      const events = (res as unknown as { events?: FeedEvent[] })?.events ?? res?.data?.events;
      if (events) setFeed(events);
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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { fetchFeed(); fetchStats(); fetchBriefing(); }}>
                <RefreshCw className="h-4 w-4 mr-1" /> Aggiorna
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><Users className="h-4 w-4" /> Conv. Attive</div>
                <div className="text-2xl font-bold mt-1">{convActive}</div>
                <div className="text-xs text-amber-600">{convAwaiting} in attesa</div>
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
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><CheckCircle className="h-4 w-4" /> Approval</div>
                <div className="text-2xl font-bold mt-1">{approvalRate}%</div>
                <div className="text-xs text-gray-400">
                  {stats?.feedback?.approved || 0}A / {stats?.feedback?.modified || 0}M / {stats?.feedback?.discarded || 0}D
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
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-500" />
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
              </CardContent>
            </Card>
          )}

          {/* Main Content: Feed + Metrics */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Live Feed (3/5) */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Live Activity Feed
                    <span className="text-xs font-normal text-gray-400 ml-auto">Aggiornamento ogni 10s</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-auto">
                    {loading ? (
                      <div className="p-8 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></div>
                    ) : feed.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">Nessuna attivita recente</div>
                    ) : feed.map((ev) => {
                      const Icon = ICON_MAP[ev.icon] || Activity;
                      const isAlert = ev.type === "alert";
                      return (
                        <div key={ev.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${isAlert ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                          <div className={`mt-0.5 p-1.5 rounded-lg ${isAlert ? 'bg-red-100 text-red-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{ev.description}</span>
                              {ev.details?.channel && <Badge variant="outline" className="text-xs">{ev.details.channel as string}</Badge>}
                            </div>
                            {ev.contactName && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ev.contactName}</p>}
                            {ev.details?.stage && <p className="text-xs text-gray-400">{ev.details.stage as string}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {ev.details?.costUsd && <span className="text-xs text-gray-400">${(ev.details.costUsd as number).toFixed(3)}</span>}
                            <span className="text-xs text-gray-400">{timeAgo(ev.timestamp)}</span>
                            {ev.conversationId && (
                              <a href={`/agent/review?id=${ev.conversationId}`} className="text-blue-500 hover:text-blue-600">
                                <ChevronRight className="h-4 w-4" />
                              </a>
                            )}
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
                        return (
                          <div key={src} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize">{src.replace(/_/g, " ")}</span>
                              <span className="text-xs text-gray-400">{rate}% conv.</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 text-center">
                                <div className="text-lg font-bold">{data.contacted}</div>
                                <div className="text-xs text-gray-400">Contattati</div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 text-center">
                                <div className="text-lg font-bold">{data.responded}</div>
                                <div className="text-xs text-gray-400">Risposto</div>
                              </div>
                              <div className="bg-green-50 dark:bg-green-950/20 rounded p-2 text-center">
                                <div className="text-lg font-bold text-green-600">{data.converted}</div>
                                <div className="text-xs text-gray-400">Convertiti</div>
                              </div>
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
