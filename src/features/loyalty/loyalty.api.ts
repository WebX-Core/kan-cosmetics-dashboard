import { api, unwrap } from "@/shared/api/api";
import type { CreateTierDto, LoyaltyCustomer, LoyaltyList, LoyaltyQuery, LoyaltyTier, ResetYearlyCycleDto, UpdateTierDto } from "./loyalty.types";

const BASE = "/customer-loyalty/admin";
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeList = <T>(payload: unknown): LoyaltyList<T> => {
  if (Array.isArray(payload)) return { data: payload as T[], total: payload.length, totalPages: 1 };
  if (!isRecord(payload)) return { data: [] };
  const body = isRecord(payload.data) ? payload.data : payload;
  const arrays = [body.items, body.data, body.customers, body.tiers, payload.items].find(Array.isArray);
  const rows = (arrays ?? []) as T[];
  return {
    data: rows,
    page: typeof body.page === "number" ? body.page : undefined,
    limit: typeof body.limit === "number" ? body.limit : undefined,
    total: typeof body.total === "number" ? body.total : rows.length,
    totalPages: typeof body.totalPages === "number" ? body.totalPages : 1,
  };
};

export const loyaltyApi = {
  tiers: {
    list: async () => normalizeList<LoyaltyTier>(unwrap<unknown>(await api.get(`${BASE}/tiers`))),
    create: async (dto: CreateTierDto) => unwrap<LoyaltyTier>(await api.post(`${BASE}/tiers`, dto)),
    update: async (id: string, dto: UpdateTierDto) => unwrap<LoyaltyTier>(await api.patch(`${BASE}/tiers/${id}`, dto)),
    remove: async (id: string) => unwrap<unknown>(await api.delete(`${BASE}/tiers/${id}`)),
  },
  customers: {
    list: async (query?: LoyaltyQuery) => normalizeList<LoyaltyCustomer>(unwrap<unknown>(await api.get(`${BASE}/customers`, { params: query }))),
  },
  resetYearlyCycle: async (dto: ResetYearlyCycleDto) => unwrap<unknown>(await api.post(`${BASE}/reset-yearly-cycle`, dto)),
};
