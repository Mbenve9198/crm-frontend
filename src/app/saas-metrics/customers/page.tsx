"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ArrowUpDown, Users } from "lucide-react";
import { fmtEur } from "@/components/ui/saas-metrics-shared";
import type { CustomersListData, SaasCustomer } from "@/types/saas-metrics";

const ACTIVITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new:               { label: "NEW CUSTOMER",    color: "text-white",    bg: "bg-teal-500" },
  reactivation:      { label: "RIATTIVATO",      color: "text-white",    bg: "bg-blue-500" },
  expansion:         { label: "UPGRADED",         color: "text-white",    bg: "bg-teal-500" },
  contraction:       { label: "DOWNGRADED",       color: "text-white",    bg: "bg-orange-500" },
  voluntary_churn:   { label: "CHURNED",          color: "text-white",    bg: "bg-red-500" },
  delinquent_churn:  { label: "DELINQUENT",       color: "text-white",    bg: "bg-red-600" },
  existing:          { label: "ACTIVE",           color: "text-gray-600", bg: "bg-gray-100" },
};

function ActivityBadge({ type, delta }: { type: string; delta: number }) {
  const cfg = ACTIVITY_CONFIG[type] || ACTIVITY_CONFIG.existing;
  const showDelta = delta !== 0 && type !== "existing";

  return (
    <div className="flex items-center gap-2">
      {showDelta && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${cfg.bg} ${cfg.color}`}>
          {delta > 0 ? "+" : ""}€{Math.abs(delta)}
        </span>
      )}
      <span className={`text-[10px] font-semibold tracking-wider uppercase ${type === "existing" ? "text-gray-400" : cfg.color.replace("text-white", "") || "text-teal-600"}`}
        style={type !== "existing" ? { color: cfg.bg.replace("bg-", "").includes("teal") ? "#0d9488" : cfg.bg.includes("blue") ? "#3b82f6" : cfg.bg.includes("orange") ? "#f97316" : cfg.bg.includes("red") ? "#ef4444" : "#6b7280" } : undefined}
      >
        {cfg.label}
      </span>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return "–";
  const date = new Date(d);
  return date.toLocaleDateString("it-IT", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

type SortField = "mrr" | "activityDate" | "name";

export default function CustomersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<CustomersListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("activityDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const canAccess = useMemo(() => user?.role === "admin", [user]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getSaasCustomers({
        sort: sortField,
        order: sortOrder,
        search: searchQuery || undefined,
      });
      if (res.success && res.data) setData(res.data);
    } catch (e) {
      console.error("Customers load error:", e);
    } finally {
      setLoading(false);
    }
  }, [sortField, sortOrder, searchQuery]);

  useEffect(() => {
    if (isAuthenticated && canAccess) load();
  }, [isAuthenticated, canAccess, load]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(o => o === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  };

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (isAuthenticated && canAccess) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sortField, sortOrder]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
  }
  if (!isAuthenticated || !canAccess) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Accesso riservato agli amministratori.</p></div>;
  }

  const currentMonthLabel = new Date().toLocaleString("it-IT", { month: "short" }).toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50">
      <ModernSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-gray-900">{data?.totalCustomers ?? "–"}</span>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Customers</span>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-gray-900">{data ? fmtEur(data.totalMrr) : "–"}</span>
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">MRR</span>
              </div>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca clienti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Table */}
          {loading && !data ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
          ) : data && data.customers.length > 0 ? (
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50/50">
                      <th className="text-left py-3 px-4">
                        <button onClick={() => toggleSort("name")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                          Customer
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-right py-3 px-4">
                        <button onClick={() => toggleSort("mrr")} className="flex items-center gap-1 ml-auto text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                          {currentMonthLabel} MRR
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="text-right py-3 px-4">
                        <button onClick={() => toggleSort("activityDate")} className="flex items-center gap-1 ml-auto text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                          Time
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.map((c) => (
                      <tr key={c._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                              <p className="text-xs text-gray-400 truncate">{c.planDesc}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className="text-sm font-medium text-gray-900 tabular-nums">{fmtEur(c.mrr)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <ActivityBadge type={c.activityType} delta={c.activityDelta} />
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className="text-sm text-gray-500 tabular-nums">{formatDate(c.activityDate)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500">
                {searchQuery ? "Nessun cliente trovato per la ricerca." : "Nessun cliente attivo."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
