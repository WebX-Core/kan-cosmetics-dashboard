import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loyaltyApi } from "./loyalty.api";
import type { CreateTierDto, LoyaltyPointsQuery, LoyaltyQuery, ResetYearlyCycleDto, UpdateLoyaltySettingsDto, UpdateTierDto } from "./loyalty.types";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ["loyalty"] });
export const useLoyaltyTiers = () => useQuery({ queryKey: ["loyalty", "tiers"], queryFn: loyaltyApi.tiers.list });
export const useLoyaltyCustomers = (query?: LoyaltyQuery) => useQuery({ queryKey: ["loyalty", "customers", query], queryFn: () => loyaltyApi.customers.list(query), placeholderData: keepPreviousData });
export const useLoyaltySettings = () => useQuery({ queryKey: ["loyalty", "settings"], queryFn: loyaltyApi.settings.get });
export const useLoyaltyPoints = (query?: LoyaltyPointsQuery) => useQuery({ queryKey: ["loyalty", "points", query], queryFn: () => loyaltyApi.points.list(query), placeholderData: keepPreviousData });

const useLoyaltyMutation = <T,>(mutationFn: (vars: T) => Promise<unknown>, message: string) => {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({ mutationFn, onSuccess: () => { void invalidateAll(qc); toast.success(message); }, onError: (error) => toast.error(parseApiError(error).message) });
};
export const useCreateLoyaltyTier = () => useLoyaltyMutation((dto: CreateTierDto) => loyaltyApi.tiers.create(dto), "Loyalty tier created.");
export const useUpdateLoyaltyTier = () => useLoyaltyMutation(({ id, dto }: { id: string; dto: UpdateTierDto }) => loyaltyApi.tiers.update(id, dto), "Loyalty tier updated.");
export const useDeleteLoyaltyTier = () => useLoyaltyMutation((id: string) => loyaltyApi.tiers.remove(id), "Loyalty tier deleted.");
export const useResetYearlyCycle = () => useLoyaltyMutation((dto: ResetYearlyCycleDto) => loyaltyApi.resetYearlyCycle(dto), "Yearly loyalty cycle reset.");
export const useUpdateLoyaltySettings = () => useLoyaltyMutation((dto: UpdateLoyaltySettingsDto) => loyaltyApi.settings.update(dto), "Loyalty settings updated.");
