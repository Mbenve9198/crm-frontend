export const CALLBACK_TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  CALLBACK_TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 20) CALLBACK_TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

export function toDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeStr(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const roundedM = m < 30 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${roundedM}`;
}

/** Prossimo slot da 30 minuti, sempre nel futuro (dopo le 20:00 → domani 08:00). */
export function nextCallbackDateTime(from = new Date()): { dateStr: string; timeStr: string } {
  const d = new Date(from);
  let h = d.getHours();
  let m = d.getMinutes();
  if (m < 30) {
    m = 30;
  } else {
    h += 1;
    m = 0;
  }
  if (h < 8) {
    return { dateStr: toDateStr(d), timeStr: "08:00" };
  }
  if (h > 20 || (h === 20 && m > 0)) {
    const tomorrow = new Date(d);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { dateStr: toDateStr(tomorrow), timeStr: "08:00" };
  }
  return {
    dateStr: toDateStr(d),
    timeStr: `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`,
  };
}

export function getNextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 1 ? 7 : (1 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

export function formatShortcutLabel(dateStr: string): string {
  const today = toDateStr(new Date());
  const tomorrow = toDateStr(addDays(1));
  if (dateStr === today) return "oggi";
  if (dateStr === tomorrow) return "domani";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

export const CALLBACK_SHORTCUTS = [
  { label: "Oggi", getDate: () => addDays(0) },
  { label: "Domani", getDate: () => addDays(1) },
  { label: "Tra 3 giorni", getDate: () => addDays(3) },
  { label: "Lunedì prossimo", getDate: getNextMonday },
];

export function buildCallbackIso(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

export function formatCallbackAt(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isCallbackDue(iso?: string | null, now = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= now.getTime();
}
