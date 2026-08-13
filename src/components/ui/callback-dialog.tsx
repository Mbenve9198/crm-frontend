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
import { DialerCallbackPicker } from "@/components/dialer/callback-picker";
import { buildCallbackIso, formatShortcutLabel, toDateStr, toTimeStr } from "@/lib/callback-schedule";

interface CallbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  currentCallbackAt?: string | null;
  currentCallbackNote?: string | null;
  onSaved: (updatedContact: Contact) => void;
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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const callbackAt = dateStr ? buildCallbackIso(dateStr, timeStr) : null;
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
          <DialerCallbackPicker
            dateStr={dateStr}
            timeStr={timeStr}
            disabled={busy}
            onDateChange={setDateStr}
            onTimeChange={setTimeStr}
          />

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
