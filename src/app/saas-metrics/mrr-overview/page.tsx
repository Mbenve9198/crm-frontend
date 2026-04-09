"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart,
} from "recharts";
import { COLORS, fmtEur, monthLabel } from "@/components/ui/saas-metrics-shared";
import type { MrrOverviewData, MrrMonthSnapshot } from "@/types/saas-metrics";

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

// ─── Stacked Chart ───────────────────────────────────────
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
          formatter={(v, name) => [fmtEur(Math.abs(Number(v))), String(name)]}
          labelStyle={{ fontWeight: 600 }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Bar dataKey="New" stackId="a" fill={COLORS.new} />
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

  const mrrRows: { label: string; key: string; negative?: boolean }[] = [
    { label: "New", key: "newMrr" },
    { label: "Riattivazioni", key: "reactivationMrr" },
    { label: "Espansione", key: "expansionMrr" },
    { label: "Contrazione", key: "contractionMrr", negative: true },
    { label: "Voluntary Churn", key: "voluntaryChurnMrr", negative: true },
    { label: "Delinquent Churn", key: "delinquentChurnMrr", negative: true },
    { label: "Esistente", key: "existingMrr" },
  ];

  const custRows: { label: string; key: string; negative?: boolean }[] = [
    { label: "Clienti totali", key: "totalCustomers" },
    { label: "Nuovi clienti", key: "newCustomers" },
    { label: "Riattivati", key: "reactivatedCustomers" },
    { label: "Persi", key: "churnedCustomers", negative: true },
  ];

  const getVal = (d: MrrMonthSnapshot, key: string) => (d as unknown as Record<string, number>)[key] || 0;

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
                const val = getVal(d, row.key);
                return (
                  <td key={d.month} className={`text-right py-2 px-3 text-xs tabular-nums ${d.month === currentMonth ? "bg-teal-50/50 font-medium" : ""} ${row.negative && val > 0 ? "text-red-500" : ""}`}>
                    {row.negative && val > 0 ? `-${fmtEur(val)}` : val > 0 ? `+${fmtEur(val)}` : fmtEur(0)}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-b-2 border-gray-200 font-bold">
            <td className="py-2 px-3 text-teal-700 text-xs">MRR</td>
            {last6.map(d => (
              <td key={d.month} className={`text-right py-2 px-3 text-xs tabular-nums ${d.month === currentMonth ? "bg-teal-50/50" : ""}`}>{fmtEur(d.totalMrr)}</td>
            ))}
          </tr>
          <tr className="border-b-2 border-gray-200 font-bold">
            <td className="py-2 px-3 text-teal-700 text-xs">ARR</td>
            {last6.map(d => (
              <td key={d.month} className={`text-right py-2 px-3 text-xs tabular-nums ${d.month === currentMonth ? "bg-teal-50/50" : ""}`}>{fmtEur(d.totalMrr * 12)}</td>
            ))}
          </tr>

          <tr className="border-b">
            <td colSpan={last6.length + 1} className="pt-4 pb-2 px-3 font-semibold text-teal-700 text-xs uppercase">Customers</td>
          </tr>
          {custRows.map(row => (
            <tr key={row.key} className="border-b border-gray-100 hover:bg-gray-50/50">
              <td className="py-2 px-3 text-gray-600 text-xs">{row.label}</td>
              {last6.map(d => {
                const val = getVal(d, row.key);
                return (
                  <td key={d.month} className={`text-right py-2 px-3 text-xs tabular-nums ${d.month === currentMonth ? "bg-teal-50/50" : ""} ${row.negative && val > 0 ? "text-red-500" : ""}`}>
                    {row.key === "totalCustomers" ? val : val > 0 ? (row.negative ? `-${val}` : `+${val}`) : "0"}
                  </td>
                );
              })}
            </tr>
          ))}

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

// ─── Main ────────────────────────────────────────────────
export default function MrrOverviewPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [mrrData, setMrrData] = useState<MrrOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const canAccess = useMemo(() => user?.role === "admin", [user]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getMrrOverview(12);
      if (res.success && res.data) setMrrData(res.data);
    } catch (e) {
      console.error("MRR overview error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && canAccess) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canAccess]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
  }
  if (!isAuthenticated || !canAccess) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Accesso riservato agli amministratori.</p></div>;
  }

  const latestSnap = mrrData?.months[mrrData.months.length - 1];

  return (
    <div className="flex h-screen bg-gray-50">
      <ModernSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MRR Overview</h1>
              <p className="text-sm text-gray-500 mt-0.5">Movimenti MRR e breakdown mensile</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
          ) : mrrData && mrrData.months.length > 0 ? (
            <>
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

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <BreakdownTable data={mrrData.months} />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="p-8 text-center text-sm text-gray-500">Nessun dato. Esegui il backfill dalla Dashboard SaaS.</CardContent></Card>
          )}
        </div>
      </main>
    </div>
  );
}
