import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { billingApi } from "./billing.api";
import type { CompanySettingDto } from "./billing.types";

export const useCompanySettings = (params?: { page?: number; limit?: number; search?: string }) => useQuery({ queryKey: ["billing", "company-settings", params], queryFn: () => billingApi.companySettings.all(params), placeholderData: keepPreviousData });
export const useActiveCompanySetting = () => useQuery({ queryKey: ["billing", "company-settings", "active"], queryFn: billingApi.companySettings.active, retry: false });
export const useSaveCompanySetting = () => { const qc = useQueryClient(); const toast = useToast(); return useMutation({ mutationFn: ({ id, dto }: { id?: string; dto: CompanySettingDto }) => id ? billingApi.companySettings.update(id, dto) : billingApi.companySettings.create(dto), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["billing", "company-settings"] }); toast.success("Company setting saved."); }, onError: (error) => toast.error(parseApiError(error).message) }); };
export const useDeleteCompanySetting = () => { const qc = useQueryClient(); const toast = useToast(); return useMutation({ mutationFn: billingApi.companySettings.remove, onSuccess: () => { void qc.invalidateQueries({ queryKey: ["billing", "company-settings"] }); toast.success("Company setting deleted."); }, onError: (error) => toast.error(parseApiError(error).message) }); };
export const useDeletedCompanySettings = (enabled = false) => useQuery({ queryKey: ["billing", "company-settings", "deleted"], queryFn: billingApi.companySettings.deleted, enabled });
export const useRecoverCompanySettings = () => { const qc = useQueryClient(); const toast = useToast(); return useMutation({ mutationFn: billingApi.companySettings.recover, onSuccess: () => { void qc.invalidateQueries({ queryKey: ["billing", "company-settings"] }); toast.success("Company setting recovered."); }, onError: (error) => toast.error(parseApiError(error).message) }); };
export const useDestroyCompanySetting = () => { const qc = useQueryClient(); const toast = useToast(); return useMutation({ mutationFn: billingApi.companySettings.destroy, onSuccess: () => { void qc.invalidateQueries({ queryKey: ["billing", "company-settings"] }); toast.success("Company setting permanently deleted."); }, onError: (error) => toast.error(parseApiError(error).message) }); };
