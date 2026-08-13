"use client";

import {
  CALLBACK_SHORTCUTS,
  CALLBACK_TIME_SLOTS,
  formatShortcutLabel,
  toDateStr,
} from "@/lib/callback-schedule";

interface DialerCallbackPickerProps {
  dateStr: string;
  timeStr: string;
  required?: boolean;
  disabled?: boolean;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

export function DialerCallbackPicker({
  dateStr,
  timeStr,
  required = false,
  disabled = false,
  onDateChange,
  onTimeChange,
}: DialerCallbackPickerProps) {
  return (
    <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2">
      <p className="text-xs font-semibold text-blue-900">
        Richiamo {required ? "(obbligatorio)" : "(opzionale)"}
        {dateStr ? (
          <span className="ml-1 font-medium text-blue-700">
            — {formatShortcutLabel(dateStr)} alle {timeStr}
          </span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {CALLBACK_SHORTCUTS.map((s) => {
          const sDate = toDateStr(s.getDate());
          const isActive = dateStr === sDate;
          return (
            <button
              key={s.label}
              type="button"
              disabled={disabled}
              onClick={() => onDateChange(sDate)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${
                isActive
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-blue-200 bg-white text-blue-800 hover:border-blue-400"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-medium text-blue-800">Data</label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => onDateChange(e.target.value)}
            disabled={disabled}
            className="flex h-8 w-full rounded-md border border-blue-200 bg-white px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-[11px] font-medium text-blue-800">Ora</label>
          <select
            value={timeStr}
            onChange={(e) => onTimeChange(e.target.value)}
            disabled={disabled}
            className="flex h-8 w-full rounded-md border border-blue-200 bg-white px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {CALLBACK_TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
