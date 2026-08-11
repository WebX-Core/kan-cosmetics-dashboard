import React from "react";
import { Award, Crown, Medal, Trophy } from "lucide-react";
import type { RewardStatus } from "@/features/loyalty";

export const text = (value: unknown, fallback = "—") => typeof value === "string" && value.trim() ? value : fallback;
export const number = (value: unknown) => typeof value === "number" ? value : Number(value ?? 0) || 0;
export const date = (value: unknown) => { const raw = text(value, ""); if (!raw) return "—"; const parsed = new Date(raw); return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(parsed); };
export const customerName = (value: unknown) => { const row = typeof value === "object" && value !== null ? value as Record<string, unknown> : {}; return [row.firstname, row.middlename, row.lastname].map((item) => text(item, "")).filter(Boolean).join(" ") || text(row.name, "Unknown customer"); };

export const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const Icon = rank === 1 ? Crown : rank <= 3 ? Medal : Trophy;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${rank === 1 ? "bg-amber-100 text-amber-800" : rank <= 3 ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-700"}`}><Icon size={13} />#{rank}</span>;
};
export const TierBadge: React.FC<{ code?: string }> = ({ code }) => <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700"><Award size={12} />{code || "UNASSIGNED"}</span>;
export const RewardBadge: React.FC<{ status?: RewardStatus | string }> = ({ status = "PENDING" }) => {
  const cls = status === "FULFILLED" || status === "REDEEMED" ? "bg-emerald-50 text-emerald-700" : status === "EXPIRED" ? "bg-red-50 text-red-700" : status === "ASSIGNED" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{status}</span>;
};
