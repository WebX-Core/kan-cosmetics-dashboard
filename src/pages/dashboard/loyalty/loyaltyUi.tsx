import React from "react";
import { Award, Crown, Medal, Trophy } from "lucide-react";

export const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const Icon = rank === 1 ? Crown : rank <= 3 ? Medal : Trophy;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${rank === 1 ? "bg-amber-100 text-amber-800" : rank <= 3 ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-700"}`}><Icon size={13} />#{rank}</span>;
};
export const TierBadge: React.FC<{ code?: string | null }> = ({ code }) => <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700"><Award size={12} />{code || "UNASSIGNED"}</span>;
