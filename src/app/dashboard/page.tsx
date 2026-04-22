"use client";

import { useEffect, useMemo, useState, useRef } from "react";

import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { User as UserType, Contact } from "@/types/contact";
import { DashboardData, DashboardListItem } from "@/types/dashboard";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CallbackDialog } from "@/components/ui/callback-dialog";
import { ContactDetailSidebar } from "@/components/ui/contact-detail-sidebar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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

  PartyPopper,
  CheckCircle2,
  PhoneCall,
  Inbox,
  Clock,
  CalendarClock,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Timer,
} from "lucide-react";
import { getStatusLabel } from "@/lib/status-utils";
import { MessageCircle } from "lucide-react";

const PAGE_SIZE = 10;

function WhatsAppLink({ phone }: { phone: string }) {
  const cleaned = phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
  return (
    <a
      href={`https://api.whatsapp.com/send/?phone=${encodeURIComponent(cleaned)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-0.5 text-green-600 hover:text-green-700 hover:underline"
    >
      <MessageCircle className="h-3 w-3" />
      <span>{phone}</span>
    </a>
  );
}

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

function formatCallbackDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAge(iso?: string | null): { label: string; className: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return { label: "appena", className: "text-emerald-600 bg-emerald-50" };

  const totalMinutes = Math.floor(diffMs / 60_000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  let label: string;
  if (days > 0) {
    label = hours > 0 ? `${days}g ${hours}h` : `${days}g`;
  } else if (totalHours > 0) {
    const mins = totalMinutes % 60;
    label = mins > 0 ? `${totalHours}h ${mins}m` : `${totalHours}h`;
  } else {
    label = `${totalMinutes}m`;
  }

  let className: string;
  if (totalHours < 12) className = "text-emerald-700 bg-emerald-50";
  else if (totalHours < 24) className = "text-amber-700 bg-amber-50";
  else if (totalHours < 48) className = "text-orange-700 bg-orange-50";
  else className = "text-red-700 bg-red-50";

  return { label, className };
}

function getCallbackBadge(iso?: string | null): { label: string; className: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  if (d < todayStart) return { label: "SCADUTO", className: "bg-red-100 text-red-700" };
  if (d < todayEnd) return { label: "OGGI", className: "bg-amber-100 text-amber-700" };
  return null;
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

function TablePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t bg-gray-50/40">
      <span className="text-xs text-gray-500">
        Pagina {page} di {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
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
  hideMrr?: boolean;
  showCloseDate?: boolean;
  showSource?: boolean;
  showAge?: boolean;
  ageFrom?: "createdAt" | "lastActivityAt";
  onContactClick?: (id: string) => void;
};

const sourceLabel = (src?: string) => {
  if (src === "smartlead_outbound") return "Smartlead";
  if (src === "inbound_rank_checker") return "Inbound";
  return src || "—";
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
  hideMrr,
  showCloseDate,
  showSource,
  showAge,
  ageFrom = "createdAt",
  onContactClick,
}: ThemedTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [items]);

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
          <>
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
                      {showCloseDate ? "Close date" : showSource ? "Source" : "Ultimo tocco"}
                    </th>
                    {showAge && (
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {ageFrom === "lastActivityAt" ? "Ultimo tocco" : "In attesa da"}
                      </th>
                    )}
                    {!hideMrr && (
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        MRR
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c) => (
                    <tr
                      key={c._id}
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => onContactClick?.(c._id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500">
                          {c.email || "—"}{c.phone ? <>{" · "}<WhatsAppLink phone={c.phone} /></> : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{getStatusLabel(c.status)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {showCloseDate
                          ? (c.properties?.closeDate
                              ? new Date(String(c.properties.closeDate)).toLocaleDateString("it-IT")
                              : "—")
                          : showSource
                            ? <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.source === "smartlead_outbound" ? "bg-blue-100 text-blue-700" : c.source === "inbound_rank_checker" ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"}`}>{sourceLabel(c.source)}</span>
                            : formatDateTime(c.lastActivityAt)}
                      </td>
                      {showAge && (() => {
                        const age = formatAge(ageFrom === "lastActivityAt" ? c.lastActivityAt : c.createdAt);
                        return (
                          <td className="px-4 py-3">
                            {age ? (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${age.className}`}>
                                <Clock className="h-3 w-3" />
                                {age.label}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        );
                      })()}
                      {!hideMrr && (
                        <td className="px-4 py-3 text-right text-gray-700">
                          {typeof c.mrr === "number" ? formatEur(c.mrr) : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

type CallbackTableProps = {
  items: DashboardListItem[];
  onSetCallback: (item: DashboardListItem) => void;
  onContactClick?: (id: string) => void;
};

function CallbackTable({ items, onSetCallback, onContactClick }: CallbackTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [items]);

  return (
    <Card className="overflow-hidden border-t-4 border-t-blue-500">
      <div className="px-5 py-3.5 flex items-center justify-between bg-blue-50">
        <h3 className="text-sm font-semibold text-blue-800">Richiami programmati</h3>
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-700">
          {items.length}
        </span>
      </div>

      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
            <PhoneCall className="h-8 w-8" />
            <p className="text-sm text-center max-w-[220px]">
              Nessuna callback in sospeso — tutto sotto controllo.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/60">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Richiamo
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Nota
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c) => {
                    const cbDate = formatCallbackDate(c.properties?.callbackAt);
                    const badge = getCallbackBadge(c.properties?.callbackAt);
                    return (
                      <tr
                        key={c._id}
                        className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => onContactClick?.(c._id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-500">
                            {c.email || "—"}{c.phone ? <>{" · "}<WhatsAppLink phone={c.phone} /></> : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {cbDate ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-gray-700 text-xs">{cbDate}</span>
                              {badge && (
                                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.className}`}>
                                  {badge.label}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Non impostato</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.properties?.callbackNote ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-gray-500 text-xs max-w-[90px] truncate cursor-default">
                                  {c.properties.callbackNote}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[260px] whitespace-normal">
                                {c.properties.callbackNote}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetCallback(c);
                              }}
                            >
                              <CalendarClock className="h-3 w-3" />
                              {c.properties?.callbackAt ? "Modifica" : "Imposta"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
          </>
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

type CallbackBadgeProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
};

function CallbackBadge({ label, value, icon, color }: CallbackBadgeProps) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${color}`}>
      {icon}
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [owners, setOwners] = useState<UserType[]>([]);
  const [owner, setOwner] = usePersistedState<string>("dashboard:owner", "all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [callbackDialogOpen, setCallbackDialogOpen] = useState(false);
  const [selectedCallbackItem, setSelectedCallbackItem] = useState<DashboardListItem | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactSidebarOpen, setIsContactSidebarOpen] = useState(false);

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
      const res = await apiClient.getDashboard({ ownerId, limit: 100 });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || "Errore nel caricamento della dashboard");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  };

  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (isAuthenticated) {
      loadOwners();
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        loadDashboard(owner);
      } else {
        loadDashboard(owner);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleOpenCallbackDialog = (item: DashboardListItem) => {
    setSelectedCallbackItem(item);
    setCallbackDialogOpen(true);
  };

  const handleCallbackSaved = (_updatedContact: Contact) => {
    loadDashboard(owner);
  };

  const handleContactClick = async (id: string) => {
    try {
      const res = await apiClient.getContact(id);
      if (res.success && res.data) {
        setSelectedContact(res.data);
        setIsContactSidebarOpen(true);
      }
    } catch {
      // silent
    }
  };

  const handleCloseSidebar = () => {
    setIsContactSidebarOpen(false);
    setSelectedContact(null);
  };

  const handleContactUpdate = (updatedContact: Contact) => {
    setSelectedContact(updatedContact);
    loadDashboard(owner);
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
          <AlertDescription>Effettua il login per accedere alla dashboard.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const k = data?.kpis;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`transition-all duration-300 ${isContactSidebarOpen ? 'blur-sm' : ''}`}>
        <ModernSidebar />
      </div>

      <main className={`pl-16 transition-all duration-300 ${isContactSidebarOpen ? 'blur-sm' : ''}`}>
        <div className="container mx-auto py-6 px-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <LayoutDashboard className="h-6 w-6 text-blue-600" />
                Dashboard
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
              label="In stallo"
              description="Toccati ma ancora in 'Da contattare' o 'Interessato'."
              value={k?.stalled ?? "—"}
              icon={<Timer className="h-5 w-5 text-orange-600" />}
              borderColor="border-l-orange-500"
              iconBg="bg-orange-50"
              valueColor="text-orange-700"
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

          {/* Callback KPI badges */}
          {(k?.callbackOverdue ?? 0) + (k?.callbackToday ?? 0) + (k?.callbackNext7Days ?? 0) > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <PhoneCall className="h-4 w-4 text-blue-600" />
                Richiami
              </h2>
              <div className="flex flex-wrap gap-3">
                <CallbackBadge
                  label="Scaduti"
                  value={k?.callbackOverdue ?? 0}
                  icon={<Bell className="h-4 w-4" />}
                  color="bg-red-50 text-red-700"
                />
                <CallbackBadge
                  label="Oggi"
                  value={k?.callbackToday ?? 0}
                  icon={<CalendarClock className="h-4 w-4" />}
                  color="bg-amber-50 text-amber-700"
                />
                <CallbackBadge
                  label="7 giorni"
                  value={k?.callbackNext7Days ?? 0}
                  icon={<CalendarDays className="h-4 w-4" />}
                  color="bg-blue-50 text-blue-700"
                />
              </div>
            </div>
          )}

          {/* Operative Tables */}
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
              showCloseDate
              onContactClick={handleContactClick}
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
              showCloseDate
              onContactClick={handleContactClick}
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
              hideMrr
              showSource
              showAge
              onContactClick={handleContactClick}
            />

            <ThemedLeadsTable
              title="In stallo"
              count={data?.lists.stalled?.length || 0}
              items={data?.lists.stalled || []}
              headerBg="bg-orange-50"
              headerText="text-orange-800"
              badgeBg="bg-orange-100"
              badgeText="text-orange-700"
              accentBorder="border-t-orange-500"
              emptyIcon={<Timer className="h-8 w-8" />}
              emptyMessage="Nessun lead in stallo — ottimo ritmo!"
              hideMrr
              showSource
              showAge
              ageFrom="lastActivityAt"
              onContactClick={handleContactClick}
            />

            <ThemedLeadsTable
              title="Won"
              count={data?.lists.won?.length || 0}
              items={data?.lists.won || []}
              headerBg="bg-green-50"
              headerText="text-green-800"
              badgeBg="bg-green-100"
              badgeText="text-green-700"
              accentBorder="border-t-green-600"
              emptyIcon={<Trophy className="h-8 w-8" />}
              emptyMessage="Nessun deal vinto — il prossimo è dietro l'angolo!"
              onContactClick={handleContactClick}
            />

            <CallbackTable
              items={data?.lists.callback || []}
              onSetCallback={handleOpenCallbackDialog}
              onContactClick={handleContactClick}
            />
          </div>
        </div>
      </main>

      {/* Callback Dialog */}
      {selectedCallbackItem && (
        <CallbackDialog
          open={callbackDialogOpen}
          onOpenChange={setCallbackDialogOpen}
          contactId={selectedCallbackItem._id}
          contactName={selectedCallbackItem.name}
          currentCallbackAt={selectedCallbackItem.properties?.callbackAt}
          currentCallbackNote={selectedCallbackItem.properties?.callbackNote}
          onSaved={handleCallbackSaved}
        />
      )}

      {/* Sidebar dettaglio contatto */}
      <ContactDetailSidebar
        contact={selectedContact}
        isOpen={isContactSidebarOpen}
        onClose={handleCloseSidebar}
        onContactUpdate={handleContactUpdate}
      />
    </div>
  );
}
