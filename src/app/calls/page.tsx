"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { Call, CallOutcome, CallFlag, CallsAnalyticsData, CallOwnerAnalytics } from "@/types/call";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Loader2, Phone, PhoneOff, PhoneIncoming, Play, Pause, Star,
  Flag, MessageSquare, Filter, Calendar, Clock, TrendingUp,
  BarChart3, ChevronDown, ChevronRight, AlertTriangle, Award,
  ThumbsDown, Send, X, Check
} from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://menuchat-crm-backend-production.up.railway.app";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const outcomeLabels: Record<string, { label: string; color: string }> = {
  interested: { label: "Interessato", color: "bg-green-100 text-green-800" },
  "not-interested": { label: "Non interessato", color: "bg-red-100 text-red-800" },
  callback: { label: "Richiamare", color: "bg-yellow-100 text-yellow-800" },
  voicemail: { label: "Segreteria", color: "bg-gray-100 text-gray-700" },
  "wrong-number": { label: "Num. sbagliato", color: "bg-orange-100 text-orange-800" },
  "meeting-set": { label: "Appuntamento", color: "bg-blue-100 text-blue-800" },
  "sale-made": { label: "Vendita", color: "bg-emerald-100 text-emerald-800" },
  "no-answer": { label: "No risposta", color: "bg-gray-100 text-gray-600" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  completed: { label: "Completata", color: "text-green-700" },
  "no-answer": { label: "No risposta", color: "text-gray-500" },
  busy: { label: "Occupato", color: "text-orange-600" },
  failed: { label: "Fallita", color: "text-red-600" },
  canceled: { label: "Annullata", color: "text-gray-400" },
  "in-progress": { label: "In corso", color: "text-blue-600" },
  ringing: { label: "Squilla", color: "text-purple-600" },
  initiated: { label: "Iniziata", color: "text-gray-500" },
  queued: { label: "In coda", color: "text-gray-400" },
};

type Tab = "library" | "analytics";

