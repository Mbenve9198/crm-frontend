"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import {
  OwnerPerformanceData,
  OwnerPerformanceRow,
  ForecastData,
  LeadCohortFunnelAnalyticsData,
  LeadCohortContact,
  LeadFunnelStepContact,
} from "@/types/analytics";
import { OwnerDrilldownSheet, DrilldownCategory } from "@/components/ui/owner-drilldown-sheet";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  Pause,
  DollarSign,
  Target,
} from "lucide-react";

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatEur(v: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

type SortKey = keyof Pick<
  OwnerPerformanceRow,
  | "ownerName"
  | "cohort"
  | "notTouched"
  | "pctNotTouched"
  | "avgFirstTouchDays"
  | "qrCodeSent"
  | "convToQR"
  | "freeTrialStarted"
  | "convQRtoFT"
  | "won"
  | "convFTtoWon"
  | "lostBFT"
  | "lostAFT"
  | "stalled"
  | "mrrWon"
  | "avgSalesCycleDays"
>;

type SemaphoreLevel = "green" | "yellow" | "red";

function semaphore(
  value: number,
  thresholds: { green: [number, number]; yellow: [number, number] }
): SemaphoreLevel {
  if (value >= thresholds.green[0] && value <= thresholds.green[1]) return "green";
  if (value >= thresholds.yellow[0] && value <= thresholds.yellow[1]) return "yellow";
  return "red";
}

const semColors: Record<SemaphoreLevel, string> = {
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

function SemBadge({ value, level, suffix = "%" }: { value: number | string; level: SemaphoreLevel; suffix?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${semColors[level]}`}>
      {value}{suffix}
    </span>
  );
}

function TrendArrow({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0)
    return (
      <span className="inline-flex items-center justify-end w-[42px] text-gray-400">
        <Minus className="h-3 w-3" />
      </span>
    );
  if (delta > 0)
    return (
      <span className="inline-flex items-center justify-end w-[42px] text-emerald-600 text-[10px] font-bold">
        <TrendingUp className="h-3 w-3 mr-0.5" />+{delta}
      </span>
    );
  return (
    <span className="inline-flex items-center justify-end w-[42px] text-red-600 text-[10px] font-bold">
      <TrendingDown className="h-3 w-3 mr-0.5" />{delta}
    </span>
  );
}

function CohortContactTable({ contacts, dateLabel, dateKey }: { contacts: LeadCohortContact[]; dateLabel: string; dateKey: "cohortStartAt" }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Nome</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Email</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Sorgente</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">MRR</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">{dateLabel}</th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((c) => (
          <tr key={c.id} className="border-b last:border-0 hover:bg-white/60">
            <td className="py-1 px-2"><Link href={`/?search=${encodeURIComponent(c.name)}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{c.name}</Link></td>
            <td className="py-1 px-2 text-gray-600">{c.email}</td>
            <td className="py-1 px-2 text-gray-600">{c.source}</td>
            <td className="py-1 px-2 text-gray-900">{c.mrr != null ? `€${c.mrr}` : "—"}</td>
            <td className="py-1 px-2 text-gray-600">{c[dateKey] ? new Date(c[dateKey]!).toLocaleDateString("it-IT") : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FunnelContactTable({ contacts }: { contacts: LeadFunnelStepContact[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Nome</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Email</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Sorgente</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">MRR</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Data</th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((c) => (
          <tr key={c.id} className="border-b last:border-0 hover:bg-white/60">
            <td className="py-1 px-2"><Link href={`/?search=${encodeURIComponent(c.name)}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{c.name}</Link></td>
            <td className="py-1 px-2 text-gray-600">{c.email}</td>
            <td className="py-1 px-2 text-gray-600">{c.source}</td>
            <td className="py-1 px-2 text-gray-900">{c.mrr != null ? `€${c.mrr}` : "—"}</td>
            <td className="py-1 px-2 text-gray-600">{c.enteredAt ? new Date(c.enteredAt).toLocaleDateString("it-IT") : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LeadAnalyticsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const defaultFrom = () => { const d = new Date(); d.setDate(1); return formatDateInput(d); };
  const defaultTo = () => { const d = new Date(); return formatDateInput(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };

  const [funnelFrom, setFunnelFrom] = useState(defaultFrom);
  const [funnelTo, setFunnelTo] = useState(defaultTo);

  const [ownerFrom, setOwnerFrom] = useState(defaultFrom);
  const [ownerTo, setOwnerTo] = useState(defaultTo);
  const [source, setSource] = useState("all");

  const [closeDateFrom, setCloseDateFrom] = useState(defaultFrom);
  const [closeDateTo, setCloseDateTo] = useState(defaultTo);

  const [data, setData] = useState<OwnerPerformanceData | null>(null);
  const [cohortData, setCohortData] = useState<LeadCohortFunnelAnalyticsData | null>(null);
  const [isLoadingFunnel, setIsLoadingFunnel] = useState(false);
  const [isLoadingOwner, setIsLoadingOwner] = useState(false);
  const [isLoadingTrials, setIsLoadingTrials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<{
    ownerName: string;
    category: DrilldownCategory;
    contacts: { id: string; name: string; email?: string; source?: string; mrr?: number; createdAt?: string; status?: string; lastActivityAt?: string }[];
  } | null>(null);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("cohort");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  type CohortExpandedPanel =
    | { source: string; key: "created" | "reactivated" | "notTouched" | "qr" | "ft" | "won" }
    | null;
  const [cohortExpanded, setCohortExpanded] = useState<CohortExpandedPanel>(null);

  const canAccess = useMemo(() => user && user.role === "admin", [user]);

  const loadFunnel = async () => {
    try {
      setIsLoadingFunnel(true);
      const res = await apiClient.getLeadCohortAnalytics({ from: funnelFrom, to: funnelTo });
      if (res.success && res.data) setCohortData(res.data);
    } catch {
      // silent
    } finally {
      setIsLoadingFunnel(false);
    }
  };

  const loadOwner = async () => {
    try {
      setIsLoadingOwner(true);
      setError(null);
      setDrilldown(null);
      const res = await apiClient.getOwnerPerformance({ from: ownerFrom, to: ownerTo, source, closeDateFrom, closeDateTo });
      if (res.success && res.data) setData(res.data);
      else setError(res.message || "Errore nel caricamento");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsLoadingOwner(false);
    }
  };

  const loadTrials = async () => {
    try {
      setIsLoadingTrials(true);
      const res = await apiClient.getOwnerPerformance({ from: ownerFrom, to: ownerTo, source, closeDateFrom, closeDateTo });
      if (res.success && res.data) setData(prev => prev ? { ...prev, forecast: res.data!.forecast } : res.data!);
    } catch {
      // silent
    } finally {
      setIsLoadingTrials(false);
    }
  };

  const loadAll = async () => {
    try {
      setIsLoadingFunnel(true);
      setIsLoadingOwner(true);
      setIsLoadingTrials(true);
      setError(null);
      const [ownerRes, cohortRes] = await Promise.all([
        apiClient.getOwnerPerformance({ from: ownerFrom, to: ownerTo, source, closeDateFrom, closeDateTo }),
        apiClient.getLeadCohortAnalytics({ from: funnelFrom, to: funnelTo }),
      ]);
      if (ownerRes.success && ownerRes.data) setData(ownerRes.data);
      else setError(ownerRes.message || "Errore nel caricamento");
      if (cohortRes.success && cohortRes.data) setCohortData(cohortRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsLoadingFunnel(false);
      setIsLoadingOwner(false);
      setIsLoadingTrials(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && canAccess) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canAccess]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const availableOwners = useMemo(() => {
    if (!data) return [];
    return data.owners.map(o => ({ id: o.ownerId, name: o.ownerName }));
  }, [data]);

  const filteredOwners = useMemo(() => {
    if (!data) return [];
    if (selectedOwners.length === 0) return data.owners;
    return data.owners.filter(o => selectedOwners.includes(o.ownerId));
  }, [data, selectedOwners]);

  const sorted = useMemo(() => {
    const rows = [...filteredOwners];
    rows.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return rows;
  }, [filteredOwners, sortKey, sortDir]);

  const team = useMemo((): OwnerPerformanceRow | null => {
    if (filteredOwners.length === 0) return null;
    const o = filteredOwners;
    const cohort = o.reduce((s, r) => s + r.cohort, 0);
    const notTouched = o.reduce((s, r) => s + r.notTouched, 0);
    const qrCodeSent = o.reduce((s, r) => s + r.qrCodeSent, 0);
    const freeTrialStarted = o.reduce((s, r) => s + r.freeTrialStarted, 0);
    const won = o.reduce((s, r) => s + r.won, 0);
    const lostBFT = o.reduce((s, r) => s + r.lostBFT, 0);
    const lostAFT = o.reduce((s, r) => s + r.lostAFT, 0);
    const stalled = o.reduce((s, r) => s + r.stalled, 0);
    const mrrWon = o.reduce((s, r) => s + r.mrrWon, 0);

    const fts = o.filter((r) => r.avgFirstTouchDays !== null);
    const avgFirstTouchDays = fts.length > 0 ? +(fts.reduce((s, r) => s + r.avgFirstTouchDays!, 0) / fts.length).toFixed(1) : null;
    const scs = o.filter((r) => r.avgSalesCycleDays !== null);
    const avgSalesCycleDays = scs.length > 0 ? +(scs.reduce((s, r) => s + r.avgSalesCycleDays!, 0) / scs.length).toFixed(1) : null;

    return {
      ownerId: "team",
      ownerName: "Team",
      cohort,
      notTouched,
      pctNotTouched: cohort > 0 ? Math.round((notTouched / cohort) * 100) : 0,
      avgFirstTouchDays,
      qrCodeSent,
      convToQR: cohort > 0 ? Math.round((qrCodeSent / cohort) * 100) : 0,
      freeTrialStarted,
      convQRtoFT: qrCodeSent > 0 ? Math.round((freeTrialStarted / qrCodeSent) * 100) : 0,
      won,
      convFTtoWon: freeTrialStarted > 0 ? Math.round((won / freeTrialStarted) * 100) : 0,
      lostBFT,
      lostAFT,
      stalled,
      mrrWon,
      avgSalesCycleDays,
      trends: { pctNotTouched: null, convToQR: null, convFTtoWon: null },
      bySource: {},
      notTouchedContacts: o.flatMap(r => r.notTouchedContacts),
      qrContacts: o.flatMap(r => r.qrContacts),
      ftContacts: o.flatMap(r => r.ftContacts),
      wonContacts: o.flatMap(r => r.wonContacts),
      stalledContacts: o.flatMap(r => r.stalledContacts),
      lostBFTContacts: o.flatMap(r => r.lostBFTContacts),
      lostAFTContacts: o.flatMap(r => r.lostAFTContacts),
    };
  }, [filteredOwners]);

  const visibleCols = useMemo(() => {
    if (filteredOwners.length === 0) return { won: true, convFTtoWon: true, lostBFT: true, lostAFT: true, stalled: true, mrrWon: true, avgSalesCycleDays: true };
    return {
      won: true,
      convFTtoWon: true,
      lostBFT: filteredOwners.some((r) => r.lostBFT > 0),
      lostAFT: filteredOwners.some((r) => r.lostAFT > 0),
      stalled: filteredOwners.some((r) => r.stalled > 0),
      mrrWon: filteredOwners.some((r) => r.mrrWon > 0),
      avgSalesCycleDays: filteredOwners.some((r) => r.avgSalesCycleDays !== null),
    };
  }, [filteredOwners]);

  const funnelColCount = useMemo(() => {
    const v = visibleCols;
    return 2 + (v.won ? 1 : 0) + 2 + (v.convFTtoWon ? 1 : 0);
  }, [visibleCols]);

  const closureColCount = useMemo(() => {
    const v = visibleCols;
    return (v.lostBFT ? 1 : 0) + (v.lostAFT ? 1 : 0) + (v.stalled ? 1 : 0);
  }, [visibleCols]);

  const revenueColCount = useMemo(() => {
    const v = visibleCols;
    return (v.mrrWon ? 1 : 0) + (v.avgSalesCycleDays ? 1 : 0);
  }, [visibleCols]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert className="max-w-md bg-white"><AlertTitle>Autenticazione richiesta</AlertTitle><AlertDescription>Effettua il login.</AlertDescription></Alert>
      </div>
    );
  }
  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert className="max-w-md bg-white"><AlertTitle>Accesso non autorizzato</AlertTitle><AlertDescription>Solo admin possono visualizzare questa pagina.</AlertDescription></Alert>
      </div>
    );
  }

  const SortHeader = ({ label, k, className = "", tip }: { label: string; k: SortKey; className?: string; tip?: string }) => (
    <th
      className={`px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none ${className}`}
      onClick={() => handleSort(k)}
    >
      {tip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-0.5 border-b border-dotted border-gray-400">
              {label}
              {sortKey === k && <span className="text-blue-600">{sortDir === "asc" ? "↑" : "↓"}</span>}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] whitespace-normal text-xs">
            {tip}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="inline-flex items-center gap-0.5">
          {label}
          {sortKey === k && <span className="text-blue-600">{sortDir === "asc" ? "↑" : "↓"}</span>}
        </span>
      )}
    </th>
  );

  const openDrilldown = (r: OwnerPerformanceRow, category: DrilldownCategory) => {
    const contactMap: Record<DrilldownCategory, () => typeof drilldown extends null ? never : NonNullable<typeof drilldown>["contacts"]> = {
      notTouched: () => r.notTouchedContacts.map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source, createdAt: c.createdAt })),
      qrCodeSent: () => r.qrContacts.map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source })),
      freeTrialStarted: () => r.ftContacts.map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source })),
      won: () => r.wonContacts.map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source, mrr: c.mrr })),
      lostBFT: () => r.lostBFTContacts.map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source })),
      lostAFT: () => r.lostAFTContacts.map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source })),
      stalled: () => r.stalledContacts.map(c => ({ id: String(c.id || (c as any)._id), name: c.name, email: c.email, source: c.source, status: c.status, lastActivityAt: c.lastActivityAt })),
    };
    setDrilldown({ ownerName: r.ownerName, category, contacts: contactMap[category]() });
  };

  const ClickableCell = ({ value, row, category, className = "" }: { value: number; row: OwnerPerformanceRow; category: DrilldownCategory; className?: string }) => (
    value > 0 ? (
      <button
        onClick={(e) => { e.stopPropagation(); openDrilldown(row, category); }}
        className={`hover:underline hover:text-blue-600 cursor-pointer ${className}`}
      >
        {value}
      </button>
    ) : <span className={className}>{value}</span>
  );

  const renderOwnerRow = (r: OwnerPerformanceRow, isTeam = false) => {
    const rowClass = isTeam
      ? "bg-blue-50/70 font-semibold border-t-2 border-blue-300"
      : "border-b hover:bg-gray-50/50 transition-colors";

    const semNT = semaphore(r.pctNotTouched, { green: [0, 24], yellow: [25, 50] });
    const semConvQR = semaphore(r.convToQR, { green: [26, 100], yellow: [10, 25] });
    const semConvFTW = semaphore(r.convFTtoWon, { green: [61, 100], yellow: [30, 60] });
    const semFT = r.avgFirstTouchDays !== null
      ? semaphore(r.avgFirstTouchDays, { green: [0, 0.99], yellow: [1, 3] })
      : "green" as SemaphoreLevel;
    const semStall = semaphore(r.stalled, { green: [0, 1], yellow: [2, 5] });

    return (
      <tr key={r.ownerId} className={rowClass}>
        <td className={`px-3 py-2.5 text-sm whitespace-nowrap ${isTeam ? "text-blue-900" : "text-gray-900"}`}>
          {isTeam ? <span className="uppercase text-xs tracking-wide">Totale Team</span> : r.ownerName}
        </td>
        {/* Reattività */}
        <td className="px-3 py-2.5 text-sm text-right">{r.cohort}</td>
        <td className="px-3 py-2.5 text-sm text-right">
          <ClickableCell value={r.notTouched} row={r} category="notTouched" />
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center justify-end gap-1">
            <SemBadge value={r.pctNotTouched} level={semNT} />
            {!isTeam ? <TrendArrow delta={r.trends.pctNotTouched} /> : <span className="w-[42px]" />}
          </div>
        </td>
        <td className="px-3 py-2.5 text-right">
          {r.avgFirstTouchDays !== null ? (
            <SemBadge value={r.avgFirstTouchDays} level={semFT} suffix="gg" />
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </td>
        {/* Funnel — numeri */}
        <td className="px-3 py-2.5 text-sm text-right">
          <ClickableCell value={r.qrCodeSent} row={r} category="qrCodeSent" />
        </td>
        <td className="px-3 py-2.5 text-sm text-right">
          <ClickableCell value={r.freeTrialStarted} row={r} category="freeTrialStarted" />
        </td>
        {visibleCols.won && (
          <td className="px-3 py-2.5 text-sm text-right font-medium">
            <ClickableCell value={r.won} row={r} category="won" />
          </td>
        )}
        {/* Funnel — conversioni */}
        <td className="px-3 py-2.5">
          <div className="flex items-center justify-end gap-1">
            <SemBadge value={r.convToQR} level={semConvQR} />
            {!isTeam ? <TrendArrow delta={r.trends.convToQR} /> : <span className="w-[42px]" />}
          </div>
        </td>
        <td className="px-3 py-2.5 text-right">
          <span className="text-xs font-medium text-gray-700">{r.convQRtoFT}%</span>
        </td>
        {visibleCols.convFTtoWon && (
          <td className="px-3 py-2.5">
            <div className="flex items-center justify-end gap-1">
              <SemBadge value={r.convFTtoWon} level={semConvFTW} />
              {!isTeam ? <TrendArrow delta={r.trends.convFTtoWon} /> : <span className="w-[42px]" />}
            </div>
          </td>
        )}
        {/* Chiusura & Perdita */}
        {visibleCols.lostBFT && (
          <td className="px-3 py-2.5 text-sm text-right text-gray-500">
            <ClickableCell value={r.lostBFT} row={r} category="lostBFT" />
          </td>
        )}
        {visibleCols.lostAFT && (
          <td className="px-3 py-2.5 text-sm text-right text-gray-500">
            <ClickableCell value={r.lostAFT} row={r} category="lostAFT" />
          </td>
        )}
        {visibleCols.stalled && (
          <td className="px-3 py-2.5 text-right">
            <button
              onClick={(e) => { e.stopPropagation(); if (r.stalled > 0) openDrilldown(r, "stalled"); }}
              className={r.stalled > 0 ? "cursor-pointer" : ""}
            >
              <SemBadge value={r.stalled} level={semStall} suffix="" />
            </button>
          </td>
        )}
        {/* Revenue */}
        {visibleCols.mrrWon && (
          <td className="px-3 py-2.5 text-sm text-right font-medium text-emerald-700">
            {r.mrrWon > 0 ? formatEur(r.mrrWon) : "—"}
          </td>
        )}
        {visibleCols.avgSalesCycleDays && (
          <td className="px-3 py-2.5 text-sm text-right text-gray-600">
            {r.avgSalesCycleDays !== null ? `${r.avgSalesCycleDays}gg` : "—"}
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      <main className="pl-16">
        <div className="container mx-auto py-6 px-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Analytics Lead
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Funnel per sorgente e performance owner — confronto stage-by-stage.
            </p>
          </div>

          {/* I filtri sono ora inline dentro ogni sezione */}

          {error && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* KPI cards spostate dentro Comparativa Owner */}

          {/* ===== Funnel per Sorgente ===== */}
          <Card className="shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="px-5 py-3.5 bg-indigo-50 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Funnel per Sorgente
              </h3>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); loadFunnel(); }}
              className="flex flex-wrap items-center gap-3 px-5 py-3 bg-indigo-50/40 border-b"
            >
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data creazione</span>
              <input type="date" className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" value={funnelFrom} onChange={(e) => setFunnelFrom(e.target.value)} />
              <span className="text-xs text-gray-400">–</span>
              <input type="date" className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" value={funnelTo} onChange={(e) => setFunnelTo(e.target.value)} />
              <Button type="submit" size="sm" disabled={isLoadingFunnel} className="h-8 text-xs">
                {isLoadingFunnel && <Loader2 className="h-3 w-3 animate-spin" />}
                Applica
              </Button>
            </form>
          {cohortData && (
            <>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50/80">
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Sorgente</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Creati</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Riattivati</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Coorte</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Not&nbsp;Touched</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">QR&nbsp;Inviato</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Free&nbsp;Trial</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Won</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(cohortData.sources).map(([srcKey, src]) => {
                        const sourceLabel = srcKey === "smartlead_outbound" ? "Smartlead Outbound" : srcKey === "inbound_rank_checker" ? "Rank Checker Inbound" : srcKey;
                        const toggleKey = (source: string, key: CohortExpandedPanel extends null ? never : Exclude<CohortExpandedPanel, null>["key"]) => {
                          setCohortExpanded((prev) =>
                            prev && prev.source === source && prev.key === key ? null : { source, key }
                          );
                        };
                        const isExp = (key: Exclude<CohortExpandedPanel, null>["key"]) => cohortExpanded?.source === srcKey && cohortExpanded?.key === key;
                        return (
                          <React.Fragment key={srcKey}>
                            <tr className="border-b hover:bg-gray-50/60">
                              <td className="px-4 py-2.5 font-medium text-gray-900">{sourceLabel}</td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-indigo-600 hover:text-indigo-800" onClick={() => toggleKey(srcKey, "created")}>{src.cohort.created.count}</button>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-indigo-600 hover:text-indigo-800" onClick={() => toggleKey(srcKey, "reactivated")}>{src.cohort.reactivated.count}</button>
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold">{src.cohort.total.count}</td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-amber-600 hover:text-amber-800" onClick={() => toggleKey(srcKey, "notTouched")}>{src.steps.notTouched.count}</button>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-purple-600 hover:text-purple-800" onClick={() => toggleKey(srcKey, "qr")}>{src.steps.qrCodeSent.count}</button>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-blue-600 hover:text-blue-800" onClick={() => toggleKey(srcKey, "ft")}>{src.steps.freeTrialStarted.count}</button>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-emerald-600 hover:text-emerald-800" onClick={() => toggleKey(srcKey, "won")}>{src.steps.won.count}</button>
                              </td>
                            </tr>
                            {isExp("created") && (
                              <tr>
                                <td colSpan={8} className="bg-indigo-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-indigo-700 mb-2">Lead creati — {sourceLabel}</p>
                                  {src.cohort.created.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <CohortContactTable contacts={src.cohort.created.contacts} dateLabel="Creato il" dateKey="cohortStartAt" />
                                  )}
                                </td>
                              </tr>
                            )}
                            {isExp("reactivated") && (
                              <tr>
                                <td colSpan={8} className="bg-indigo-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-indigo-700 mb-2">Lead riattivati — {sourceLabel}</p>
                                  {src.cohort.reactivated.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <CohortContactTable contacts={src.cohort.reactivated.contacts} dateLabel="Riattivato il" dateKey="cohortStartAt" />
                                  )}
                                </td>
                              </tr>
                            )}
                            {isExp("notTouched") && (
                              <tr>
                                <td colSpan={8} className="bg-amber-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-amber-700 mb-2">Not touched — {sourceLabel}</p>
                                  {src.steps.notTouched.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <FunnelContactTable contacts={src.steps.notTouched.contacts} />
                                  )}
                                </td>
                              </tr>
                            )}
                            {isExp("qr") && (
                              <tr>
                                <td colSpan={8} className="bg-purple-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-purple-700 mb-2">QR code inviato — {sourceLabel}</p>
                                  {src.steps.qrCodeSent.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <FunnelContactTable contacts={src.steps.qrCodeSent.contacts} />
                                  )}
                                </td>
                              </tr>
                            )}
                            {isExp("ft") && (
                              <tr>
                                <td colSpan={8} className="bg-blue-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-blue-700 mb-2">Free trial iniziato — {sourceLabel}</p>
                                  {src.steps.freeTrialStarted.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <FunnelContactTable contacts={src.steps.freeTrialStarted.contacts} />
                                  )}
                                </td>
                              </tr>
                            )}
                            {isExp("won") && (
                              <tr>
                                <td colSpan={8} className="bg-emerald-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-emerald-700 mb-2">Won — {sourceLabel}</p>
                                  {src.steps.won.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <FunnelContactTable contacts={src.steps.won.contacts} />
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {/* Riga totale */}
                      {(() => {
                        const srcs = Object.values(cohortData.sources);
                        const totCreated = srcs.reduce((s, v) => s + v.cohort.created.count, 0);
                        const totReact = srcs.reduce((s, v) => s + v.cohort.reactivated.count, 0);
                        const totCohort = srcs.reduce((s, v) => s + v.cohort.total.count, 0);
                        const totNT = srcs.reduce((s, v) => s + v.steps.notTouched.count, 0);
                        const totQR = srcs.reduce((s, v) => s + v.steps.qrCodeSent.count, 0);
                        const totFT = srcs.reduce((s, v) => s + v.steps.freeTrialStarted.count, 0);
                        const totWon = srcs.reduce((s, v) => s + v.steps.won.count, 0);
                        return (
                          <tr className="border-t-2 bg-indigo-50/60 font-semibold">
                            <td className="px-4 py-2.5 text-gray-900">Totale</td>
                            <td className="px-4 py-2.5 text-right">{totCreated}</td>
                            <td className="px-4 py-2.5 text-right">{totReact}</td>
                            <td className="px-4 py-2.5 text-right">{totCohort}</td>
                            <td className="px-4 py-2.5 text-right">{totNT}</td>
                            <td className="px-4 py-2.5 text-right">{totQR}</td>
                            <td className="px-4 py-2.5 text-right">{totFT}</td>
                            <td className="px-4 py-2.5 text-right">{totWon}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </>
          )}
          </Card>

          {/* ===== Prove Attive ===== */}
          {data?.forecast && (() => {
            const fc = data.forecast;
            const statusLabel = (s: string) => s === "qr code inviato" ? "QR inviato" : s === "free trial iniziato" ? "Free Trial" : s;
            return (
              <Card className="overflow-hidden border-t-4 border-t-violet-500">
                <div className="px-5 py-3.5 bg-violet-50 border-b flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-violet-800 flex items-center gap-1.5">
                    <Target className="h-4 w-4" />
                    Prove attive
                  </h3>
                  <span className="text-xs text-violet-600">
                    Conv. stimata {Math.round(fc.totals.conversionRate * 100)}%
                  </span>
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); loadTrials(); }}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 bg-violet-50/40 border-b"
                >
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data chiusura prevista</span>
                  <input type="date" className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" value={closeDateFrom} onChange={(e) => setCloseDateFrom(e.target.value)} />
                  <span className="text-xs text-gray-400">–</span>
                  <input type="date" className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" value={closeDateTo} onChange={(e) => setCloseDateTo(e.target.value)} />
                  <Button type="submit" size="sm" disabled={isLoadingTrials} className="h-8 text-xs bg-violet-600 hover:bg-violet-700">
                    {isLoadingTrials && <Loader2 className="h-3 w-3 animate-spin" />}
                    Applica
                  </Button>
                </form>
                <CardContent className="pt-4 space-y-4">
                  {fc.totals.deals === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Nessuna prova attiva con close date nel periodo selezionato.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-500 uppercase">Prove attive</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{fc.totals.deals}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-500 uppercase">MRR potenziale (100%)</p>
                          <p className="text-2xl font-bold text-gray-500 mt-1">{formatEur(fc.totals.mrrPotential)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-500 uppercase">MRR forecast (50%)</p>
                          <p className="text-2xl font-bold text-violet-700 mt-1">{formatEur(fc.totals.mrrForecast)}</p>
                        </div>
                      </div>

                      {fc.owners.length > 1 && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50/60">
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Owner</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Prove</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">MRR pot.</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">MRR forecast</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fc.owners.map((o) => (
                                <tr key={o.ownerId} className="border-b last:border-0">
                                  <td className="px-3 py-2 font-medium text-gray-900">{o.ownerName}</td>
                                  <td className="px-3 py-2 text-right">{o.deals}</td>
                                  <td className="px-3 py-2 text-right text-gray-500">{formatEur(o.mrrPotential)}</td>
                                  <td className="px-3 py-2 text-right font-medium text-violet-700">{formatEur(o.mrrForecast)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <details className="group">
                        <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                          Dettaglio lead ({fc.contacts.length})
                        </summary>
                        <div className="mt-2 overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="bg-violet-50/50">
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Lead</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Status</th>
                                <th className="px-2 py-1.5 text-right font-medium text-gray-500">MRR</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">QR inviato</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Inizio FT</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Close date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fc.contacts.map((c) => (
                                <tr key={c.id} className="border-b last:border-0">
                                  <td className="px-2 py-1.5">
                                    <Link href={`/?search=${encodeURIComponent(c.name)}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{c.name}</Link>
                                    {c.email && <span className="ml-1 text-gray-400">{c.email}</span>}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${c.status === "free trial iniziato" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                                      {statusLabel(c.status)}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 text-right">{formatEur(c.mrr)}</td>
                                  <td className="px-2 py-1.5 text-gray-500">{c.qrEnteredAt ? new Date(c.qrEnteredAt).toLocaleDateString("it-IT") : "—"}</td>
                                  <td className="px-2 py-1.5 text-gray-500">{c.ftEnteredAt ? new Date(c.ftEnteredAt).toLocaleDateString("it-IT") : "—"}</td>
                                  <td className="px-2 py-1.5 text-gray-500">
                                    {(() => { const d = new Date(c.closeDateAt || (c as any).deadlineAt); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("it-IT"); })()}
                                    {c.isManualCloseDate && <span className="ml-1 text-violet-500 text-[9px]" title="Impostata manualmente">✎</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Main owner table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 bg-blue-50 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-800">Comparativa Owner</h3>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); loadOwner(); }}
              className="flex flex-wrap items-center gap-3 px-5 py-3 bg-blue-50/40 border-b"
            >
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data creazione</span>
              <input type="date" className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={ownerFrom} onChange={(e) => setOwnerFrom(e.target.value)} />
              <span className="text-xs text-gray-400">–</span>
              <input type="date" className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={ownerTo} onChange={(e) => setOwnerTo(e.target.value)} />
              <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="all">Tutte le sorgenti</option>
                <option value="smartlead_outbound">Smartlead Outbound</option>
                <option value="inbound_rank_checker">Rank Checker Inbound</option>
              </select>
              <Button type="submit" size="sm" disabled={isLoadingOwner} className="h-8 text-xs">
                {isLoadingOwner && <Loader2 className="h-3 w-3 animate-spin" />}
                Applica
              </Button>
            </form>
            {availableOwners.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-gray-50/80 border-b">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-1">Owner</span>
                {availableOwners.map(o => {
                  const active = selectedOwners.length === 0 || selectedOwners.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setSelectedOwners(prev => {
                          if (prev.length === 0) return [o.id];
                          if (prev.includes(o.id)) {
                            const next = prev.filter(id => id !== o.id);
                            return next;
                          }
                          return [...prev, o.id];
                        });
                      }}
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        active
                          ? "bg-blue-100 text-blue-800 ring-1 ring-blue-300"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {o.name}
                    </button>
                  );
                })}
                {selectedOwners.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedOwners([])}
                    className="text-xs text-gray-500 hover:text-gray-700 underline ml-1"
                  >
                    Tutti
                  </button>
                )}
              </div>
            )}
          {team && (
            <div className="grid gap-3 grid-cols-2 xl:grid-cols-5 px-5 py-4 border-b">
              <div className="rounded-lg border-l-4 border-l-blue-500 bg-white px-3 py-2.5 shadow-xs">
                <p className="text-[10px] font-medium text-gray-500 uppercase">New lead</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{team.cohort}</p>
              </div>
              <div className="rounded-lg border-l-4 border-l-amber-500 bg-white px-3 py-2.5 shadow-xs">
                <p className="text-[10px] font-medium text-gray-500 uppercase flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Not touched</p>
                <p className="text-xl font-bold text-amber-700 mt-0.5">{team.notTouched} <span className="text-sm font-normal text-gray-500">({team.pctNotTouched}%)</span></p>
              </div>
              <div className="rounded-lg border-l-4 border-l-purple-500 bg-white px-3 py-2.5 shadow-xs">
                <p className="text-[10px] font-medium text-gray-500 uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> Avg 1° tocco</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{team.avgFirstTouchDays !== null ? `${team.avgFirstTouchDays}gg` : "—"}</p>
              </div>
              <div className="rounded-lg border-l-4 border-l-emerald-500 bg-white px-3 py-2.5 shadow-xs">
                <p className="text-[10px] font-medium text-gray-500 uppercase flex items-center gap-1"><DollarSign className="h-3 w-3" /> MRR Won</p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">{team.mrrWon > 0 ? formatEur(team.mrrWon) : "—"}</p>
              </div>
              <div className="rounded-lg border-l-4 border-l-orange-500 bg-white px-3 py-2.5 shadow-xs">
                <p className="text-[10px] font-medium text-gray-500 uppercase flex items-center gap-1"><Pause className="h-3 w-3" /> In stallo</p>
                <p className="text-xl font-bold text-orange-700 mt-0.5">{team.stalled}</p>
              </div>
            </div>
          )}
          {data && (
            <>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead>
                      {/* Group header row */}
                      <tr>
                        <th rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50 border-b-2 border-gray-200" />
                        <th colSpan={4} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-amber-800 bg-amber-50 border-b border-amber-200">
                          Reattività
                        </th>
                        <th colSpan={funnelColCount} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-purple-800 bg-purple-50 border-b border-purple-200">
                          Funnel
                        </th>
                        {closureColCount > 0 && (
                          <th colSpan={closureColCount} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-red-800 bg-red-50 border-b border-red-200">
                            Chiusura &amp; Perdita
                          </th>
                        )}
                        {revenueColCount > 0 && (
                          <th colSpan={revenueColCount} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 border-b border-emerald-200">
                            Revenue
                          </th>
                        )}
                      </tr>
                      {/* Column header row */}
                      <tr className="border-b-2 border-gray-200 bg-gray-50/80">
                        {/* Reattività */}
                        <SortHeader label="Coorte" k="cohort" className="text-right bg-amber-50/40" tip="Lead assegnati (creati + riattivati) nel periodo" />
                        <SortHeader label="Non lavorati" k="notTouched" className="text-right bg-amber-50/40" tip="Lead non ancora lavorati (Smartlead ≤1 activity, Rank Checker 0)" />
                        <SortHeader label="% Non lav." k="pctNotTouched" className="text-right bg-amber-50/40" tip="% lead non lavorati sulla coorte — indice di reattività" />
                        <SortHeader label="1ª chiamata" k="avgFirstTouchDays" className="text-right bg-amber-50/40" tip="Media giorni tra assegnazione e prima chiamata" />
                        {/* Funnel — numeri */}
                        <SortHeader label="QR inv." k="qrCodeSent" className="text-right bg-purple-50/40" tip="Lead passati a QR code inviato" />
                        <SortHeader label="Free Trial" k="freeTrialStarted" className="text-right bg-purple-50/40" tip="Lead passati a Free Trial iniziato" />
                        {visibleCols.won && <SortHeader label="Won" k="won" className="text-right bg-purple-50/40" tip="Lead chiusi come Won" />}
                        {/* Funnel — conversioni */}
                        <SortHeader label="Conv. → QR" k="convToQR" className="text-right bg-purple-50/40" tip="% coorte convertita in QR inviato" />
                        <SortHeader label="Conv. QR→FT" k="convQRtoFT" className="text-right bg-purple-50/40" tip="% QR convertiti in Free Trial" />
                        {visibleCols.convFTtoWon && <SortHeader label="Conv. FT→W" k="convFTtoWon" className="text-right bg-purple-50/40" tip="% Free Trial convertiti in Won" />}
                        {/* Chiusura & Perdita */}
                        {visibleCols.lostBFT && <SortHeader label="Lost pre-FT" k="lostBFT" className="text-right bg-red-50/30" tip="Persi prima del Free Trial" />}
                        {visibleCols.lostAFT && <SortHeader label="Lost post-FT" k="lostAFT" className="text-right bg-red-50/30" tip="Persi dopo il Free Trial" />}
                        {visibleCols.stalled && <SortHeader label="In stallo" k="stalled" className="text-right bg-red-50/30" tip="Lead in QR/FT senza activity da 7+ giorni" />}
                        {/* Revenue */}
                        {visibleCols.mrrWon && <SortHeader label="MRR Won" k="mrrWon" className="text-right bg-emerald-50/40" tip="Somma MRR mensile dei lead Won" />}
                        {visibleCols.avgSalesCycleDays && <SortHeader label="Ciclo vendita" k="avgSalesCycleDays" className="text-right bg-emerald-50/40" tip="Media giorni da QR inviato a Won" />}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((r) => renderOwnerRow(r))}
                      {team && renderOwnerRow(team, true)}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </>
          )}
          </Card>

          {!data && !isLoadingOwner && !error && (
            <div className="py-16 text-center text-gray-500">
              Clicca <span className="font-semibold">Applica</span> per caricare i dati.
            </div>
          )}
        </div>
      </main>

      {drilldown && (
        <OwnerDrilldownSheet
          open={!!drilldown}
          onOpenChange={(v) => { if (!v) setDrilldown(null); }}
          ownerName={drilldown.ownerName}
          category={drilldown.category}
          contacts={drilldown.contacts}
        />
      )}
    </div>
  );
}
