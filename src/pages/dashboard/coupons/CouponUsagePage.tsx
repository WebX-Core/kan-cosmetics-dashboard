import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TicketCheck, Users, ShoppingBag } from "lucide-react";
import { commerceApi } from "@/features/commerce";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { ExportMenu } from "@/shared/components/dashboard/ExportMenu";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
const text = (value: unknown, fallback = "—") => typeof value === "string" && value ? value : fallback;
const date = (value: unknown) => {
  const parsed = new Date(text(value, ""));
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
};
const customerName = (customer: Record<string, unknown>) =>
  [text(customer.firstname, ""), text(customer.middlename, ""), text(customer.lastname, "")].filter(Boolean).join(" ") || text(customer.email);

type UsageRow = Readonly<{ id: string; coupon: string; title: string; customer: string; email: string; order: string; usedAt: string }>;
const toRow = (value: unknown): UsageRow => {
  const item = record(value); const coupon = record(item.coupon); const customer = record(item.customer); const order = record(item.order);
  return { id: text(item.id, crypto.randomUUID()), coupon: text(coupon.code), title: text(coupon.title), customer: customerName(customer), email: text(customer.email), order: text(order.orderNumber), usedAt: text(item.usedAt ?? item.createdAt, "") };
};

export const CouponUsagePage: React.FC = () => {
  const navigate = useNavigate(); const { id } = useParams<{ id: string }>();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const list = useQuery({ queryKey: ["coupon-usage", state.page, state.limit, debouncedSearch], queryFn: () => commerceApi.couponUsage.all({ page: state.page, limit: state.limit, search: debouncedSearch || undefined }) });
  const detail = useQuery({ queryKey: ["coupon-usage", id], queryFn: () => commerceApi.couponUsage.get(id!), enabled: Boolean(id) });
  const payload = record(list.data); const values = Array.isArray(payload.usages) ? payload.usages : Array.isArray(payload.data) ? payload.data : [];
  const rows = values.map(toRow); const selected = id ? toRow(record(detail.data).usage ?? detail.data) : null;
  const uniqueCustomers = new Set(rows.map((row) => row.email).filter((email) => email !== "—")).size;
  const uniqueOrders = new Set(rows.map((row) => row.order).filter((order) => order !== "—")).size;

  return <PageLayout title={id ? "Coupon Usage Detail" : "Coupon Usage"} subtitle="Audit redeemed coupons by customer and order." onBack={id ? () => navigate("/dashboard/coupon-usage") : undefined} actions={!id ? <ExportMenu basePath="/coupon-usage" params={{ search: debouncedSearch || undefined, limit: 10000 }} filename="coupon-usage"/> : undefined} searchValue={id ? undefined : state.search} onSearchChange={id ? undefined : (search) => setState((previous) => ({ ...previous, page: 1, search }))} searchPlaceholder="Search coupon or order…">
    {selected ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCardV2 label="Coupon" value={selected.coupon} icon={TicketCheck} colorVariant="blue" />
      <StatCardV2 label="Customer" value={selected.customer} icon={Users} colorVariant="emerald" />
      <StatCardV2 label="Order" value={selected.order} icon={ShoppingBag} colorVariant="amber" />
      <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border bg-white p-5 text-sm"><div className="grid gap-3 sm:grid-cols-2"><p><span className="text-[#86868b]">Coupon title:</span> {selected.title}</p><p><span className="text-[#86868b]">Email:</span> {selected.email}</p><p><span className="text-[#86868b]">Used at:</span> {date(selected.usedAt)}</p><p className="break-all"><span className="text-[#86868b]">Usage ID:</span> {selected.id}</p></div></div>
    </div> : <>
      <div className="grid gap-4 sm:grid-cols-3"><StatCardV2 label="Total Uses" value={Number(payload.total ?? rows.length)} icon={TicketCheck} colorVariant="blue"/><StatCardV2 label="Customers on page" value={uniqueCustomers} icon={Users} colorVariant="emerald"/><StatCardV2 label="Orders on page" value={uniqueOrders} icon={ShoppingBag} colorVariant="amber"/></div>
      <DataTableV2 columns={[{ key: "coupon", label: "Code", sortValue: (row: UsageRow) => row.coupon, render: (row: UsageRow) => <span className="font-mono font-semibold">{row.coupon}</span> }, { key: "title", label: "Coupon" }, { key: "customer", label: "Customer", sortValue: (row: UsageRow) => row.customer }, { key: "email", label: "Email" }, { key: "order", label: "Order" }, { key: "usedAt", label: "Used", sortValue: (row: UsageRow) => row.usedAt, render: (row: UsageRow) => date(row.usedAt) }]} data={rows} onRowClick={(row) => navigate(`/dashboard/coupon-usage/${row.id}`)} emptyMessage={list.isLoading ? "Loading coupon usage…" : "No coupon usage found."} showPagination currentPage={state.page} totalPages={Number(payload.totalPages ?? 1)} onPageChange={(page) => setState((previous) => ({ ...previous, page }))} pageSize={state.limit} onPageSizeChange={(limit) => setState((previous) => ({ ...previous, page: 1, limit }))}/>
    </>}
  </PageLayout>;
};
