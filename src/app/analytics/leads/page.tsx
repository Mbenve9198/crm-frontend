 "use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { LeadAnalyticsData, WonContact } from "@/types/analytics";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, BarChart3, CalendarRange } from "lucide-react";

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function LeadAnalyticsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return formatDateInput(d);
  });
  const [to, setTo] = useState<string>(() => formatDateInput(new Date()));
  const [data, setData] = useState<LeadAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [wonLoadingSource, setWonLoadingSource] = useState<string | null>(null);
  const [wonError, setWonError] = useState<string | null>(null);
  const [wonContactsBySource, setWonContactsBySource] = useState<
    Record<string, WonContact[]>
  >({});

  const canAccess = useMemo(() => user && user.role === "admin", [user]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getLeadAnalytics({ from, to });
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.message || "Errore nel caricamento delle analytics");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && canAccess) {
      loadAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canAccess]);

  const handleApplyRange = (e: React.FormEvent) => {
    e.preventDefault();
    setExpandedSource(null);
    setWonError(null);
    loadAnalytics();
  };

  const handleToggleWonList = async (sourceKey: string) => {
    if (expandedSource === sourceKey) {
      setExpandedSource(null);
      return;
    }

    setWonError(null);

    if (wonContactsBySource[sourceKey]) {
      setExpandedSource(sourceKey);
      return;
    }

    try {
      setWonLoadingSource(sourceKey);
      const response = await apiClient.getWonContactsAnalytics({
        source: sourceKey,
        from,
        to,
      });
      const data = response.data;
      const contacts = data?.contacts;

      if (response.success && contacts) {
        setWonContactsBySource((prev) => ({
          ...prev,
          [sourceKey]: contacts,
        }));
        setExpandedSource(sourceKey);
      } else {
        setWonError(
          response.message ||
            "Errore nel caricamento dei clienti chiusi per questa sorgente."
        );
      }
    } catch (err) {
      setWonError(
        err instanceof Error
          ? err.message
          : "Errore sconosciuto nel caricamento dei clienti chiusi."
      );
    } finally {
      setWonLoadingSource(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verifica autenticazione...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert className="max-w-md bg-white">
          <AlertTitle>Autenticazione richiesta</AlertTitle>
          <AlertDescription>
            Effettua il login per accedere alle analytics dei lead.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert className="max-w-md bg-white">
          <AlertTitle>Accesso non autorizzato</AlertTitle>
          <AlertDescription>
            Solo utenti con ruolo <span className="font-semibold">admin</span>{" "}
            possono visualizzare le analytics dei lead.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const sourceKeys = data ? Object.keys(data.sources) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />

      <main className="pl-16">
        <div className="container mx-auto py-6 px-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                Analytics Lead Funnel
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Confronto tra sorgenti lead (Smartlead outbound vs inbound Rank
                Checker) per periodo.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader className="border-b flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-blue-600" />
                  Intervallo temporale
                </CardTitle>
                <CardDescription>
                  Seleziona il periodo da analizzare. Se non specifichi nulla,
                  il backend usa gli ultimi 30 giorni.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <form
                onSubmit={handleApplyRange}
                className="flex flex-col sm:flex-row gap-4 sm:items-end"
              >
                <div className="flex flex-col gap-1">
                  <label
                    className="text-sm font-medium text-gray-700"
                    htmlFor="from"
                  >
                    Dal
                  </label>
                  <input
                    id="from"
                    type="date"
                    className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    className="text-sm font-medium text-gray-700"
                    htmlFor="to"
                  >
                    Al
                  </label>
                  <input
                    id="to"
                    type="date"
                    className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="mt-4 sm:mt-0"
                  >
                    {isLoading && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Applica
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 sm:mt-0"
                    onClick={() => {
                      const d = new Date();
                      const today = formatDateInput(d);
                      d.setDate(1);
                      const firstOfMonth = formatDateInput(d);
                      setFrom(firstOfMonth);
                      setTo(today);
                      setExpandedSource(null);
                      setWonError(null);
                      setWonContactsBySource({});
                      loadAnalytics();
                    }}
                    disabled={isLoading}
                  >
                    Mese corrente
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {error && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Periodo analizzato</CardTitle>
                <CardDescription>
                  {data
                    ? `${new Date(
                        data.period.from
                      ).toLocaleDateString()} → ${new Date(
                        data.period.to
                      ).toLocaleDateString()}`
                    : "Nessun dato ancora caricato"}
                </CardDescription>
              </CardHeader>
            </Card>
            {data && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Totale lead</CardTitle>
                    <CardDescription>
                      Somma di tutte le sorgenti nel periodo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-semibold text-gray-900">
                      {sourceKeys.reduce(
                        (acc, key) => acc + data.sources[key].totalLeads,
                        0
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>QR code inviati</CardTitle>
                    <CardDescription>
                      Lead che hanno raggiunto lo stato “qr code inviato”.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-semibold text-gray-900">
                      {sourceKeys.reduce(
                        (acc, key) => acc + data.sources[key].qrCodeSent,
                        0
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Lead vinti (won)</CardTitle>
                    <CardDescription>
                      Numero totale di deal vinti nel periodo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-semibold text-gray-900">
                      {sourceKeys.reduce(
                        (acc, key) => acc + data.sources[key].won,
                        0
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>MRR vinto totale</CardTitle>
                    <CardDescription>
                      Somma del MRR vinto su tutte le sorgenti.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-semibold text-gray-900">
                      €
                      {sourceKeys
                        .reduce(
                          (acc, key) => acc + data.sources[key].mrrWon,
                          0
                        )
                        .toLocaleString("it-IT")}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Confronto per sorgente</CardTitle>
              <CardDescription>
                Dettaglio per <code>smartlead_outbound</code> e{" "}
                <code>inbound_rank_checker</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!data ? (
                <div className="py-8 text-center text-gray-500">
                  Nessun dato ancora caricato. Seleziona un periodo e clicca{" "}
                  <span className="font-semibold">Applica</span>.
                </div>
              ) : sourceKeys.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  Nessun lead trovato nel periodo selezionato.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-2 text-left font-medium text-gray-600">
                          Sorgente
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          Lead totali
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          QR code inviati
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          Free trial iniziati
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          Won
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          Lost
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          MRR won
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          MRR free trial
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          Conversion rate won
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceKeys.map((key) => {
                        const row = data.sources[key];
                        const conversion =
                          row.totalLeads > 0
                            ? (row.won / row.totalLeads) * 100
                            : 0;
                        const isExpanded = expandedSource === key;
                        const wonContacts = wonContactsBySource[key] || [];

                        return (
                          <>
                            <tr key={key} className="border-b last:border-0">
                              <td className="px-4 py-2 font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span>{key}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleWonList(key)}
                                    disabled={wonLoadingSource === key}
                                  >
                                    {wonLoadingSource === key && (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    )}
                                    <span className="text-xs">
                                      Clienti chiusi (won)
                                    </span>
                                  </Button>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right">
                                {row.totalLeads}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {row.qrCodeSent}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {row.freeTrialStarted}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {row.won}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {row.lost}
                              </td>
                              <td className="px-4 py-2 text-right">
                                €
                                {row.mrrWon.toLocaleString("it-IT")}
                              </td>
                              <td className="px-4 py-2 text-right">
                                €
                                {row.mrrFreeTrial.toLocaleString("it-IT")}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {conversion.toFixed(1)}%
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="border-b last:border-0 bg-gray-50">
                                <td
                                  className="px-4 py-3 text-sm text-gray-700"
                                  colSpan={9}
                                >
                                  {wonError && (
                                    <div className="mb-2 text-red-700">
                                      {wonError}
                                    </div>
                                  )}
                                  {!wonError && wonLoadingSource === key && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>
                                        Caricamento clienti chiusi per questa
                                        sorgente...
                                      </span>
                                    </div>
                                  )}
                                  {!wonError &&
                                    wonLoadingSource !== key &&
                                    (wonContacts.length === 0 ? (
                                      <div className="text-gray-600">
                                        Nessun cliente chiuso (won) nel periodo
                                        selezionato per questa sorgente.
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="font-semibold text-gray-800">
                                          Clienti chiusi (won) per{" "}
                                          <code>{key}</code> nel periodo
                                          selezionato:
                                        </div>
                                        <ul className="space-y-1">
                                          {wonContacts.map((contact) => (
                                            <li
                                              key={contact.id}
                                              className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-1 last:border-b-0"
                                            >
                                              <div>
                                                <span className="font-medium">
                                                  {contact.name}
                                                </span>
                                                {contact.email && (
                                                  <span className="ml-2 text-gray-600">
                                                    {contact.email}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-4 text-gray-700">
                                                {typeof contact.mrr ===
                                                  "number" && (
                                                  <span>
                                                    MRR: €
                                                    {contact.mrr.toLocaleString(
                                                      "it-IT"
                                                    )}
                                                  </span>
                                                )}
                                                <span className="text-xs text-gray-500">
                                                  Won il{" "}
                                                  {new Date(
                                                    contact.wonAt
                                                  ).toLocaleDateString("it-IT")}
                                                </span>
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

