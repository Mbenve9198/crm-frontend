"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ChevronDown, ChevronRight, Users } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { PLAN_COLORS, fmtEur } from "@/components/ui/saas-metrics-shared";
import type { PlansFromContactsData, PlanFromContactsBucket } from "@/types/saas-metrics";

function PlansDonut({ plans, totalMrr }: { plans: PlanFromContactsBucket[]; totalMrr: number }) {
  const chartData = plans.map((p, i) => ({
    name: p.label,
    value: p.mrr,
    fill: PLAN_COLORS[i % PLAN_COLORS.length],
  }));

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <div className="w-52 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
              {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Pie>
            <Tooltip formatter={(v) => fmtEur(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2">
        {plans.map((p, i) => (
          <div key={p.key} className="rounded-lg px-4 py-3 text-white min-w-[150px]" style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }}>
            <div className="text-lg font-bold">{p.percentage}%</div>
            <div className="text-xs opacity-90">{p.label}</div>
            <div className="text-xs opacity-75 mt-0.5">{fmtEur(p.mrr)} · {p.customers} clienti</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanRow({ plan, index }: { plan: PlanFromContactsBucket; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer" onClick={() => setOpen(!open)}>
        <td className="py-3 px-3 flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PLAN_COLORS[index % PLAN_COLORS.length] }} />
          <span className="text-sm font-medium">{plan.label}</span>
        </td>
        <td className="text-right py-3 px-3 text-sm tabular-nums">{plan.customers}</td>
        <td className="text-right py-3 px-3 text-sm tabular-nums font-medium">{fmtEur(plan.mrr)}</td>
        <td className="text-right py-3 px-3 text-sm tabular-nums">{fmtEur(plan.arr)}</td>
        <td className="text-right py-3 px-3 text-sm tabular-nums">{fmtEur(plan.arpu)}</td>
        <td className="text-right py-3 px-3 text-sm tabular-nums">{plan.percentage}%</td>
      </tr>
      {open && plan.contacts.map(c => (
        <tr key={c._id} className="border-b border-gray-50 bg-gray-50/30">
          <td className="py-2 px-3 pl-10 text-xs text-gray-600">{c.name}</td>
          <td className="text-right py-2 px-3 text-xs text-gray-500">{c.email}</td>
          <td className="text-right py-2 px-3 text-xs tabular-nums">{fmtEur(c.mrr)}</td>
          <td className="text-right py-2 px-3 text-xs text-gray-400">{c.planName}</td>
          <td className="text-right py-2 px-3">
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
              c.status === "active" ? "bg-green-100 text-green-700" : c.status === "trialing" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
            }`}>{c.status}</span>
          </td>
          <td />
        </tr>
      ))}
    </>
  );
}

export default function PlansComparisonPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<PlansFromContactsData | null>(null);
  const [loading, setLoading] = useState(true);
  const canAccess = useMemo(() => user?.role === "admin", [user]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getSaasPlansFromContacts();
      if (res.success && res.data) setData(res.data);
    } catch (e) {
      console.error("Plans from contacts error:", e);
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

  return (
    <div className="flex h-screen bg-gray-50">
      <ModernSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Confronto Piani</h1>
              <p className="text-sm text-gray-500 mt-0.5">Distribuzione clienti per frequenza di fatturazione</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
          ) : data && data.plans.length > 0 ? (
            <>
              {/* KPI riassuntive */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Clienti attivi</p>
                    <p className="text-2xl font-bold text-gray-900">{data.totalCustomers}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">MRR totale</p>
                    <p className="text-2xl font-bold text-gray-900">{fmtEur(data.totalMrr)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">ARR totale</p>
                    <p className="text-2xl font-bold text-gray-900">{fmtEur(data.totalMrr * 12)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">ARPU</p>
                    <p className="text-2xl font-bold text-gray-900">{data.totalCustomers > 0 ? fmtEur(Math.round(data.totalMrr / data.totalCustomers)) : "–"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Donut + pills */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Distribuzione MRR per Frequenza</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlansDonut plans={data.plans} totalMrr={data.totalMrr} />
                </CardContent>
              </Card>

              {/* Tabella dettaglio con espansione contatti */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Dettaglio per Frequenza</CardTitle>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Users className="w-3.5 h-3.5" />
                      Clicca una riga per vedere i contatti
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Frequenza</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Clienti</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">MRR</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ARR</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">ARPU</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">% MRR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.plans.map((p, i) => (
                          <PlanRow key={p.key} plan={p} index={i} />
                        ))}
                        {/* Totale */}
                        <tr className="border-t-2 border-gray-200 font-bold">
                          <td className="py-2 px-3 text-sm text-teal-700 pl-9">Totale</td>
                          <td className="text-right py-2 px-3 text-sm tabular-nums">{data.totalCustomers}</td>
                          <td className="text-right py-2 px-3 text-sm tabular-nums">{fmtEur(data.totalMrr)}</td>
                          <td className="text-right py-2 px-3 text-sm tabular-nums">{fmtEur(data.totalMrr * 12)}</td>
                          <td className="text-right py-2 px-3 text-sm tabular-nums">{data.totalCustomers > 0 ? fmtEur(Math.round(data.totalMrr / data.totalCustomers)) : "–"}</td>
                          <td className="text-right py-2 px-3 text-sm tabular-nums">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-700 mb-2">Nessun contatto con subscription attiva</h3>
                <p className="text-sm text-gray-500">I dati verranno mostrati quando ci saranno contatti con abbonamenti Stripe sincronizzati.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
