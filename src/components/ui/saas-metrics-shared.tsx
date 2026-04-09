"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart, Line, ResponsiveContainer,
} from "recharts";

export const COLORS = {
  new: "#2dd4bf",
  reactivation: "#0d9488",
  expansion: "#a7f3d0",
  existing: "#0891b2",
  contraction: "#fb923c",
  voluntaryChurn: "#ef4444",
  delinquentChurn: "#dc2626",
};

export const PLAN_COLORS = [
  "#0d9488", "#0891b2", "#2dd4bf", "#6366f1", "#8b5cf6",
  "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#a855f7",
];

export function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function fmtEur(v: number) {
  return `€${v.toLocaleString("it-IT")}`;
}

export function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${months[parseInt(mo) - 1]} ${y.slice(2)}`;
}

export function KpiCard({ title, value, prevValue, format = "eur", sparkData, sparkKey = "mrr", invertColor = false }: {
  title: string; value: number; prevValue: number;
  format?: "eur" | "num"; sparkData?: { month: string; mrr: number; customers: number }[];
  sparkKey?: "mrr" | "customers"; invertColor?: boolean;
}) {
  const pct = pctChange(value, prevValue);
  const isPositive = invertColor ? pct <= 0 : pct >= 0;
  const formatted = format === "eur" ? fmtEur(value) : value.toLocaleString("it-IT");

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-gray-900">{formatted}</span>
          {prevValue !== undefined && pct !== 0 && (
            <span className={`flex items-center text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
              {pct > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(pct)}%
            </span>
          )}
          {pct === 0 && <span className="flex items-center text-xs text-gray-400"><Minus className="w-3 h-3 mr-0.5" />0%</span>}
        </div>
        {sparkData && sparkData.length > 1 && (
          <div className="mt-3 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey={sparkKey} stroke={isPositive ? "#10b981" : "#ef4444"} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
