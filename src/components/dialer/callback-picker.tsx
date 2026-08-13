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
  disabled?: boolean;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

export function DialerCallbackPicker({
  dateStr,
  timeStr,
  disabled = false,
  onDateChange,
  onTimeChange,
}: DialerCallbackPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-700">
        Quando richiami?
        {dateStr ? (
          <span className="ml-1 text-blue-700">
            {formatShortcutLabel(dateStr)} · {timeStr}
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
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                isActive
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          type="date"
          aria-label="Data richiamo"
          value={dateStr}
          onChange={(e) => onDateChange(e.target.value)}
          disabled={disabled}
          className="flex h-9 min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        <select
          aria-label="Ora richiamo"
          value={timeStr}
          onChange={(e) => onTimeChange(e.target.value)}
          disabled={disabled}
          className="flex h-9 w-28 rounded-md border border-gray-200 bg-white px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {CALLBACK_TIME_SLOTS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
