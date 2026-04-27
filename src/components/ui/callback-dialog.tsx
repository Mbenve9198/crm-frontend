"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Loader2, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Contact } from "@/types/contact";

interface CallbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  currentCallbackAt?: string | null;
  currentCallbackNote?: string | null;
  onSaved: (updatedContact: Contact) => void;
}

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 20) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

function toDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeStr(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const roundedM = m < 30 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${roundedM}`;
}

function getNextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 1 ? 7 : (1 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function formatShortcutLabel(dateStr: string): string {
  const today = toDateStr(new Date());
  const tomorrow = toDateStr(addDays(1));
  if (dateStr === today) return "oggi";
  if (dateStr === tomorrow) return "domani";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

const SHORTCUTS = [
  { label: "Oggi",           getDate: () => addDays(0) },
  { label: "Domani",         getDate: () => addDays(1) },
  { label: "Tra 3 giorni",   getDate: () => addDays(3) },
  { label: "Lunedì prossimo", getDate: getNextMonday },
];

export function CallbackDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  currentCallbackAt,
  currentCallbackNote,
  onSaved,
}: CallbackDialogProps) {
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("09:00");
  const [noteValue, setNoteValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (open) {
      if (currentCallbackAt) {
        const d = new Date(currentCallbackAt);
        if (!isNaN(d.getTime())) {
          setDateStr(toDateStr(d));
          setTimeStr(toTimeStr(d));
        } else {
          setDateStr("");
          setTimeStr("09:00");
        }
      } else {
        setDateStr("");
        setTimeStr("09:00");
      }
      setNoteValue(currentCallbackNote || "");
    }
  }, [open, currentCallbackAt, currentCallbackNote]);

  const applyShortcut = (getDate: () => Date) => {
    const d = getDate();
    setDateStr(toDateStr(d));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      let callbackAt: string | null = null;
      if (dateStr) {
        callbackAt = new Date(`${dateStr}T${timeStr}:00`).toISOString();
      }
      const callbackNote = noteValue.trim() || null;
      const res = await apiClient.updateContactCallback(contactId, { callbackAt, callbackNote });
      if (res.success && res.data) {
        onSaved(res.data);
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Errore salvataggio callback:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsRemoving(true);
      const res = await apiClient.updateContactCallback(contactId, { callbackAt: null, callbackNote: null });
      if (res.success && res.data) {
        onSaved(res.data);
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Errore rimozione callback:", err);
    } finally {
      setIsRemoving(false);
    }
  };

  const busy = isSaving || isRemoving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Imposta richiamo</DialogTitle>
          <DialogDescription>
            Richiamo per <strong>{contactName}</strong>
            {dateStr && (
              <span className="ml-1 text-blue-600 font-medium">
                — {formatShortcutLabel(dateStr)} alle {timeStr}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Scelte rapide */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Scelta rapida</p>
            <div className="flex flex-wrap gap-2">
              {SHORTCUTS.map((s) => {
                const sDate = toDateStr(s.getDate());
                const isActive = dateStr === sDate;
                return (
                  <button
                    key={s.label}
                    type="button"
                    disabled={busy}
                    onClick={() => applyShortcut(s.getDate)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data + Ora */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-1">Data</label>
              <input
                type="date"
                className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="w-32">
              <label className="text-sm font-medium text-gray-700 block mb-1">Ora</label>
              <select
                className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                disabled={busy}
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Nota */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Nota <span className="text-gray-400 font-normal">(max 300 caratteri)</span>
            </label>
            <Textarea
              placeholder="Aggiungi una nota sul richiamo..."
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value.slice(0, 300))}
              rows={3}
              disabled={busy}
              maxLength={300}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{noteValue.length}/300</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          {(currentCallbackAt || currentCallbackNote) && (
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 mr-auto"
              onClick={handleRemove}
              disabled={busy}
            >
              {isRemoving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Rimuovi
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={busy || !dateStr}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
