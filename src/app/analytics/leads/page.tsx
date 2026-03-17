 "use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { User } from "@/types/contact";
import {
  LeadCohortFunnelAnalyticsData,
  LeadCohortContact,
  LeadFunnelStepContact,
} from "@/types/analytics";
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

type ExpandedPanel =
  | { source: string; key: "created" | "reactivated" }
  | { source: string; key: "qr" | "ft" | "won" }
  | null;

export default function LeadAnalyticsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [owners, setOwners] = useState<User[]>([]);
  const [owner, setOwner] = useState<string>("all");
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return formatDateInput(d);
  });
  const [to, setTo] = useState<string>(() => formatDateInput(new Date()));
  const [data, setData] = useState<LeadCohortFunnelAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<ExpandedPanel>(null);

  const canAccess = useMemo(() => user && user.role === "admin", [user]);

  const loadOwners = async () => {
    try {
      const response = await apiClient.getUsersForAssignment();
      const users = response.data?.users || [];
      setOwners(users);
    } catch {
      // Non bloccare la pagina se il caricamento owner fallisce
      setOwners([]);
    }
  };

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getLeadCohortAnalytics({
        from,
        to,
        owner: owner !== "all" ? owner : "all",
      });
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
      loadOwners();
      loadAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canAccess]);

  const handleApplyRange = (e: React.FormEvent) => {
    e.preventDefault();
    setExpanded(null);
    loadAnalytics();
  };

  const togglePanel = (next: ExpandedPanel) => {
    setExpanded((prev) => {
      if (!prev || !next) return next;
      if (prev.source === next.source && prev.key === next.key) return null;
      return next;
    });
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
  const totalCohort =
    data?.sources
      ? sourceKeys.reduce((acc, key) => acc + (data.sources[key]?.cohort.total.count || 0), 0)
      : 0;
  const totalCreated =
    data?.sources
      ? sourceKeys.reduce((acc, key) => acc + (data.sources[key]?.cohort.created.count || 0), 0)
      : 0;
  const totalReactivated =
    data?.sources
      ? sourceKeys.reduce(
          (acc, key) => acc + (data.sources[key]?.cohort.reactivated.count || 0),
          0
        )
      : 0;
  const totalWon =
    data?.sources
      ? sourceKeys.reduce((acc, key) => acc + (data.sources[key]?.steps.won.count || 0), 0)
      : 0;

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
                Coorte (creati + riattivati) e funnel QR → free trial → won per
                periodo (riattivazione = nessuna activity da almeno{" "}
                {data?.silenceDaysThreshold ?? 40} giorni).
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
                    htmlFor="owner"
                  >
                    Owner
                  </label>
                  <select
                    id="owner"
                    className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                  >
                    <option value="all">Tutti</option>
                    {owners.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
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
                      setExpanded(null);
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
                    <CardTitle>Coorte totale</CardTitle>
                    <CardDescription>
                      Creati + riattivati nel periodo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-semibold text-gray-900">
                      {totalCohort}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Creati</CardTitle>
                    <CardDescription>
                      Nuovi contatti creati nel periodo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-semibold text-gray-900">
                      {totalCreated}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Riattivati</CardTitle>
                    <CardDescription>
                      Contatti con nuova activity dopo ≥{" "}
                      {data.silenceDaysThreshold} giorni di silenzio.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-semibold text-gray-900">
                      {totalReactivated}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Won nel periodo</CardTitle>
                    <CardDescription>
                      Deal entrati in “won” nel periodo (coorte).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-2xl font-semibold text-gray-900">
                      {totalWon}
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
                <code>inbound_rank_checker</code> (con liste “quali lead”).
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
                          Coorte (totale)
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          Creati
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          Riattivati
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          QR code inviato
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          Free trial iniziato
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          Won
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-600">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceKeys.map((key) => {
                        const row = data.sources[key];
                        const isExpanded = expanded?.source === key;

                        const renderCohortList = (
                          title: string,
                          contacts: LeadCohortContact[]
                        ) => (
                          <div className="space-y-2">
                            <div className="font-semibold text-gray-800">
                              {title} per <code>{key}</code>
                            </div>
                            {contacts.length === 0 ? (
                              <div className="text-gray-600">Nessun contatto.</div>
                            ) : (
                              <ul className="space-y-1">
                                {contacts.map((c) => (
                                  <li
                                    key={c.id}
                                    className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-1 last:border-b-0"
                                  >
                                    <div>
                                      <span className="font-medium">{c.name}</span>
                                      {c.email && (
                                        <span className="ml-2 text-gray-600">
                                          {c.email}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-700">
                                      {typeof c.mrr === "number" && (
                                        <span>
                                          MRR: €{c.mrr.toLocaleString("it-IT")}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-500">
                                        Inizio coorte:{" "}
                                        {new Date(c.cohortStartAt).toLocaleDateString(
                                          "it-IT"
                                        )}
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );

                        const renderStepList = (
                          title: string,
                          contacts: LeadFunnelStepContact[]
                        ) => (
                          <div className="space-y-2">
                            <div className="font-semibold text-gray-800">
                              {title} per <code>{key}</code> (nel periodo)
                            </div>
                            {contacts.length === 0 ? (
                              <div className="text-gray-600">Nessun contatto.</div>
                            ) : (
                              <ul className="space-y-1">
                                {contacts.map((c) => (
                                  <li
                                    key={c.id}
                                    className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-1 last:border-b-0"
                                  >
                                    <div>
                                      <span className="font-medium">{c.name}</span>
                                      {c.email && (
                                        <span className="ml-2 text-gray-600">
                                          {c.email}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-700">
                                      {typeof c.mrr === "number" && (
                                        <span>
                                          MRR: €{c.mrr.toLocaleString("it-IT")}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-500">
                                        Entrato:{" "}
                                        {c.enteredAt
                                          ? new Date(c.enteredAt).toLocaleDateString(
                                              "it-IT"
                                            )
                                          : "N/A"}
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );

                        const panel =
                          isExpanded && expanded
                            ? expanded.key === "created"
                              ? renderCohortList(
                                  "Creati",
                                  row.cohort.created.contacts
                                )
                              : expanded.key === "reactivated"
                                ? renderCohortList(
                                    "Riattivati",
                                    row.cohort.reactivated.contacts
                                  )
                                : expanded.key === "qr"
                                  ? renderStepList(
                                      "QR code inviato",
                                      row.steps.qrCodeSent.contacts
                                    )
                                  : expanded.key === "ft"
                                    ? renderStepList(
                                        "Free trial iniziato",
                                        row.steps.freeTrialStarted.contacts
                                      )
                                    : renderStepList("Won", row.steps.won.contacts)
                            : null;

                        return (
                          <>
                            <tr key={key} className="border-b last:border-0">
                              <td className="px-4 py-2 font-medium text-gray-900">
                                {key}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {row.cohort.total.count}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {row.cohort.created.count}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {row.cohort.reactivated.count}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {row.steps.qrCodeSent.count}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {row.steps.freeTrialStarted.count}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {row.steps.won.count}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <div className="flex justify-end flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      togglePanel({ source: key, key: "created" })
                                    }
                                  >
                                    <span className="text-xs">Creati</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      togglePanel({
                                        source: key,
                                        key: "reactivated",
                                      })
                                    }
                                  >
                                    <span className="text-xs">Riattivati</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      togglePanel({ source: key, key: "qr" })
                                    }
                                  >
                                    <span className="text-xs">QR</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      togglePanel({ source: key, key: "ft" })
                                    }
                                  >
                                    <span className="text-xs">Free trial</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      togglePanel({ source: key, key: "won" })
                                    }
                                  >
                                    <span className="text-xs">Won</span>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            {panel && (
                              <tr className="border-b last:border-0 bg-gray-50">
                                <td
                                  className="px-4 py-3 text-sm text-gray-700"
                                  colSpan={8}
                                >
                                  {panel}
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

