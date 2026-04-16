"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiClient, AssignmentConfig, SourceRule } from "@/lib/api";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { User } from "@/types/contact";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserWithId = User & { _id: string };

type EditableSourceRule = {
  id: string; // local key for React
  source: string;
  strategy: "specific" | "round_robin";
  userId: string;
  userIds: string[];
};

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "inbound_rank_checker", label: "Rank Checker" },
  { value: "inbound_acquisition", label: "WhatsApp Acquisition" },
  { value: "inbound_prova_gratuita", label: "Prova Gratuita" },
  { value: "inbound_form", label: "Form Inbound" },
  { value: "inbound_api", label: "API Inbound" },
  { value: "smartlead_outbound", label: "Smartlead Outbound" },
  { value: "referral", label: "Referral" },
];

// ─── Sortable user chip ───────────────────────────────────────────────────────

function SortableUserChip({
  id,
  user,
  onRemove,
}: {
  id: string;
  user: UserWithId;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm"
    >
      <button
        className="cursor-grab text-gray-400 hover:text-gray-600 touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
        {user.firstName?.[0]}{user.lastName?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
      </div>
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-red-500 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── User selector dropdown ───────────────────────────────────────────────────

function UserSelector({
  allUsers,
  excludeIds,
  placeholder,
  onSelect,
}: {
  allUsers: UserWithId[];
  excludeIds: string[];
  placeholder: string;
  onSelect: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = allUsers.filter((u) => !excludeIds.includes(u._id));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={available.length === 0}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        <Plus className="h-4 w-4" />
        {placeholder}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && available.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-56 py-1">
            {available.map((u) => (
              <button
                key={u._id}
                onClick={() => {
                  onSelect(u._id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Source rule row ──────────────────────────────────────────────────────────

function SourceRuleRow({
  rule,
  allUsers,
  usedSources,
  onChange,
  onRemove,
}: {
  rule: EditableSourceRule;
  allUsers: UserWithId[];
  usedSources: string[];
  onChange: (updated: EditableSourceRule) => void;
  onRemove: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const availableSources = SOURCE_OPTIONS.filter(
    (s) => s.value === rule.source || !usedSources.includes(s.value)
  );

  const getUserById = (id: string) => allUsers.find((u) => u._id === id);

  const handleDragEndRR = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = rule.userIds.indexOf(String(active.id));
      const newIdx = rule.userIds.indexOf(String(over.id));
      onChange({ ...rule, userIds: arrayMove(rule.userIds, oldIdx, newIdx) });
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-3">
        {/* Source selector */}
        <select
          value={rule.source}
          onChange={(e) => onChange({ ...rule, source: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 max-w-52"
        >
          {availableSources.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <span className="text-gray-400 text-sm">→</span>

        {/* Strategy selector */}
        <select
          value={rule.strategy}
          onChange={(e) =>
            onChange({
              ...rule,
              strategy: e.target.value as "specific" | "round_robin",
              userId: "",
              userIds: [],
            })
          }
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="specific">Persona specifica</option>
          <option value="round_robin">Round-robin</option>
        </select>

        <button
          onClick={onRemove}
          className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* User selection area */}
      {rule.strategy === "specific" ? (
        <div className="flex items-center gap-2">
          {rule.userId && getUserById(rule.userId) ? (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                {getUserById(rule.userId)!.firstName?.[0]}
                {getUserById(rule.userId)!.lastName?.[0]}
              </div>
              <span className="text-sm text-gray-900">
                {getUserById(rule.userId)!.firstName}{" "}
                {getUserById(rule.userId)!.lastName}
              </span>
              <button
                onClick={() => onChange({ ...rule, userId: "" })}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <UserSelector
              allUsers={allUsers}
              excludeIds={[]}
              placeholder="Seleziona utente"
              onSelect={(id) => onChange({ ...rule, userId: id })}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndRR}
          >
            <SortableContext
              items={rule.userIds}
              strategy={verticalListSortingStrategy}
            >
              {rule.userIds.map((uid) => {
                const u = getUserById(uid);
                if (!u) return null;
                return (
                  <SortableUserChip
                    key={uid}
                    id={uid}
                    user={u}
                    onRemove={() =>
                      onChange({
                        ...rule,
                        userIds: rule.userIds.filter((id) => id !== uid),
                      })
                    }
                  />
                );
              })}
            </SortableContext>
          </DndContext>
          <UserSelector
            allUsers={allUsers}
            excludeIds={rule.userIds}
            placeholder="Aggiungi utente al pool"
            onSelect={(id) =>
              onChange({ ...rule, userIds: [...rule.userIds, id] })
            }
          />
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [allUsers, setAllUsers] = useState<UserWithId[]>([]);
  const [globalRR, setGlobalRR] = useState<string[]>([]);
  const [sourceRules, setSourceRules] = useState<EditableSourceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  // Load config + users
  useEffect(() => {
    const load = async () => {
      try {
        const [configRes, usersRes] = await Promise.all([
          apiClient.getAssignmentConfig(),
          apiClient.getUsers({ limit: 100 }),
        ]);

        if (usersRes.success && usersRes.data) {
          setAllUsers((usersRes.data.users || []) as UserWithId[]);
        }

        if (configRes.success && configRes.data) {
          const cfg = configRes.data as AssignmentConfig;
          setGlobalRR(
            (cfg.globalRoundRobin as UserWithId[]).map((u) => u._id)
          );
          setSourceRules(
            cfg.sourceRules.map((r, i) => ({
              id: `rule-${i}-${Date.now()}`,
              source: r.source,
              strategy: r.strategy,
              userId: typeof r.userId === "object" && r.userId
                ? (r.userId as UserWithId)._id
                : (r.userId as string) || "",
              userIds: Array.isArray(r.userIds)
                ? r.userIds.map((u) =>
                    typeof u === "object" ? (u as UserWithId)._id : u
                  )
                : [],
            }))
          );
        }
      } catch (err) {
        console.error("Error loading config:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getUserById = useCallback(
    (id: string) => allUsers.find((u) => u._id === id),
    [allUsers]
  );

  const handleDragEndGlobal = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setGlobalRR((prev) => {
        const oldIdx = prev.indexOf(String(active.id));
        const newIdx = prev.indexOf(String(over.id));
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const addSourceRule = () => {
    const usedSources = sourceRules.map((r) => r.source);
    const firstAvailable = SOURCE_OPTIONS.find(
      (s) => !usedSources.includes(s.value)
    );
    if (!firstAvailable) return;
    setSourceRules((prev) => [
      ...prev,
      {
        id: `rule-new-${Date.now()}`,
        source: firstAvailable.value,
        strategy: "round_robin",
        userId: "",
        userIds: [],
      },
    ]);
  };

  const save = async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const payload = {
        globalRoundRobin: globalRR,
        sourceRules: sourceRules.map(({ source, strategy, userId, userIds }) => ({
          source,
          strategy,
          userId: strategy === "specific" ? userId || null : null,
          userIds: strategy === "round_robin" ? userIds : [],
        })),
      };

      const res = await apiClient.updateAssignmentConfig(payload);
      if (!res.success) throw new Error("Salvataggio fallito");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const usedSources = sourceRules.map((r) => r.source);

  if (loading) {
    return (
      <div className="flex h-screen">
        <ModernSidebar />
        <div className="ml-16 flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <ModernSidebar />

      <main className="ml-16 flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
              <p className="text-sm text-gray-500 mt-1">Visibile solo agli admin</p>
            </div>
            <Button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salva modifiche
            </Button>
          </div>

          {/* Status feedback */}
          {status === "saved" && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
              <CheckCircle className="h-4 w-4" />
              Impostazioni salvate correttamente.
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4" />
              Errore durante il salvataggio. Riprova.
            </div>
          )}

          {/* ── Sezione 1: Pool globale ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pool Round-Robin Globale</CardTitle>
              <p className="text-sm text-gray-500">
                I lead senza una regola specifica vengono assegnati a turno agli utenti
                in questo pool. Trascina per cambiare l'ordine di rotazione.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndGlobal}
              >
                <SortableContext
                  items={globalRR}
                  strategy={verticalListSortingStrategy}
                >
                  {globalRR.map((uid) => {
                    const u = getUserById(uid);
                    if (!u) return null;
                    return (
                      <SortableUserChip
                        key={uid}
                        id={uid}
                        user={u}
                        onRemove={() =>
                          setGlobalRR((prev) => prev.filter((id) => id !== uid))
                        }
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>

              {globalRR.length === 0 && (
                <p className="text-sm text-gray-400 italic py-2">
                  Nessun utente nel pool — aggiungi almeno un utente.
                </p>
              )}

              <UserSelector
                allUsers={allUsers}
                excludeIds={globalRR}
                placeholder="Aggiungi utente al pool"
                onSelect={(id) => setGlobalRR((prev) => [...prev, id])}
              />
            </CardContent>
          </Card>

          {/* ── Sezione 2: Regole per source ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regole per Source</CardTitle>
              <p className="text-sm text-gray-500">
                Puoi assegnare ogni source a una persona specifica o a un pool
                round-robin dedicato. Le source non elencate usano il pool globale.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {sourceRules.map((rule) => (
                <SourceRuleRow
                  key={rule.id}
                  rule={rule}
                  allUsers={allUsers}
                  usedSources={usedSources.filter((s) => s !== rule.source)}
                  onChange={(updated) =>
                    setSourceRules((prev) =>
                      prev.map((r) => (r.id === rule.id ? updated : r))
                    )
                  }
                  onRemove={() =>
                    setSourceRules((prev) => prev.filter((r) => r.id !== rule.id))
                  }
                />
              ))}

              {usedSources.length < SOURCE_OPTIONS.length ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSourceRule}
                  className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4" />
                  Aggiungi regola
                </Button>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Tutte le source hanno già una regola.
                </p>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
