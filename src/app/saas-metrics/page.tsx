"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { KpiCard } from "@/components/ui/saas-metrics-shared";
import type { SaasOverview } from "@/types/saas-metrics";

export default function SaasDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [overview, setOverview] = useState<SaasOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const canAccess = useMemo(() => user?.role === "admin", [user]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getSaasOverview();
      if (res.success && res.data) setOverview(res.data);
    } catch (e) {
      console.error("SaaS overview error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && canAccess) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canAccess]);

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      await apiClient.backfillSnapshots();
      setTimeout(() => load(), 3000);
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

  return (
    <div className="flex h-screen bg-gray-50">
      <ModernSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SaaS Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Panoramica metriche in tempo reale</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
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
          ) : !overview ? (
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiCard title="Current MRR" value={overview.currentMrr} prevValue={overview.prevMrr} sparkData={overview.sparkline} sparkKey="mrr" />
              <KpiCard title="Clienti" value={overview.currentCustomers} prevValue={overview.prevCustomers} format="num" sparkData={overview.sparkline} sparkKey="customers" />
              <KpiCard title="Trial attivi" value={overview.trials} prevValue={overview.prevTrials} format="num" />
              <KpiCard title="New MRR" value={overview.newMrr} prevValue={overview.prevNewMrr} />
              <KpiCard title="Churn MRR" value={overview.churnMrr} prevValue={overview.prevChurnMrr} invertColor />
              <KpiCard title="Crescita mese" value={overview.growth} prevValue={overview.prevGrowth} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