export default function CallsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const canAccess = user?.role === "admin" || user?.role === "manager";

  const [activeTab, setActiveTab] = useState<Tab>("library");

  // Library state
  const [calls, setCalls] = useState<Call[]>([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCalls: 0, hasNext: false, hasPrev: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState(formatDateInput(new Date(Date.now() - 30 * 86400000)));
  const [filterTo, setFilterTo] = useState(formatDateInput(new Date()));
  const [filterOwner, setFilterOwner] = useState("all");
  const [filterOutcome, setFilterOutcome] = useState("");
  const [filterHasRecording, setFilterHasRecording] = useState("");
  const [filterFlag, setFilterFlag] = useState("");
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<CallsAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsFrom, setAnalyticsFrom] = useState(formatDateInput(new Date(Date.now() - 30 * 86400000)));
  const [analyticsTo, setAnalyticsTo] = useState(formatDateInput(new Date()));

  // Owners list (for filters)
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);

  // Coaching inline
  const [coachingCallId, setCoachingCallId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [savingCoaching, setSavingCoaching] = useState(false);

  const loadOwners = useCallback(async () => {
    try {
      const res = await apiClient.getUsersForAssignment();
      if (res.success && res.data?.users) {
        setOwners(
          res.data.users.map((u: any) => ({ id: u._id, name: `${u.firstName} ${u.lastName}` }))
        );
      }
    } catch {}
  }, []);

  const loadCalls = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.getAllCalls({
        from: filterFrom, to: filterTo,
        owner: filterOwner !== "all" ? filterOwner : undefined,
        outcome: filterOutcome || undefined,
        hasRecording: filterHasRecording || undefined,
        flag: filterFlag || undefined,
        page, limit: 30,
      });
      if (res.success) {
        setCalls(res.data || []);
        if ((res as any).pagination) setPagination((res as any).pagination);
      }
    } catch (e: any) {
      setError(e.message || "Errore nel caricamento");
    } finally {
      setIsLoading(false);
    }
  }, [filterFrom, filterTo, filterOwner, filterOutcome, filterHasRecording, filterFlag]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await apiClient.getCallsAnalytics({ from: analyticsFrom, to: analyticsTo });
      if (res.success && res.data) setAnalyticsData(res.data);
    } catch {} finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsFrom, analyticsTo]);

  useEffect(() => { if (canAccess) loadOwners(); }, [canAccess, loadOwners]);
  useEffect(() => { if (canAccess && activeTab === "library") loadCalls(); }, [canAccess, activeTab]);
  useEffect(() => { if (canAccess && activeTab === "analytics") loadAnalytics(); }, [canAccess, activeTab]);

  const handleRating = async (callId: string, rating: number) => {
    setSavingCoaching(true);
    try {
      const res = await apiClient.updateCallCoaching(callId, { rating });
      if (res.success && res.data) {
        setCalls((prev) => prev.map((c) => (c._id === callId ? { ...c, ...res.data } : c)));
      }
    } catch {} finally { setSavingCoaching(false); }
  };

  const handleFlag = async (callId: string, flag: CallFlag) => {
    setSavingCoaching(true);
    try {
      const currentCall = calls.find((c) => c._id === callId);
      const newFlag = currentCall?.flag === flag ? null : flag;
      const res = await apiClient.updateCallCoaching(callId, { flag: newFlag });
      if (res.success && res.data) {
        setCalls((prev) => prev.map((c) => (c._id === callId ? { ...c, ...res.data } : c)));
      }
    } catch {} finally { setSavingCoaching(false); }
  };

  const handleComment = async (callId: string) => {
    if (!commentText.trim()) return;
    setSavingCoaching(true);
    try {
      const res = await apiClient.updateCallCoaching(callId, { comment: commentText.trim() });
      if (res.success && res.data) {
        setCalls((prev) => prev.map((c) => (c._id === callId ? { ...c, ...res.data } : c)));
        setCommentText("");
      }
    } catch {} finally { setSavingCoaching(false); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!isAuthenticated || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert className="max-w-md bg-white"><AlertTitle>Accesso non autorizzato</AlertTitle><AlertDescription>Solo admin e manager possono visualizzare questa pagina.</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      <main className="pl-16">
        <div className="container mx-auto py-6 px-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Phone className="h-6 w-6 text-blue-600" />
                Chiamate
              </h1>
              <p className="text-sm text-gray-500 mt-1">Call library, analytics e coaching per il team.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {([
              { key: "library" as Tab, label: "Call Library", icon: Phone },
              { key: "analytics" as Tab, label: "Analytics", icon: BarChart3 },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === t.key ? "bg-white shadow-sm text-blue-700" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* ===== TAB: CALL LIBRARY ===== */}
          {activeTab === "library" && (
            <>
              {/* Filters */}
              <Card>
                <CardContent className="pt-4">
                  <form
                    onSubmit={(e) => { e.preventDefault(); loadCalls(1); }}
                    className="flex flex-wrap gap-3 items-end"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">Dal</label>
                      <input type="date" className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">Al</label>
                      <input type="date" className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">Owner</label>
                      <select className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
                        <option value="all">Tutti</option>
                        {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">Esito</label>
                      <select className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs" value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)}>
                        <option value="">Tutti</option>
                        {Object.entries(outcomeLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">Registrazione</label>
                      <select className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs" value={filterHasRecording} onChange={(e) => setFilterHasRecording(e.target.value)}>
                        <option value="">Tutte</option>
                        <option value="true">Con registrazione</option>
                        <option value="false">Senza registrazione</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">Flag</label>
                      <select className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs" value={filterFlag} onChange={(e) => setFilterFlag(e.target.value)}>
                        <option value="">Tutte</option>
                        <option value="best-practice">Best practice</option>
                        <option value="needs-review">Da rivedere</option>
                      </select>
                    </div>
                    <Button type="submit" disabled={isLoading} className="h-9">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                      <span className="ml-1.5">Filtra</span>
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {error && (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  <AlertTitle>Errore</AlertTitle><AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Call List */}
              <Card>
                <div className="px-5 py-3 bg-blue-50 border-b flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-blue-800">
                    {pagination.totalCalls} chiamate trovate
                  </h3>
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" disabled={!pagination.hasPrev} onClick={() => loadCalls(pagination.currentPage - 1)}>← Prec</Button>
                      <span className="text-xs text-gray-600">Pag. {pagination.currentPage}/{pagination.totalPages}</span>
                      <Button size="sm" variant="outline" disabled={!pagination.hasNext} onClick={() => loadCalls(pagination.currentPage + 1)}>Succ →</Button>
                    </div>
                  )}
                </div>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
                  ) : calls.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">Nessuna chiamata trovata per i filtri selezionati.</div>
                  ) : (
                    <div className="divide-y">
                      {calls.map((call) => {
                        const isExpanded = expandedCallId === call._id;
                        const st = statusLabels[call.status] || { label: call.status, color: "text-gray-500" };
                        const oc = call.outcome ? outcomeLabels[call.outcome] : null;

                        return (
                          <div key={call._id} className="group">
                            {/* Main row */}
                            <div
                              className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/80 cursor-pointer transition-colors"
                              onClick={() => setExpandedCallId(isExpanded ? null : call._id)}
                            >
                              {/* Expand icon */}
                              <div className="text-gray-400">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </div>

                              {/* Status icon */}
                              <div className={`flex-shrink-0 ${st.color}`}>
                                {call.status === "completed" ? <Phone className="h-4 w-4" /> : call.status === "no-answer" || call.status === "busy" ? <PhoneOff className="h-4 w-4" /> : <PhoneIncoming className="h-4 w-4" />}
                              </div>

                              {/* Contact & Owner */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Link href={`/?search=${encodeURIComponent(call.contact?.name || "")}`} className="font-medium text-sm text-indigo-700 hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                                    {call.contact?.name || "Contatto sconosciuto"}
                                  </Link>
                                  {call.contact?.source && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{call.contact.source}</span>}
                                </div>
                                <p className="text-xs text-gray-500">{call.initiatedBy?.firstName} {call.initiatedBy?.lastName}</p>
                              </div>

                              {/* Date & Time */}
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-medium text-gray-700">{formatDate(call.createdAt)}</p>
                                <p className="text-[11px] text-gray-400">{formatTime(call.createdAt)}</p>
                              </div>

                              {/* Duration */}
                              <div className="w-16 text-right flex-shrink-0">
                                <span className="text-xs font-mono text-gray-600">{formatDuration(call.duration)}</span>
                              </div>

                              {/* Status */}
                              <div className="w-24 flex-shrink-0">
                                <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                              </div>

                              {/* Outcome */}
                              <div className="w-28 flex-shrink-0">
                                {oc ? (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${oc.color}`}>{oc.label}</span>
                                ) : (
                                  <span className="text-xs text-gray-300">—</span>
                                )}
                              </div>

                              {/* Recording indicator */}
                              <div className="w-8 flex-shrink-0 text-center">
                                {call.recordingSid && <Play className="h-3.5 w-3.5 text-blue-500 inline" />}
                              </div>

                              {/* Flag & Rating */}
                              <div className="w-20 flex-shrink-0 flex items-center gap-1 justify-end">
                                {call.flag === "best-practice" && <Award className="h-3.5 w-3.5 text-green-600" />}
                                {call.flag === "needs-review" && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                                {call.rating && (
                                  <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{call.rating}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                              <div className="bg-gray-50/80 border-t px-5 py-4 space-y-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {/* Left: Audio + Info */}
                                  <div className="space-y-3">
                                    {/* Audio player */}
                                    {call.recordingSid && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1.5">Registrazione ({formatDuration(call.recordingDuration || 0)})</p>
                                        <audio
                                          controls
                                          preload="none"
                                          className="w-full h-10"
                                          onPlay={() => setPlayingCallId(call._id)}
                                          onPause={() => setPlayingCallId(null)}
                                          onEnded={() => setPlayingCallId(null)}
                                        >
                                          <source src={`${BACKEND_URL}/api/calls/recording/${call.recordingSid}`} type="audio/wav" />
                                        </audio>
                                      </div>
                                    )}

                                    {/* Notes */}
                                    {call.notes && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Note chiamata</p>
                                        <p className="text-sm text-gray-700 bg-white rounded border p-2">{call.notes}</p>
                                      </div>
                                    )}

                                    {/* Call details */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div><span className="text-gray-500">Numero:</span> <span className="font-mono text-gray-700">{call.toNumber}</span></div>
                                      <div><span className="text-gray-500">Durata:</span> <span className="font-medium">{formatDuration(call.duration)}</span></div>
                                      <div><span className="text-gray-500">Stato:</span> <span className={st.color}>{st.label}</span></div>
                                      {call.contact?.email && <div><span className="text-gray-500">Email:</span> <span className="text-gray-700">{call.contact.email}</span></div>}
                                    </div>
                                  </div>

                                  {/* Right: Coaching */}
                                  <div className="space-y-3 border-l pl-4">
                                    <p className="text-xs font-semibold text-gray-600 uppercase">Coaching</p>

                                    {/* Rating */}
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-500 mr-2">Rating:</span>
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <button
                                          key={s}
                                          onClick={() => handleRating(call._id, s)}
                                          disabled={savingCoaching}
                                          className="hover:scale-110 transition-transform"
                                        >
                                          <Star className={`h-5 w-5 ${(call.rating || 0) >= s ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                                        </button>
                                      ))}
                                    </div>

                                    {/* Flags */}
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleFlag(call._id, "best-practice")}
                                        disabled={savingCoaching}
                                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                                          call.flag === "best-practice" ? "bg-green-100 border-green-300 text-green-800" : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
                                        }`}
                                      >
                                        <Award className="h-3.5 w-3.5" /> Best practice
                                      </button>
                                      <button
                                        onClick={() => handleFlag(call._id, "needs-review")}
                                        disabled={savingCoaching}
                                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                                          call.flag === "needs-review" ? "bg-orange-100 border-orange-300 text-orange-800" : "bg-white border-gray-200 text-gray-600 hover:border-orange-300"
                                        }`}
                                      >
                                        <ThumbsDown className="h-3.5 w-3.5" /> Da rivedere
                                      </button>
                                    </div>

                                    {/* Comments */}
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1.5">Commenti coaching:</p>
                                      {call.coachingComments && call.coachingComments.length > 0 && (
                                        <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto">
                                          {call.coachingComments.map((cc) => (
                                            <div key={cc._id} className="bg-white border rounded p-2 text-xs">
                                              <div className="flex justify-between text-gray-400 mb-0.5">
                                                <span className="font-medium text-gray-600">{cc.author?.firstName} {cc.author?.lastName}</span>
                                                <span>{formatDate(cc.createdAt)}</span>
                                              </div>
                                              <p className="text-gray-700">{cc.text}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <div className="flex gap-1.5">
                                        <input
                                          type="text"
                                          placeholder="Aggiungi feedback..."
                                          className="flex-1 h-8 rounded-md border border-gray-200 px-2 text-xs"
                                          value={coachingCallId === call._id ? commentText : ""}
                                          onFocus={() => setCoachingCallId(call._id)}
                                          onChange={(e) => { setCoachingCallId(call._id); setCommentText(e.target.value); }}
                                          onKeyDown={(e) => { if (e.key === "Enter") handleComment(call._id); }}
                                        />
                                        <Button
                                          size="sm"
                                          className="h-8 px-2"
                                          disabled={savingCoaching || !commentText.trim() || coachingCallId !== call._id}
                                          onClick={() => handleComment(call._id)}
                                        >
                                          <Send className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== TAB: ANALYTICS ===== */}
          {activeTab === "analytics" && (
            <>
              {/* Date filters */}
              <Card>
                <CardContent className="pt-4">
                  <form
                    onSubmit={(e) => { e.preventDefault(); loadAnalytics(); }}
                    className="flex flex-wrap gap-3 items-end"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">Dal</label>
                      <input type="date" className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs" value={analyticsFrom} onChange={(e) => setAnalyticsFrom(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">Al</label>
                      <input type="date" className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs" value={analyticsTo} onChange={(e) => setAnalyticsTo(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={analyticsLoading} className="h-9">
                      {analyticsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                      <span className="ml-1.5">Analizza</span>
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {analyticsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
              ) : analyticsData && analyticsData.owners.length > 0 ? (
                <>
                  {/* KPI Summary */}
                  {(() => {
                    const totals = analyticsData.owners.reduce(
                      (acc, o) => ({
                        calls: acc.calls + o.totalCalls,
                        answered: acc.answered + o.answeredCalls,
                        duration: acc.duration + o.totalDuration,
                        recordings: acc.recordings + o.withRecording,
                      }),
                      { calls: 0, answered: 0, duration: 0, recordings: 0 }
                    );
                    return (
                      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
                        <Card className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <p className="text-xs font-medium text-gray-500 uppercase">Chiamate totali</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{totals.calls}</p>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-green-500">
                          <CardContent className="pt-4">
                            <p className="text-xs font-medium text-gray-500 uppercase">Tasso risposta</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">{totals.calls > 0 ? Math.round((totals.answered / totals.calls) * 100) : 0}%</p>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-500">
                          <CardContent className="pt-4">
                            <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> Durata totale</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{Math.round(totals.duration / 60)}m</p>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-amber-500">
                          <CardContent className="pt-4">
                            <p className="text-xs font-medium text-gray-500 uppercase">Con registrazione</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{totals.recordings} <span className="text-sm font-normal text-gray-500">/ {totals.calls}</span></p>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}

                  {/* Owner Comparison Table */}
                  <Card className="overflow-hidden">
                    <div className="px-5 py-3.5 bg-blue-50 border-b">
                      <h3 className="text-sm font-semibold text-blue-800">Comparativa Owner — Chiamate</h3>
                    </div>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-collapse">
                          <thead>
                            <tr>
                              <th rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50 border-b-2 border-gray-200" />
                              <th colSpan={4} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-blue-800 bg-blue-50 border-b border-blue-200">Volume</th>
                              <th colSpan={3} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-purple-800 bg-purple-50 border-b border-purple-200">Performance</th>
                              <th colSpan={3} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 border-b border-emerald-200">Esiti positivi</th>
                              <th colSpan={2} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-amber-800 bg-amber-50 border-b border-amber-200">Coaching</th>
                            </tr>
                            <tr className="border-b-2 border-gray-200 bg-gray-50/80">
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Totali</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Completate</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">No risp.</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Con rec.</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">% Risposta</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Durata tot.</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Dur. media</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Interessati</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Appuntam.</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Vendite</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Rating medio</th>
                              <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Best practice</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analyticsData.owners.map((o) => (
                              <tr key={o.ownerId} className="border-b hover:bg-gray-50">
                                <td className="px-3 py-2.5 font-medium text-gray-900">{o.ownerName}</td>
                                <td className="px-3 py-2.5 text-right">{o.totalCalls}</td>
                                <td className="px-3 py-2.5 text-right">{o.completedCalls}</td>
                                <td className="px-3 py-2.5 text-right text-gray-500">{o.noAnswerCalls}</td>
                                <td className="px-3 py-2.5 text-right text-gray-500">{o.withRecording}</td>
                                <td className="px-3 py-2.5 text-right">
                                  <span className={`font-medium ${o.answerRate >= 50 ? "text-green-700" : o.answerRate >= 30 ? "text-amber-700" : "text-red-700"}`}>
                                    {o.answerRate}%
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right text-gray-600">{formatDuration(o.totalDuration)}</td>
                                <td className="px-3 py-2.5 text-right text-gray-600">{formatDuration(o.avgDuration)}</td>
                                <td className="px-3 py-2.5 text-right text-green-700 font-medium">{o.outcomes.interested}</td>
                                <td className="px-3 py-2.5 text-right text-blue-700 font-medium">{o.outcomes.meetingSet}</td>
                                <td className="px-3 py-2.5 text-right text-emerald-700 font-medium">{o.outcomes.saleMade}</td>
                                <td className="px-3 py-2.5 text-right">
                                  {o.coaching.avgRating ? (
                                    <span className="flex items-center justify-end gap-0.5 text-amber-600 font-medium">
                                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{o.coaching.avgRating}
                                    </span>
                                  ) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-3 py-2.5 text-right text-green-600">{o.coaching.bestPractice || "—"}</td>
                              </tr>
                            ))}
                            {/* Team total row */}
                            {analyticsData.owners.length > 1 && (() => {
                              const t = analyticsData.owners.reduce(
                                (acc, o) => ({
                                  totalCalls: acc.totalCalls + o.totalCalls,
                                  completedCalls: acc.completedCalls + o.completedCalls,
                                  noAnswerCalls: acc.noAnswerCalls + o.noAnswerCalls,
                                  withRecording: acc.withRecording + o.withRecording,
                                  answeredCalls: acc.answeredCalls + o.answeredCalls,
                                  totalDuration: acc.totalDuration + o.totalDuration,
                                  interested: acc.interested + o.outcomes.interested,
                                  meetingSet: acc.meetingSet + o.outcomes.meetingSet,
                                  saleMade: acc.saleMade + o.outcomes.saleMade,
                                  bestPractice: acc.bestPractice + o.coaching.bestPractice,
                                }),
                                { totalCalls: 0, completedCalls: 0, noAnswerCalls: 0, withRecording: 0, answeredCalls: 0, totalDuration: 0, interested: 0, meetingSet: 0, saleMade: 0, bestPractice: 0 }
                              );
                              return (
                                <tr className="bg-blue-50/70 font-semibold border-t-2 border-blue-300">
                                  <td className="px-3 py-2.5 text-blue-800">TEAM</td>
                                  <td className="px-3 py-2.5 text-right">{t.totalCalls}</td>
                                  <td className="px-3 py-2.5 text-right">{t.completedCalls}</td>
                                  <td className="px-3 py-2.5 text-right">{t.noAnswerCalls}</td>
                                  <td className="px-3 py-2.5 text-right">{t.withRecording}</td>
                                  <td className="px-3 py-2.5 text-right">{t.totalCalls > 0 ? Math.round((t.answeredCalls / t.totalCalls) * 100) : 0}%</td>
                                  <td className="px-3 py-2.5 text-right">{formatDuration(t.totalDuration)}</td>
                                  <td className="px-3 py-2.5 text-right">{t.totalCalls > 0 ? formatDuration(Math.round(t.totalDuration / t.totalCalls)) : "—"}</td>
                                  <td className="px-3 py-2.5 text-right text-green-700">{t.interested}</td>
                                  <td className="px-3 py-2.5 text-right text-blue-700">{t.meetingSet}</td>
                                  <td className="px-3 py-2.5 text-right text-emerald-700">{t.saleMade}</td>
                                  <td className="px-3 py-2.5 text-right text-gray-400">—</td>
                                  <td className="px-3 py-2.5 text-right text-green-600">{t.bestPractice}</td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hour Distribution */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-purple-600" /> Distribuzione oraria chiamate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analyticsData.owners.map((o) => {
                          const max = Math.max(...o.hourDistribution, 1);
                          return (
                            <div key={o.ownerId}>
                              <p className="text-xs font-medium text-gray-700 mb-1">{o.ownerName}</p>
                              <div className="flex items-end gap-px h-10">
                                {o.hourDistribution.map((count, hour) => (
                                  <Tooltip key={hour}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="flex-1 bg-blue-400 hover:bg-blue-600 rounded-t-sm transition-colors min-h-[2px]"
                                        style={{ height: `${(count / max) * 100}%` }}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">{hour}:00 — {count} chiamate</TooltipContent>
                                  </Tooltip>
                                ))}
                              </div>
                              <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                                <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : !analyticsLoading && (
                <div className="py-16 text-center text-gray-500">
                  Clicca <span className="font-semibold">Analizza</span> per caricare i dati.
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
