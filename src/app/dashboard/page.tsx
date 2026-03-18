"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { User as UserType } from "@/types/contact";
import { DashboardData, DashboardListItem } from "@/types/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutDashboard, RefreshCw } from "lucide-react";
import { getStatusLabel } from "@/lib/status-utils";

function formatEur(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "mai";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

function OwnerSelect({
  owners,
  value,
  onChange,
  disabled,
}: {
  owners: UserType[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="all">Tutti</option>
      {owners.map((u) => (
        <option key={u._id} value={u._id}>
          {u.firstName} {u.lastName} ({u.role})
        </option>
      ))}
    </select>
  );
}

function LeadsTable({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: DashboardListItem[];
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-4">
        {items.length === 0 ? (
          <div className="py-6 text-sm text-gray-500">Nessun lead.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Lead</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Ultimo tocco</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">MRR</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c._id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.email || "—"} {c.phone ? ` • ${c.phone}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{getStatusLabel(c.status)}</td>
                    <td className="px-4 py-2 text-gray-700">{formatDateTime(c.lastActivityAt)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {typeof c.mrr === "number" ? formatEur(c.mrr) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/?search=${encodeURIComponent(c.name)}`}
                        className="text-blue-700 hover:text-blue-900 text-sm font-medium"
                      >
                        Apri
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [owners, setOwners] = useState<UserType[]>([]);
  const [owner, setOwner] = useState<string>("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultOwnerId = useMemo(() => (user?._id ? user._id : "all"), [user?._id]);

  const loadOwners = async () => {
    try {
      const response = await apiClient.getUsersForAssignment();
      const users = response.data?.users || [];
      setOwners(users);
    } catch {
      setOwners([]);
    }
  };

  const loadDashboard = async (ownerId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.getDashboard({ ownerId, limit: 20 });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || "Errore nel caricamento del cruscotto");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOwners();
      // default: me stesso
      setOwner(defaultOwnerId);
      loadDashboard(defaultOwnerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, defaultOwnerId]);

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
          <AlertDescription>Effettua il login per accedere al cruscotto.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const k = data?.kpis;

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />

      <main className="pl-16">
        <div className="container mx-auto py-6 px-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <LayoutDashboard className="h-6 w-6 text-blue-600" />
                Cruscotto
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                KPI + liste operative per lavorare i lead in modo rapido.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Owner</label>
                <OwnerSelect
                  owners={owners}
                  value={owner}
                  onChange={(v) => {
                    setOwner(v);
                    loadDashboard(v);
                  }}
                  disabled={isLoading}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-6"
                disabled={isLoading}
                onClick={() => loadDashboard(owner)}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Aggiorna
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Non ancora toccati</CardTitle>
                <CardDescription>Smartlead: ≤ 1 activity. Rank Checker: 0 activity.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold text-gray-900">{k?.notTouched ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Free trial iniziato</CardTitle>
                <CardDescription>Status: free trial iniziato.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold text-gray-900">{k?.freeTrialStarted ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>QR code inviato</CardTitle>
                <CardDescription>Status: qr code inviato.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold text-gray-900">{k?.qrCodeSent ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Interessati</CardTitle>
                <CardDescription>Status: interessato.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold text-gray-900">{k?.interested ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Won</CardTitle>
                <CardDescription>Status: won.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold text-gray-900">{k?.won ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Lost</CardTitle>
                <CardDescription>Lost before + after free trial.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold text-gray-900">{k?.lost ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Potential €</CardTitle>
                <CardDescription>Placeholder: somma MRR pipeline.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold text-gray-900">
                  {typeof k?.pipelinePotentialEur === "number" ? formatEur(k.pipelinePotentialEur) : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <LeadsTable
              title="Lead untouched"
              description="Smartlead: ≤ 1 activity. Rank Checker: 0 activity."
              items={data?.lists.notTouched || []}
            />
            <LeadsTable
              title="Da richiamare"
              description="Status: da richiamare."
              items={data?.lists.callback || []}
            />
            <LeadsTable
              title="In free trial"
              description="Status: free trial iniziato."
              items={data?.lists.freeTrial || []}
            />
            <LeadsTable
              title="QR inviato (follow-up)"
              description="Status: qr code inviato."
              items={data?.lists.qrFollowUp || []}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

