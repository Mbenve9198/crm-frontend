"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import {
  OwnerPerformanceData,
  OwnerPerformanceRow,
  ForecastData,
  LeadCohortFunnelAnalyticsData,
} from "@/types/analytics";
import { OwnerDrilldownSheet, LeadDrilldownSheet, DrilldownCategory, DrilldownContact } from "@/components/ui/owner-drilldown-sheet";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
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
  CalendarRange,
  ChevronDown,
  Check,
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

const ALL_SOURCES = [
  ["smartlead_outbound", "Smartlead Outbound"],
  ["inbound_rank_checker", "Rank Checker Inbound"],
  ["inbound_form", "Form Inbound"],
  ["inbound_api", "API Inbound"],
  ["csv_import", "CSV Import"],
  ["manual", "Manuale"],
  ["referral", "Referral"],
] as const;

function formatRange(from: string, to: string) {
  const fmt = (d: string) => {
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
  };
  if (!from && !to) return "Seleziona";
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `da ${fmt(from)}`;
  return `fino a ${fmt(to)}`;
}

function DateRangePopover({
  label,
  from,
  to,
  onFromChange,
  onToChange,
  color = "blue",
}: {
  label: string;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  color?: string;
}) {
  const ringClass = `focus-visible:ring-${color}-500`;

  const quickRanges: { label: string; getRange: () => [string, string] }[] = [
    {
      label: "Oggi",
      getRange: () => {
        const t = formatDateInput(new Date());
        return [t, t];
      },
    },
    {
      label: "Questa settimana",
      getRange: () => {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1;
        const mon = new Date(now);
        mon.setDate(now.getDate() - diff);
        return [formatDateInput(mon), formatDateInput(now)];
      },
    },
    {
      label: "Questo mese",
      getRange: () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return [formatDateInput(first), formatDateInput(last)];
      },
    },
    {
      label: "Ultimo mese",
      getRange: () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        return [formatDateInput(first), formatDateInput(last)];
      },
    },
    {
      label: "Ultimi 3 mesi",
      getRange: () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return [formatDateInput(first), formatDateInput(last)];
      },
    },
    {
      label: "Di sempre",
      getRange: () => ["2020-01-01", formatDateInput(new Date())],
    },
  ];

  const applyQuick = (getRange: () => [string, string]) => {
    const [f, t] = getRange();
    onFromChange(f);
    onToChange(t);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 h-8 rounded-md border border-gray-200 bg-white px-2.5 text-xs shadow-xs hover:border-${color}-300 hover:bg-${color}-50/30 transition-colors`}
        >
          <CalendarRange className={`h-3.5 w-3.5 text-${color}-500`} />
          <span className="font-medium text-gray-600">{label}:</span>
          <span className={`font-semibold text-${color}-700`}>{formatRange(from, to)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          {quickRanges.map((qr) => (
            <button
              key={qr.label}
              type="button"
              onClick={() => applyQuick(qr.getRange)}
              className="h-7 rounded-full px-2.5 text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
            >
              {qr.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase">Da</label>
            <input type="date" className={`h-8 w-36 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 ${ringClass}`} value={from} onChange={(e) => onFromChange(e.target.value)} />
          </div>
          <span className="text-gray-300 mt-4">–</span>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase">A</label>
            <input type="date" className={`h-8 w-36 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 ${ringClass}`} value={to} onChange={(e) => onToChange(e.target.value)} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SourceMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const label = selected.length === 0
    ? "Tutte le sorgenti"
    : selected.length === 1
      ? (ALL_SOURCES.find(([k]) => k === selected[0])?.[1] ?? selected[0])
      : `${selected.length} sorgenti`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 rounded-md border border-gray-200 bg-white px-2.5 text-xs shadow-xs hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
        >
          <span className="font-medium text-gray-600">Sorgente:</span>
          <span className="font-semibold text-blue-700">{label}</span>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <div className="space-y-0.5">
          {ALL_SOURCES.map(([key, lbl]) => {
            const active = selected.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(active ? selected.filter(s => s !== key) : [...selected, key])}
                className={`w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                  active ? "bg-blue-50 text-blue-800" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                  active ? "bg-blue-600 border-blue-600" : "border-gray-300"
                }`}>
                  {active && <Check className="h-3 w-3 text-white" />}
                </div>
                {lbl}
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full mt-1.5 pt-1.5 border-t text-xs text-gray-500 hover:text-gray-700 text-center"
          >
            Rimuovi filtri
          </button>
        )}
      </PopoverContent>
    </Popover>
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
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const [closeDateFrom, setCloseDateFrom] = useState(defaultFrom);
  const [closeDateTo, setCloseDateTo] = useState(defaultTo);

  const [wonFilterEnabled, setWonFilterEnabled] = useState(false);
  const [wonFrom, setWonFrom] = useState(defaultFrom);
  const [wonTo, setWonTo] = useState(defaultTo);

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
  const [genericDrilldown, setGenericDrilldown] = useState<{
    title: string;
    dotColor: string;
    contacts: DrilldownContact[];
  } | null>(null);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("cohort");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
      const sourceParam = selectedSources.length > 0 ? selectedSources.join(",") : "all";
      const res = await apiClient.getOwnerPerformance({ from: ownerFrom, to: ownerTo, source: sourceParam, closeDateFrom, closeDateTo, ...(wonFilterEnabled ? { wonFrom, wonTo } : {}) });
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
      const sourceParam = selectedSources.length > 0 ? selectedSources.join(",") : "all";
      const res = await apiClient.getOwnerPerformance({ from: ownerFrom, to: ownerTo, source: sourceParam, closeDateFrom, closeDateTo, ...(wonFilterEnabled ? { wonFrom, wonTo } : {}) });
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
        apiClient.getOwnerPerformance({ from: ownerFrom, to: ownerTo, source: selectedSources.length > 0 ? selectedSources.join(",") : "all", closeDateFrom, closeDateTo, ...(wonFilterEnabled ? { wonFrom, wonTo } : {}) }),
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
      cohortContacts: o.flatMap(r => r.cohortContacts || []),
      notTouchedContacts: o.flatMap(r => r.notTouchedContacts || []),
      qrContacts: o.flatMap(r => r.qrContacts || []),
      ftContacts: o.flatMap(r => r.ftContacts || []),
      wonContacts: o.flatMap(r => r.wonContacts || []),
      stalledContacts: o.flatMap(r => r.stalledContacts || []),
      lostBFTContacts: o.flatMap(r => r.lostBFTContacts || []),
      lostAFTContacts: o.flatMap(r => r.lostAFTContacts || []),
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
      cohort: () => (r.cohortContacts || []).map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source })),
      notTouched: () => (r.notTouchedContacts || []).map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source, createdAt: c.createdAt })),
      qrCodeSent: () => (r.qrContacts || []).map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source })),
      freeTrialStarted: () => (r.ftContacts || []).map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source })),
      won: () => (r.wonContacts || []).map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source, mrr: c.mrr })),
      lostBFT: () => (r.lostBFTContacts || []).map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source })),
      lostAFT: () => (r.lostAFTContacts || []).map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source })),
      stalled: () => (r.stalledContacts || []).map(c => ({ id: String(c.id || (c as any)._id), name: c.name, email: c.email, source: c.source, status: c.status, lastActivityAt: c.lastActivityAt })),
      created: () => [],
      reactivated: () => [],
      activeTrial: () => [],
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
        <td className="px-3 py-2.5 text-sm text-right">
          <ClickableCell value={r.cohort} row={r} category="cohort" />
        </td>
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
              className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-indigo-50/40 border-b"
            >
              <DateRangePopover label="Data creazione" from={funnelFrom} to={funnelTo} onFromChange={setFunnelFrom} onToChange={setFunnelTo} color="indigo" />
              <Button type="submit" size="sm" disabled={isLoadingFunnel} className="h-8 text-xs">
                {isLoadingFunnel && <Loader2 className="h-3 w-3 animate-spin" />}
                Applica
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isLoadingFunnel}
                className="h-8 text-xs"
                onClick={() => {
                  const today = formatDateInput(new Date());
                  setFunnelFrom(today);
                  setFunnelTo(today);
                  setTimeout(() => loadFunnel(), 0);
                }}
              >
                Oggi
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
                        const srcLabel = srcKey === "smartlead_outbound" ? "Smartlead Outbound" : srcKey === "inbound_rank_checker" ? "Rank Checker Inbound" : srcKey === "inbound_form" ? "Form Inbound" : srcKey === "inbound_api" ? "API Inbound" : srcKey === "manual" ? "Manuale" : srcKey === "csv_import" ? "CSV Import" : srcKey === "referral" ? "Referral" : srcKey;
                        const openFunnelDrilldown = (label: string, color: string, contacts: { id: string; name: string; email?: string; source?: string; mrr?: number | null }[]) => {
                          setGenericDrilldown({
                            title: `${srcLabel} · ${label}`,
                            dotColor: color,
                            contacts: contacts.map(c => ({ id: c.id, name: c.name, email: c.email, source: c.source, mrr: c.mrr ?? undefined })),
                          });
                        };
                        const CCell = ({ count, label, color, contacts }: { count: number; label: string; color: string; contacts: { id: string; name: string; email?: string; source?: string; mrr?: number | null }[] }) => (
                          count > 0 ? (
                            <button className="hover:underline hover:text-blue-600 cursor-pointer" onClick={() => openFunnelDrilldown(label, color, contacts)}>{count}</button>
                          ) : <span>{count}</span>
                        );
                        return (
                          <tr key={srcKey} className="border-b hover:bg-gray-50/60">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{srcLabel}</td>
                            <td className="px-4 py-2.5 text-right">
                              <CCell count={src.cohort.created.count} label="Creati" color="bg-indigo-500" contacts={src.cohort.created.contacts} />
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <CCell count={src.cohort.reactivated.count} label="Riattivati" color="bg-teal-500" contacts={src.cohort.reactivated.contacts} />
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold">{src.cohort.total.count}</td>
                            <td className="px-4 py-2.5 text-right">
                              <CCell count={src.steps.notTouched.count} label="Non lavorati" color="bg-amber-500" contacts={src.steps.notTouched.contacts} />
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <CCell count={src.steps.qrCodeSent.count} label="QR inviato" color="bg-purple-500" contacts={src.steps.qrCodeSent.contacts} />
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <CCell count={src.steps.freeTrialStarted.count} label="Free Trial" color="bg-blue-500" contacts={src.steps.freeTrialStarted.contacts} />
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <CCell count={src.steps.won.count} label="Won" color="bg-emerald-500" contacts={src.steps.won.contacts} />
                            </td>
                          </tr>
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
                  className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-violet-50/40 border-b"
                >
                  <DateRangePopover label="Data chiusura prevista" from={closeDateFrom} to={closeDateTo} onFromChange={setCloseDateFrom} onToChange={setCloseDateTo} color="violet" />
                  <Button type="submit" size="sm" disabled={isLoadingTrials} className="h-8 text-xs bg-violet-600 hover:bg-violet-700">
                    {isLoadingTrials && <Loader2 className="h-3 w-3 animate-spin" />}
                    Applica
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isLoadingTrials}
                    className="h-8 text-xs"
                    onClick={() => {
                      const today = formatDateInput(new Date());
                      setCloseDateFrom(today);
                      setCloseDateTo(today);
                      setTimeout(() => loadTrials(), 0);
                    }}
                  >
                    Oggi
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
                          <button
                            className="text-2xl font-bold text-gray-900 mt-1 hover:text-violet-700 hover:underline cursor-pointer"
                            onClick={() => setGenericDrilldown({
                              title: `Prove attive (${fc.contacts.length})`,
                              dotColor: "bg-violet-500",
                              contacts: fc.contacts.map(c => ({ id: c.id, name: c.name, email: c.email || undefined, source: c.source, mrr: c.mrr, status: c.status })),
                            })}
                          >
                            {fc.totals.deals}
                          </button>
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
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      className="hover:underline hover:text-violet-600 cursor-pointer"
                                      onClick={() => {
                                        const ownerContacts = fc.contacts.filter(c => c.owner === o.ownerId);
                                        setGenericDrilldown({
                                          title: `${o.ownerName} · Prove attive`,
                                          dotColor: "bg-violet-500",
                                          contacts: ownerContacts.map(c => ({ id: c.id, name: c.name, email: c.email || undefined, source: c.source, mrr: c.mrr, status: c.status })),
                                        });
                                      }}
                                    >
                                      {o.deals}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-500">{formatEur(o.mrrPotential)}</td>
                                  <td className="px-3 py-2 text-right font-medium text-violet-700">{formatEur(o.mrrForecast)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <button
                        className="text-xs font-medium text-violet-600 hover:text-violet-800 hover:underline cursor-pointer"
                        onClick={() => setGenericDrilldown({
                          title: `Prove attive (${fc.contacts.length})`,
                          dotColor: "bg-violet-500",
                          contacts: fc.contacts.map(c => ({ id: c.id, name: c.name, email: c.email || undefined, source: c.source, mrr: c.mrr, status: c.status })),
                        })}
                      >
                        Vedi tutti i lead ({fc.contacts.length}) →
                      </button>
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
              className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-blue-50/40 border-b"
            >
              <DateRangePopover label="Data creazione" from={ownerFrom} to={ownerTo} onFromChange={setOwnerFrom} onToChange={setOwnerTo} color="blue" />

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={wonFilterEnabled}
                    onChange={(e) => setWonFilterEnabled(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Data chiusura (Won)</span>
                </label>
                {wonFilterEnabled && (
                  <DateRangePopover label="Chiusura Won" from={wonFrom} to={wonTo} onFromChange={setWonFrom} onToChange={setWonTo} color="green" />
                )}
              </div>

              <SourceMultiSelect selected={selectedSources} onChange={setSelectedSources} />

              <Button type="submit" size="sm" disabled={isLoadingOwner} className="h-8 text-xs">
                {isLoadingOwner && <Loader2 className="h-3 w-3 animate-spin" />}
                Applica
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isLoadingOwner}
                className="h-8 text-xs"
                onClick={() => {
                  const today = formatDateInput(new Date());
                  setOwnerFrom(today);
                  setOwnerTo(today);
                  setWonFrom(today);
                  setWonTo(today);
                  setTimeout(() => loadOwner(), 0);
                }}
              >
                Oggi
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
                      {team && team.cohort > 0 && (
                        <tr className="bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-t-2 border-emerald-300">
                          <td colSpan={100} className="px-4 py-3">
                            <div className="flex items-center gap-6 text-sm">
                              <span className="font-semibold text-emerald-800 uppercase text-xs tracking-wide">Conversion Rate Lead → Won</span>
                              <span className="text-emerald-700 font-bold text-lg">
                                {(team.cohort > 0 ? (team.won / team.cohort * 100) : 0).toFixed(1)}%
                              </span>
                              <span className="text-gray-500 text-xs">
                                ({team.won} won su {team.cohort} lead)
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
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

      {genericDrilldown && (
        <LeadDrilldownSheet
          open={!!genericDrilldown}
          onOpenChange={(v) => { if (!v) setGenericDrilldown(null); }}
          title={genericDrilldown.title}
          dotColor={genericDrilldown.dotColor}
          contacts={genericDrilldown.contacts}
        />
      )}
    </div>
  );
}
