"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { ContactSource, ContactStatus, User } from "@/types/contact";
import { getAllStatuses, getStatusLabel } from "@/lib/status-utils";

const SOURCE_OPTIONS: { value: ContactSource; label: string }[] = [
  { value: "manual", label: "Manuale" },
  { value: "referral", label: "Referral" },
  { value: "inbound_rank_checker", label: "Rank Checker Inbound" },
  { value: "csv_import", label: "CSV Import" },
  { value: "smartlead_outbound", label: "Smartlead Outbound" },
];

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateContactDialog({ open, onOpenChange, onCreated }: CreateContactDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<ContactSource>("manual");
  const [status, setStatus] = useState<ContactStatus>("da contattare");
  const [owner, setOwner] = useState<string>("");
  const [mrr, setMrr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    if (open) {
      apiClient.getUsers({ limit: 100 }).then((res) => {
        if (res.success && res.data?.users) {
          setAvailableUsers(res.data.users.filter((u) => u.isActive));
        }
      });
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setSource("manual");
    setStatus("da contattare");
    setOwner("");
    setMrr("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Il nome è obbligatorio");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: Record<string, unknown> = {
        name: name.trim(),
        source,
        status,
      };
      if (email.trim()) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (owner) payload.owner = owner;
      if (mrr) payload.mrr = Number(mrr);

      const res = await apiClient.createContact(payload);
      if (res.success) {
        resetForm();
        onOpenChange(false);
        onCreated();
      } else {
        setError(res.message || "Errore nella creazione del contatto");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Nuovo contatto
          </DialogTitle>
          <DialogDescription>Inserisci i dati del nuovo contatto.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Nome *</label>
            <Input
              placeholder="Nome e cognome o nome attività"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                placeholder="email@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Telefono</label>
              <Input
                placeholder="+39 ..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Sorgente</label>
              <Select value={source} onValueChange={(v) => setSource(v as ContactSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Stato</label>
              <Select value={status} onValueChange={(v) => setStatus(v as ContactStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAllStatuses().map((s) => (
                    <SelectItem key={s} value={s}>
                      {getStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Owner</label>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger>
                  <SelectValue placeholder="Non assegnato" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.firstName} {u.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">MRR (€)</label>
              <Input
                type="number"
                placeholder="0"
                min={0}
                value={mrr}
                onChange={(e) => setMrr(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Crea contatto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
