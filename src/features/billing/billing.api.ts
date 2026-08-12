import { api, toFormData, unwrap } from "@/shared/api/api";
import type { BillPayload, BillType, BulkBillPayload, CompanySetting, CompanySettingDto } from "./billing.types";

const companyBody = (dto: CompanySettingDto) => {
  const { logo, ...fields } = dto;
  return toFormData(fields, { logo });
};

export const billingApi = {
  companySettings: {
    all: async (params?: { page?: number; limit?: number; search?: string }) => unwrap<{ settings: CompanySetting[]; total: number; page: number; limit: number; totalPages: number }>(await api.get("/company-setting/get-all", { params })),
    active: async () => unwrap<CompanySetting>(await api.get("/company-setting/active")),
    get: async (id: string) => unwrap<CompanySetting>(await api.get(`/company-setting/get/${id}`)),
    create: async (dto: CompanySettingDto) => unwrap<{ id: string }>(await api.post("/company-setting/create", companyBody(dto), { headers: { "Content-Type": "multipart/form-data" } })),
    update: async (id: string, dto: CompanySettingDto) => unwrap<unknown>(await api.put(`/company-setting/update/${id}`, companyBody(dto), { headers: { "Content-Type": "multipart/form-data" } })),
    remove: async (id: string) => unwrap<unknown>(await api.delete(`/company-setting/delete/${id}`)),
    deleted: async () => unwrap<unknown>(await api.get("/company-setting/deleted")),
    recover: async (ids: ReadonlyArray<string>) => unwrap<unknown>(await api.put("/company-setting/recover", { ids })),
    destroy: async (id: string) => unwrap<unknown>(await api.delete(`/company-setting/destroy/${id}`)),
  },
  bills: {
    get: async (orderId: string, billType: BillType) => unwrap<BillPayload>(await api.get(`/order-bill/get/${orderId}`, { params: { billType } })),
    bulk: async (orderIds: ReadonlyArray<string>, billType: BillType) => unwrap<BulkBillPayload>(await api.post("/order-bill/bulk", { orderIds, billType })),
    markPrinted: async (orderId: string, billType: BillType) => unwrap<unknown>(await api.post(`/order-bill/mark-printed/${orderId}`, { billType })),
  },
};
