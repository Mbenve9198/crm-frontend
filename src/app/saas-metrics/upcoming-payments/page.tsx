"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { ContactDetailSidebar } from "@/components/ui/contact-detail-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CalendarDays, ChevronDown, ChevronRight } from "lucide-react";
import { fmtEur } from "@/components/ui/saas-metrics-shared";
import type { UpcomingPaymentsData } from "@/types/saas-metrics";
import type { Contact } from "@/types/contact";

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function SourceBadge({ source }: { source: 'stripe' | 'bonifico' }) {
  if (source === 'bonifico') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800">
        Bonifico
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-indigo-100 text-indigo-800">
      Stripe
    </span>
  );
function formatDay(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

function monthTitle(m: string) {
  const [y, mo] = m.split("-");
  return `${MONTH_NAMES[parseInt(mo) - 1]} ${y}`;
}

export default function UpcomingPaymentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<UpcomingPaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const canAccess = useMemo(() => user?.role === "admin", [user]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getUpcomingPayments(6);
      if (res.success && res.data) {
        setData(res.data);
        setExpandedMonths(new Set(res.data.months.map(m => m.month)));
      }
    } catch (e) {
      console.error("Upcoming payments error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && canAccess) load();
  }, [isAuthenticated, canAccess, load]);

  const openContact = async (contactId: string) => {
    try {
      const res = await apiClient.getContact(contactId);
      if (res.success && res.data) {
        setSelectedContact(res.data);
        setIsSidebarOpen(true);
      }
    } catch (e) {
      console.error("Error loading contact:", e);
    }
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Prossimi Pagamenti</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Previsione incassi Stripe + bonifico bancario · prossimi 6 mesi
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
          </div>

          {loading && !data ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : data && data.months.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Totale previsto</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{fmtEur(data.grandTotal)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe</p>
                    <p className="text-2xl font-bold text-indigo-700 mt-1">{data.subscriptionCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">abbonamenti</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Bonifico</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{data.bonificoCount ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-0.5">clienti attivi</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pagamenti previsti</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {data.months.reduce((s, m) => s + m.paymentCount, 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {data.months.map(monthData => {
                  const isOpen = expandedMonths.has(monthData.month);
                  return (
                    <Card key={monthData.month}>
                      <CardHeader className="pb-2">
                        <button
                          onClick={() => toggleMonth(monthData.month)}
                          className="w-full flex items-center justify-between text-left group"
                        >
                          <div className="flex items-center gap-3">
                            {isOpen
                              ? <ChevronDown className="w-4 h-4 text-gray-400" />
                              : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            <CalendarDays className="w-5 h-5 text-teal-600" />
                            <div>
                              <CardTitle className="text-base font-semibold group-hover:text-teal-700 transition-colors">
                                {monthTitle(monthData.month)}
                              </CardTitle>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {monthData.paymentCount} pagament{monthData.paymentCount === 1 ? "o" : "i"}
                              </p>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-teal-700 tabular-nums">
                            {fmtEur(monthData.totalAmount)}
                          </span>
                        </button>
                      </CardHeader>
                      {isOpen && (
                        <CardContent className="pt-0">
                          <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
                            {monthData.payments.map((p, i) => (
                              <div key={`${p.source}-${p.contactId || p.subscriptionId}-${p.date}-${i}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className="text-center w-20 flex-shrink-0">
                                    <p className="text-xs font-semibold text-teal-700 uppercase">{formatDay(p.date)}</p>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {p.contactId ? (
                                        <button
                                          onClick={() => openContact(p.contactId!)}
                                          className="text-sm font-medium text-gray-900 hover:text-teal-600 transition-colors truncate text-left"
                                        >
                                          {p.contactName}
                                        </button>
                                      ) : (
                                        <p className="text-sm font-medium text-gray-900 truncate">{p.contactName}</p>
                                      )}
                                      <SourceBadge source={p.source ?? "stripe"} />
                                    </div>
                                    <p className="text-xs text-gray-400 truncate">
                                      {p.planName} · {p.billingLabel}
                                      {p.source === "stripe" && p.status === "trialing" && " · Trial"}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0 ml-4">
                                  {fmtEur(p.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500">Nessun pagamento previsto nei prossimi mesi.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <ContactDetailSidebar
        contact={selectedContact}
        isOpen={isSidebarOpen}
        onClose={() => { setIsSidebarOpen(false); setSelectedContact(null); }}
        onContactUpdate={(updated) => setSelectedContact(updated)}
      />
    </div>
  );
}
