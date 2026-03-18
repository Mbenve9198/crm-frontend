"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { User as UserType } from "@/types/contact";
import { DashboardData, DashboardListItem } from "@/types/dashboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  LayoutDashboard,
  RefreshCw,
  AlertTriangle,
  Play,
  QrCode,
  Users,
  Trophy,
  XCircle,
  DollarSign,
  ExternalLink,
  PartyPopper,
  CheckCircle2,
  PhoneCall,
  Inbox,
} from "lucide-react";
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

type KpiCardProps = {
  label: string;
  description?: string;
  value: string | number;
  icon: React.ReactNode;
  borderColor: string;
  iconBg: string;
  valueColor?: string;
};

function KpiCard({
  label,
  description,
  value,
  icon,
  borderColor,
  iconBg,
  valueColor = "text-gray-900",
}: KpiCardProps) {
  return (
    <Card className={`relative overflow-hidden border-l-4 ${borderColor}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{label}</p>
          {description ? (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
          ) : null}
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className={`text-3xl font-bold tracking-tight ${valueColor}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

type ThemedTableProps = {
  title: string;
  count: number;
  items: DashboardListItem[];
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  emptyIcon: React.ReactNode;
  emptyMessage: string;
  accentBorder: string;
};

function ThemedLeadsTable({
  title,
  count,
  items,
  headerBg,
  headerText,
  badgeBg,
  badgeText,
  emptyIcon,
  emptyMessage,
  accentBorder,
}: ThemedTableProps) {
  const router = useRouter();

  return (
    <Card className={`overflow-hidden border-t-4 ${accentBorder}`}>
      <div className={`px-5 py-3.5 flex items-center justify-between ${headerBg}`}>
        <h3 className={`text-sm font-semibold ${headerText}`}>{title}</h3>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeBg} ${badgeText}`}
        >
          {count}
        </span>
      </div>

      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
            {emptyIcon}
            <p className="text-sm text-center max-w-[220px]">{emptyMessage}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Ultimo tocco
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    MRR
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr
                    key={c._id}
                    className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/?search=${encodeURIComponent(c.name)}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.email || "—"}{c.phone ? ` · ${c.phone}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{getStatusLabel(c.status)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(c.lastActivityAt)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {typeof c.mrr === "number" ? formatEur(c.mrr) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/?search=${encodeURIComponent(c.name)}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Apri
                        </Button>
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
          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <LayoutDashboard className="h-6 w-6 text-blue-600" />
                Cruscotto
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Panoramica operativa e liste di lavoro.
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

          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Lead untouched"
              description="Smartlead: ≤ 1 activity. Rank Checker: 0 activity."
              value={k?.notTouched ?? "—"}
              icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
              borderColor="border-l-amber-500"
              iconBg="bg-amber-50"
              valueColor="text-amber-700"
            />
            <KpiCard
              label="Free trial iniziato"
              value={k?.freeTrialStarted ?? "—"}
              icon={<Play className="h-5 w-5 text-emerald-600" />}
              borderColor="border-l-emerald-500"
              iconBg="bg-emerald-50"
              valueColor="text-emerald-700"
            />
            <KpiCard
              label="QR code inviato"
              value={k?.qrCodeSent ?? "—"}
              icon={<QrCode className="h-5 w-5 text-purple-600" />}
              borderColor="border-l-purple-500"
              iconBg="bg-purple-50"
              valueColor="text-purple-700"
            />
            <KpiCard
              label="Interessati"
              value={k?.interested ?? "—"}
              icon={<Users className="h-5 w-5 text-blue-600" />}
              borderColor="border-l-blue-500"
              iconBg="bg-blue-50"
              valueColor="text-blue-700"
            />
            <KpiCard
              label="Won"
              value={k?.won ?? "—"}
              icon={<Trophy className="h-5 w-5 text-green-700" />}
              borderColor="border-l-green-600"
              iconBg="bg-green-50"
              valueColor="text-green-700"
            />
            <KpiCard
              label="Lost"
              value={k?.lost ?? "—"}
              icon={<XCircle className="h-5 w-5 text-red-500" />}
              borderColor="border-l-red-400"
              iconBg="bg-red-50"
              valueColor="text-red-600"
            />
            <KpiCard
              label="Potential Commissions"
              description="Somma di (20% × MRR × 12 + €50) per lead in QR/Free trial con MRR."
              value={typeof k?.pipelinePotentialEur === "number" ? formatEur(k.pipelinePotentialEur) : "—"}
              icon={<DollarSign className="h-5 w-5 text-yellow-600" />}
              borderColor="border-l-yellow-500"
              iconBg="bg-yellow-50"
              valueColor="text-yellow-700"
            />
          </div>

          {/* Operative Tables — ordered by sales priority */}
          <div className="grid gap-6 xl:grid-cols-2">
            <ThemedLeadsTable
              title="In free trial"
              count={data?.lists.freeTrial?.length || 0}
              items={data?.lists.freeTrial || []}
              headerBg="bg-emerald-50"
              headerText="text-emerald-800"
              badgeBg="bg-emerald-100"
              badgeText="text-emerald-700"
              accentBorder="border-t-emerald-500"
              emptyIcon={<PartyPopper className="h-8 w-8" />}
              emptyMessage="Nessun free trial attivo — è il momento di convertire qualche lead!"
            />

            <ThemedLeadsTable
              title="QR inviato (follow-up)"
              count={data?.lists.qrFollowUp?.length || 0}
              items={data?.lists.qrFollowUp || []}
              headerBg="bg-purple-50"
              headerText="text-purple-800"
              badgeBg="bg-purple-100"
              badgeText="text-purple-700"
              accentBorder="border-t-purple-500"
              emptyIcon={<CheckCircle2 className="h-8 w-8" />}
              emptyMessage="Tutti i QR sono stati gestiti — ottimo lavoro!"
            />

            <ThemedLeadsTable
              title="Lead untouched"
              count={data?.lists.notTouched?.length || 0}
              items={data?.lists.notTouched || []}
              headerBg="bg-amber-50"
              headerText="text-amber-800"
              badgeBg="bg-amber-100"
              badgeText="text-amber-700"
              accentBorder="border-t-amber-500"
              emptyIcon={<Inbox className="h-8 w-8" />}
              emptyMessage="Zero lead in attesa — backlog pulito!"
            />

            <ThemedLeadsTable
              title="Da richiamare"
              count={data?.lists.callback?.length || 0}
              items={data?.lists.callback || []}
              headerBg="bg-blue-50"
              headerText="text-blue-800"
              badgeBg="bg-blue-100"
              badgeText="text-blue-700"
              accentBorder="border-t-blue-500"
              emptyIcon={<PhoneCall className="h-8 w-8" />}
              emptyMessage="Nessuna callback in sospeso — tutto sotto controllo."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
