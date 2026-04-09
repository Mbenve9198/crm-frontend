"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Users, DollarSign, RefreshCw, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Cell, PieChart, Pie, Legend,
} from "recharts";
import type {
  SaasOverview, MrrOverviewData, MrrMonthSnapshot,
  PlansData, PlansTrendData,
} from "@/types/saas-metrics";

// ─── Palette ──────────────────────────────────────────────
const COLORS = {
  new: "#2dd4bf",
  reactivation: "#0d9488",
  expansion: "#a7f3d0",
  existing: "#0891b2",
  contraction: "#fb923c",
  voluntaryChurn: "#ef4444",
  delinquentChurn: "#dc2626",
};

const PLAN_COLORS = [
  "#0d9488", "#0891b2", "#2dd4bf", "#6366f1", "#8b5cf6",
  "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#a855f7",
];

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function fmtEur(v: number) {
  return `€${v.toLocaleString("it-IT")}`;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${months[parseInt(mo) - 1]} ${y.slice(2)}`;
}

// ─── KPI Card ─────────────────────────────────────────────
function KpiCard({ title, value, prevValue, format = "eur", sparkData, sparkKey = "mrr", invertColor = false }: {
  title: string; value: number; prevValue: number;
  format?: "eur" | "num"; sparkData?: { month: string; mrr: number; customers: number }[];
  sparkKey?: "mrr" | "customers"; invertColor?: boolean;
}) {
  const pct = pctChange(value, prevValue);
  const isPositive = invertColor ? pct <= 0 : pct >= 0;
  const formatted = format === "eur" ? fmtEur(value) : value.toLocaleString("it-IT");

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-gray-900">{formatted}</span>
          {prevValue !== undefined && pct !== 0 && (
            <span className={`flex items-center text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
              {pct > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(pct)}%
            </span>
          )}
          {pct === 0 && <span className="flex items-center text-xs text-gray-400"><Minus className="w-3 h-3 mr-0.5" />0%</span>}
        </div>
        {sparkData && sparkData.length > 1 && (
          <div className="mt-3 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey={sparkKey} stroke={isPositive ? "#10b981" : "#ef4444"} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── MRR Stacked Chart ───────────────────────────────────
function MrrStackedChart({ data }: { data: MrrMonthSnapshot[] }) {
  const chartData = data.map(d => ({
    month: monthLabel(d.month),
    New: d.newMrr,
    Riattivazioni: d.reactivationMrr,
    Espansione: d.expansionMrr,
    Esistente: d.existingMrr,
    Contrazione: -(d.contractionMrr),
    Churn: -(d.voluntaryChurnMrr + d.delinquentChurnMrr),
    MRR: d.totalMrr,
  }));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={chartData} stackOffset="sign" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
        <Tooltip
          formatter={(v: number, name: string) => [fmtEur(Math.abs(v)), name]}
          labelStyle={{ fontWeight: 600 }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Bar dataKey="New" stackId="a" fill={COLORS.new} radius={[0,0,0,0]} />
        <Bar dataKey="Riattivazioni" stackId="a" fill={COLORS.reactivation} />
        <Bar dataKey="Espansione" stackId="a" fill={COLORS.expansion} />
        <Bar dataKey="Esistente" stackId="a" fill={COLORS.existing} />
        <Bar dataKey="Contrazione" stackId="a" fill={COLORS.contraction} />
        <Bar dataKey="Churn" stackId="a" fill={COLORS.voluntaryChurn} />
        <Line type="monotone" dataKey="MRR" stroke="#0f172a" strokeWidth={2} dot={{ fill: "#0f172a", r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── Breakdown Table ─────────────────────────────────────
function BreakdownTable({ data }: { data: MrrMonthSnapshot[] }) {
  const last6 = data.slice(-6);
  const currentMonth = last6[last6.length - 1]?.month;

  const mrrRows = [
    { label: "New", key: "newMrr" },
    { label: "Riattivazioni", key: "reactivationMrr" },
    { label: "Espansione", key: "expansionMrr" },
    { label: "Contrazione", key: "contractionMrr", negative: true },
    { label: "Voluntary Churn", key: "voluntaryChurnMrr", negative: true },
    { label: "Delinquent Churn", key: "delinquentChurnMrr", negative: true },
    { label: "Esistente", key: "existingMrr" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-semibold text-teal-700 text-xs uppercase">MRR</th>
            {last6.map(d => (
              <th key={d.month} className={`text-right py-2 px-3 text-xs font-semibold uppercase ${d.month === currentMonth ? "bg-teal-50/50 text-teal-800" : "text-gray-500"}`}>
                {monthLabel(d.month)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mrrRows.map(row => (
            <tr key={row.key} className="border-b border-gray-100 hover:bg-gray-50/50">
              <td className="py-2 px-3 text-gray-600 text-xs">{row.label}</td>
              {last6.map(d => {
                const val = (d as Record<string, number>)[row.key] || 0;
                return (
                  <td key={d.month} className={`text-right py-2 px-3 text-xs tabular-nums ${d.month === currentMonth ? "bg-teal-50/50 font-medium" : ""} ${row.negative && val > 0 ? "text-red-500" : ""}`}>
                    {row.negative && val > 0 ? `-${fmtEur(val)}` : val > 0 ? `+${fmtEur(val)}` : fmtEur(0)}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* MRR Total */}
          <tr className="border-b-2 border-gray-200 font-bold">
            <td className="py-2 px-3 text-teal-700 text-xs">MRR</td>
            {last6.map(d => (
              <td key={d.month} className={`text-right py-2 px-3 text-xs tabular-nums ${d.month === currentMonth ? "bg-teal-50/50" : ""}`}>
                {fmtEur(d.totalMrr)}
              </td>
            ))}
          </tr>
          {/* ARR */}
          <tr className="border-b-2 border-gray-200 font-bold">
            <td className="py-2 px-3 text-teal-700 text-xs">ARR</td>
            {last6.map(d => (
              <td key={d.month} className={`text-right py-2 px-3 text-xs tabular-nums ${d.month === currentMonth ? "bg-teal-50/50" : ""}`}>
                {fmtEur(d.totalMrr * 12)}
              </td>
            ))}
          </tr>

          {/* Customers header */}
          <tr className="border-b">
            <td colSpan={last6.length + 1} className="pt-4 pb-2 px-3 font-semibold text-teal-700 text-xs uppercase">Customers</td>
          </tr>
          {[
            { label: "Clienti totali", key: "totalCustomers" },
            { label: "Nuovi clienti", key: "newCustomers" },
            { label: "Riattivati", key: "reactivatedCustomers" },
            { label: "Persi", key: "churnedCustomers", negative: true },
          ].map(row => (
            <tr key={row.key} className="border-b border-gray-100 hover:bg-gray-50/50">
              <td className="py-2 px-3 text-gray-600 text-xs">{row.label}</td>
              {last6.map(d => {
                const val = (d as Record<string, number>)[row.key] || 0;
                return (
                  <td key={d.month} className={`text-right py-2 px-3 text-xs tabular-nums ${d.month === currentMonth ? "bg-teal-50/50" : ""} ${row.negative && val > 0 ? "text-red-500" : ""}`}>
                    {row.key === "totalCustomers" ? val : val > 0 ? (row.negative ? `-${val}` : `+${val}`) : "0"}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Unit Economics header */}
          <tr className="border-b">
            <td colSpan={last6.length + 1} className="pt-4 pb-2 px-3 font-semibold text-teal-700 text-xs uppercase">Unit Economics</td>
          </tr>
          <tr className="border-b border-gray-100 hover:bg-gray-50/50">
            <td className="py-2 px-3 text-gray-600 text-xs">ARPU</td>
            {last6.map(d => (
              <td key={d.month} className={`text-right py-2 px-3 text-xs tabular-nums ${d.month === currentMonth ? "bg-teal-50/50" : ""}`}>
                {d.totalCustomers > 0 ? fmtEur(Math.round(d.totalMrr / d.totalCustomers)) : "–"}
              </td>
            ))}
          </tr>
          <tr className="border-b border-gray-100 hover:bg-gray-50/50">
            <td className="py-2 px-3 text-gray-600 text-xs">Lifetime Value</td>
            {last6.map(d => {
              const churnRate = d.totalCustomers > 0 ? d.churnedCustomers / d.totalCustomers : 0;
              const arpu = d.totalCustomers > 0 ? d.totalMrr / d.totalCustomers : 0;
              const ltv = churnRate > 0 ? Math.round(arpu / churnRate) : arpu > 0 ? "∞" : "–";
              return (
                <td key={d.month} className={`text-right py-2 px-3 text-xs tabular-nums ${d.month === currentMonth ? "bg-teal-50/50" : ""}`}>
                  {typeof ltv === "number" ? fmtEur(ltv) : ltv}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Plans Donut ─────────────────────────────────────────
function PlansDonut({ plans, totalMrr }: { plans: PlansData["plans"]; totalMrr: number }) {
  const chartData = plans.map((p, i) => ({
    name: p.planName,
    value: p.mrr,
    fill: PLAN_COLORS[i % PLAN_COLORS.length],
  }));

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <div className="w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
              {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Pie>
            <Tooltip formatter={(v: number) => fmtEur(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2">
        {plans.map((p, i) => (
          <div key={p.planName} className="rounded-lg px-4 py-3 text-white min-w-[140px]" style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }}>
            <div className="text-lg font-bold">{p.percentage}%</div>
            <div className="text-xs opacity-90">{p.planName}</div>
            <div className="text-xs opacity-75 mt-0.5">{fmtEur(p.mrr)} · {p.customers} clienti</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Plans Trend Chart ───────────────────────────────────
function PlansTrendChart({ trend }: { trend: PlansTrendData }) {
  const chartData = trend.months.map(month => {
    const point: Record<string, string | number> = { month: monthLabel(month) };
    for (const s of trend.series) {
      const dp = s.data.find(d => d.month === month);
      point[s.planName] = dp?.mrr || 0;
    }
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
        <Tooltip
          formatter={(v: number, name: string) => [fmtEur(v), name]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {trend.series.map((s, i) => (
          <Line key={s.planName} type="monotone" dataKey={s.planName} stroke={PLAN_COLORS[i % PLAN_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Formula Bar ─────────────────────────────────────────
function FormulaBar({ snapshot }: { snapshot: MrrMonthSnapshot | undefined }) {
  if (!snapshot) return null;
  const items = [
    { label: "MRR", value: snapshot.totalMrr, color: "#0f172a", bold: true },
    { label: "New", value: snapshot.newMrr, color: COLORS.new },
    { label: "Riattivazioni", value: snapshot.reactivationMrr, color: COLORS.reactivation },
    { label: "Espansione", value: snapshot.expansionMrr, color: COLORS.expansion },
    { label: "Esistente", value: snapshot.existingMrr, color: COLORS.existing },
    { label: "Contrazione", value: snapshot.contractionMrr, color: COLORS.contraction },
    { label: "Churn", value: snapshot.voluntaryChurnMrr + snapshot.delinquentChurnMrr, color: COLORS.voluntaryChurn },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i === 1 && <span className="text-gray-400">=</span>}
          {i > 1 && i < 5 && <span className="text-gray-400">+</span>}
          {i >= 5 && <span className="text-gray-400">−</span>}
          <div className="flex flex-col items-center">
            <span className={`font-bold tabular-nums ${item.bold ? "text-base" : ""}`} style={{ color: item.color }}>
              {fmtEur(item.value)}
            </span>
            <span className="text-gray-500 mt-0.5">{item.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── MAIN PAGE ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

export default function SaasMetricsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [overview, setOverview] = useState<SaasOverview | null>(null);
  const [mrrData, setMrrData] = useState<MrrOverviewData | null>(null);
  const [plansData, setPlansData] = useState<PlansData | null>(null);
  const [plansTrend, setPlansTrend] = useState<PlansTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);

  const canAccess = useMemo(() => user?.role === "admin", [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ovRes, mrrRes, plRes, ptRes] = await Promise.all([
        apiClient.getSaasOverview(),
        apiClient.getMrrOverview(12),
        apiClient.getSaasPlans(),
        apiClient.getSaasPlansTrend(12),
      ]);
      if (ovRes.success && ovRes.data) setOverview(ovRes.data);
      if (mrrRes.success && mrrRes.data) setMrrData(mrrRes.data);
      if (plRes.success && plRes.data) setPlansData(plRes.data);
      if (ptRes.success && ptRes.data) setPlansTrend(ptRes.data);
    } catch (e) {
      console.error("SaaS metrics load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && canAccess) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canAccess]);

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      await apiClient.backfillSnapshots();
      // Wait a bit for backfill to start, then reload
      setTimeout(() => loadAll(), 3000);
    } catch (e) {
      console.error("Backfill error:", e);
    } finally {
      setBackfilling(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!isAuthenticated || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Accesso riservato agli amministratori.</p>
      </div>
    );
  }

  const latestSnap = mrrData?.months[mrrData.months.length - 1];
  const hasData = mrrData && mrrData.months.length > 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <ModernSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SaaS Metrics</h1>
              <p className="text-sm text-gray-500 mt-0.5">Metriche in tempo reale da Stripe</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => loadAll()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Aggiorna
              </Button>
              <Button variant="outline" size="sm" onClick={handleBackfill} disabled={backfilling}>
                {backfilling ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-1.5" />}
                Backfill storico
              </Button>
            </div>
          </div>

          {loading && !overview ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : !hasData && !overview ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-700 mb-2">Nessun dato disponibile</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Clicca &quot;Backfill storico&quot; per ricostruire gli snapshot MRR dalle fatture Stripe.
                </p>
                <Button onClick={handleBackfill} disabled={backfilling}>
                  {backfilling ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                  Avvia Backfill
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ── Vista 1: Dashboard Overview KPIs ── */}
              {overview && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <KpiCard title="Current MRR" value={overview.currentMrr} prevValue={overview.prevMrr} sparkData={overview.sparkline} sparkKey="mrr" />
                  <KpiCard title="Clienti" value={overview.currentCustomers} prevValue={overview.prevCustomers} format="num" sparkData={overview.sparkline} sparkKey="customers" />
                  <KpiCard title="Trial attivi" value={overview.trials} prevValue={overview.prevTrials} format="num" />
                  <KpiCard title="Crescita mese" value={overview.growth} prevValue={overview.prevGrowth} />
                  <KpiCard title="New MRR" value={overview.newMrr} prevValue={overview.prevNewMrr} />
                  <KpiCard title="Churn MRR" value={overview.churnMrr} prevValue={overview.prevChurnMrr} invertColor />
                </div>
              )}

              {/* ── Vista 2: MRR Overview ── */}
              {mrrData && mrrData.months.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">MRR Overview</CardTitle>
                      <span className="text-xs text-gray-400 uppercase font-medium">Ultimi 12 mesi</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormulaBar snapshot={latestSnap} />
                    <MrrStackedChart data={mrrData.months} />
                  </CardContent>
                </Card>
              )}

              {/* Breakdown Table */}
              {mrrData && mrrData.months.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BreakdownTable data={mrrData.months} />
                  </CardContent>
                </Card>
              )}

              {/* ── Vista 3: Compare by Plan ── */}
              {plansData && plansData.plans.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Confronto per Piano</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Plan pills */}
                    <div className="flex flex-wrap gap-2">
                      {plansData.plans.map((p, i) => (
                        <span key={p.planName} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }}>
                          {p.planName}
                        </span>
                      ))}
                    </div>

                    {/* Donut */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Distribuzione MRR per Piano</h4>
                      <PlansDonut plans={plansData.plans} totalMrr={plansData.totalMrr} />
                    </div>

                    {/* Trend */}
                    {plansTrend && plansTrend.series.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">MRR per Piano nel tempo</h4>
                        <PlansTrendChart trend={plansTrend} />
                      </div>
                    )}

                    {/* Summary table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Piano</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Clienti</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">MRR</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">% MRR</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ARPU</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plansData.plans.map((p, i) => (
                            <tr key={p.planName} className="border-b border-gray-100 hover:bg-gray-50/50">
                              <td className="py-2 px-3 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }} />
                                <span className="text-xs font-medium">{p.planName}</span>
                              </td>
                              <td className="text-right py-2 px-3 text-xs tabular-nums">{p.customers}</td>
                              <td className="text-right py-2 px-3 text-xs tabular-nums font-medium">{fmtEur(p.mrr)}</td>
                              <td className="text-right py-2 px-3 text-xs tabular-nums">{p.percentage}%</td>
                              <td className="text-right py-2 px-3 text-xs tabular-nums">{p.customers > 0 ? fmtEur(Math.round(p.mrr / p.customers)) : "–"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
