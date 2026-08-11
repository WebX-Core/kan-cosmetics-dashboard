import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loyaltyApi } from "./loyalty.api";
import type { AdjustPointsDto, CreateTierDto, FulfillRewardDto, LoyaltyQuery, ResetYearlyCycleDto, UpdateTierDto } from "./loyalty.types";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ["loyalty"] });
export const useLoyaltyTiers = () => useQuery({ queryKey: ["loyalty", "tiers"], queryFn: loyaltyApi.tiers.list });
export const useLoyaltyCustomers = (query?: LoyaltyQuery) => useQuery({ queryKey: ["loyalty", "customers", query], queryFn: () => loyaltyApi.customers.list(query), placeholderData: keepPreviousData });
export const useLoyaltyCustomer = (id?: string) => useQuery({ queryKey: ["loyalty", "customer", id], queryFn: () => loyaltyApi.customers.get(id as string), enabled: Boolean(id) });
export const useLoyaltyRewards = (query?: LoyaltyQuery) => useQuery({ queryKey: ["loyalty", "rewards", query], queryFn: () => loyaltyApi.rewards.list(query), placeholderData: keepPreviousData });

const useLoyaltyMutation = <T,>(mutationFn: (vars: T) => Promise<unknown>, message: string) => {
  const qc = useQueryClient(); const toast = useToast();
  return useMutation({ mutationFn, onSuccess: () => { void invalidateAll(qc); toast.success(message); }, onError: (error) => toast.error(parseApiError(error).message) });
};
export const useCreateLoyaltyTier = () => useLoyaltyMutation((dto: CreateTierDto) => loyaltyApi.tiers.create(dto), "Loyalty tier created.");
export const useUpdateLoyaltyTier = () => useLoyaltyMutation(({ id, dto }: { id: string; dto: UpdateTierDto }) => loyaltyApi.tiers.update(id, dto), "Loyalty tier updated.");
export const useDeleteLoyaltyTier = () => useLoyaltyMutation((id: string) => loyaltyApi.tiers.remove(id), "Loyalty tier deleted.");
export const useAdjustLoyaltyPoints = () => useLoyaltyMutation(({ customerId, dto }: { customerId: string; dto: AdjustPointsDto }) => loyaltyApi.customers.adjustPoints(customerId, dto), "Customer points adjusted.");
export const useFulfillLoyaltyReward = () => useLoyaltyMutation(({ id, dto }: { id: string; dto: FulfillRewardDto }) => loyaltyApi.rewards.fulfill(id, dto), "Reward updated.");
export const useResetYearlyCycle = () => useLoyaltyMutation((dto: ResetYearlyCycleDto) => loyaltyApi.resetYearlyCycle(dto), "Yearly loyalty cycle reset.");
