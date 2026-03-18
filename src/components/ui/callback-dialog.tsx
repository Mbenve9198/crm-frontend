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

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CallbackDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  currentCallbackAt,
  currentCallbackNote,
  onSaved,
}: CallbackDialogProps) {
  const [dateValue, setDateValue] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (open) {
      setDateValue(toDatetimeLocalValue(currentCallbackAt));
      setNoteValue(currentCallbackNote || "");
    }
  }, [open, currentCallbackAt, currentCallbackNote]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const callbackAt = dateValue ? new Date(dateValue).toISOString() : null;
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
            Programma data/ora e nota per il richiamo di <strong>{contactName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Data e ora
            </label>
            <input
              type="datetime-local"
              className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              disabled={busy}
            />
          </div>

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
          <Button onClick={handleSave} disabled={busy}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
