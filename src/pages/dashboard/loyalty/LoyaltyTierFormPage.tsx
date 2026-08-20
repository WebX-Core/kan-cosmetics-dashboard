import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Gift, Loader2, Plus, Trash2 } from "lucide-react";
import {
  useCreateLoyaltyTier,
  useLoyaltyTiers,
  useUpdateLoyaltyTier,
  type RewardType,
} from "@/features/loyalty";
import {
  ModernFormLayout,
  FormActions,
  FormField,
  FormSection,
} from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { commerceApi } from "@/features/commerce";

type OrderRewardRuleForm = {
  id: string;
  isActive: boolean;
  minOrderAmount: string;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: string;
  minimumOrderAmount: string;
  maximumDiscountAmount: string;
  validityDays: string;
  perUserUsageLimit: string;
  usageLimit: string;
  title: string;
  description: string;
  codePrefix: string;
  oncePerCycle: boolean;
};

type Form = {
  code: string;
  name: string;
  minYearlyPoints: string;
  maxYearlyPoints: string;
  sortOrder: string;
  isActive: boolean;
  freeDelivery: boolean;
  discountPercent: string;
  fixedAmountOff: string;
  rewardMultiplier: string;
  rewardType: RewardType;
  rewardTitle: string;
  rewardDescription: string;
  benefitValue: string;
  expiresAt: string;
  couponId: string;
  couponCode: string;
  hamperName: string;
  hamperSku: string;
  hamperItems: string;
};

const input =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]";

const initial: Form = {
  code: "",
  name: "",
  minYearlyPoints: "0",
  maxYearlyPoints: "",
  sortOrder: "1",
  isActive: true,
  freeDelivery: false,
  discountPercent: "0",
  fixedAmountOff: "0",
  rewardMultiplier: "1",
  rewardType: "DIGITAL",
  rewardTitle: "",
  rewardDescription: "",
  benefitValue: "",
  expiresAt: "",
  couponId: "",
  couponCode: "",
  hamperName: "",
  hamperSku: "",
  hamperItems: "",
};

const createEmptyOrderReward = (): OrderRewardRuleForm => ({
  id: "",
  isActive: true,
  minOrderAmount: "",
  discountType: "FLAT",
  discountValue: "",
  minimumOrderAmount: "",
  maximumDiscountAmount: "",
  validityDays: "30",
  perUserUsageLimit: "1",
  usageLimit: "1",
  title: "",
  description: "",
  codePrefix: "",
  oncePerCycle: true,
});

const normalizeCode = (value: string) =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const bool = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const toNumberString = (value: unknown) =>
  value == null || value === "" ? "" : String(value);

const mapOrderRewardFromApi = (value: Record<string, unknown>): OrderRewardRuleForm => ({
  id: text(value.id ?? value.code),
  isActive: bool(value.isActive, true),
  minOrderAmount: toNumberString(value.minOrderAmount),
  discountType: value.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FLAT",
  discountValue: toNumberString(value.discountValue),
  minimumOrderAmount: toNumberString(value.minimumOrderAmount),
  maximumDiscountAmount: toNumberString(value.maximumDiscountAmount),
  validityDays: toNumberString(value.validityDays) || "30",
  perUserUsageLimit: toNumberString(value.perUserUsageLimit) || "1",
  usageLimit: toNumberString(value.usageLimit) || "1",
  title: text(value.title),
  description: text(value.description),
  codePrefix: text(value.codePrefix),
  oncePerCycle: bool(value.oncePerCycle, true),
});

const numeric = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const compactOptionalNumber = (value: string) =>
  value.trim() ? numeric(value) : undefined;

export const LoyaltyTierFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);
  const tiers = useLoyaltyTiers();
  const coupons = commerceApi.coupons.crud.hooks.useList({ page: 1, limit: 1000 });
  const create = useCreateLoyaltyTier();
  const update = useUpdateLoyaltyTier();
  const [form, setForm] = React.useState<Form>(initial);
  const [orderRewards, setOrderRewards] = React.useState<OrderRewardRuleForm[]>([]);

  const activeCoupons = React.useMemo(
    () =>
      (coupons.data?.data ?? [])
        .filter((entry) => entry.isActive !== false)
        .map((entry) => ({
          id: String(entry.id ?? ""),
          code: String(entry.code ?? ""),
          title: String(entry.title ?? entry.code ?? "Coupon"),
        }))
        .filter((entry) => entry.id && entry.code),
    [coupons.data?.data],
  );

  React.useEffect(() => {
    if (!id) return;
    const row = tiers.data?.data.find((tier) => tier.id === id);
    if (!row) return;

    const reward = row.benefits?.reward;
    const meta = reward?.benefitMeta;
    const nestedCoupon = meta?.coupon as Record<string, unknown> | undefined;
    const hamper = meta?.giftHamper as Record<string, unknown> | undefined;

    setForm({
      code: row.code,
      name: row.name,
      minYearlyPoints: String(row.minYearlyPoints),
      maxYearlyPoints: row.maxYearlyPoints == null ? "" : String(row.maxYearlyPoints),
      sortOrder: String(row.sortOrder ?? 1),
      isActive: row.isActive,
      freeDelivery: Boolean(row.benefits?.freeDelivery),
      discountPercent: String(row.benefits?.discountPercent ?? row.benefits?.percentOff ?? 0),
      fixedAmountOff: String(row.benefits?.fixedAmountOff ?? row.benefits?.amountOff ?? 0),
      rewardMultiplier: String(row.benefits?.rewardMultiplier ?? 1),
      rewardType: reward?.rewardType ?? reward?.type ?? "DIGITAL",
      rewardTitle: reward?.title ?? "",
      rewardDescription: reward?.description ?? "",
      benefitValue: reward?.benefitValue == null ? "" : String(reward.benefitValue),
      expiresAt: reward?.expiresAt?.slice(0, 16) ?? "",
      couponId: String(meta?.couponId ?? nestedCoupon?.id ?? ""),
      couponCode: String(meta?.couponCode ?? nestedCoupon?.code ?? ""),
      hamperName: typeof hamper?.name === "string" ? hamper.name : "",
      hamperSku: typeof hamper?.sku === "string" ? hamper.sku : "",
      hamperItems: Array.isArray(hamper?.items)
        ? (hamper.items as Array<Record<string, unknown>>)
            .map((item) => `${item.name ?? ""}:${item.quantity ?? 1}`)
            .join("\n")
        : "",
    });

    setOrderRewards(
      Array.isArray(row.benefits?.orderRewards)
        ? (row.benefits.orderRewards as Array<Record<string, unknown>>).map(mapOrderRewardFromApi)
        : [],
    );
  }, [id, tiers.data?.data]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateOrderReward = <K extends keyof OrderRewardRuleForm>(
    index: number,
    key: K,
    value: OrderRewardRuleForm[K],
  ) =>
    setOrderRewards((prev) =>
      prev.map((rule, currentIndex) =>
        currentIndex === index ? { ...rule, [key]: value } : rule,
      ),
    );

  const addOrderReward = () =>
    setOrderRewards((prev) => [...prev, createEmptyOrderReward()]);

  const removeOrderReward = (index: number) =>
    setOrderRewards((prev) => prev.filter((_, currentIndex) => currentIndex !== index));

  const buildOrderRewardPayload = () => {
    return orderRewards.map((rule, index) => {
      const minOrderAmount = numeric(rule.minOrderAmount, -1);
      const discountValue = numeric(rule.discountValue, -1);
      const minimumOrderAmount = numeric(rule.minimumOrderAmount || rule.minOrderAmount, -1);
      const validityDays = numeric(rule.validityDays, -1);
      const perUserUsageLimit = numeric(rule.perUserUsageLimit, -1);
      const usageLimit = numeric(rule.usageLimit, -1);
      const maximumDiscountAmount = compactOptionalNumber(rule.maximumDiscountAmount);

      if (!rule.title.trim()) {
        throw new Error(`Order reward #${index + 1}: title is required.`);
      }
      if (minOrderAmount < 0 || discountValue <= 0 || minimumOrderAmount < 0) {
        throw new Error(`Order reward #${index + 1}: order and discount amounts are invalid.`);
      }
      if (!Number.isInteger(validityDays) || validityDays <= 0) {
        throw new Error(`Order reward #${index + 1}: validity days must be greater than zero.`);
      }
      if (!Number.isInteger(perUserUsageLimit) || perUserUsageLimit <= 0) {
        throw new Error(`Order reward #${index + 1}: per-user usage limit must be greater than zero.`);
      }
      if (!Number.isInteger(usageLimit) || usageLimit <= 0) {
        throw new Error(`Order reward #${index + 1}: usage limit must be greater than zero.`);
      }
      if (rule.discountType === "PERCENTAGE" && discountValue > 100) {
        throw new Error(`Order reward #${index + 1}: percentage discount cannot exceed 100.`);
      }

      return {
        id: rule.id.trim() || undefined,
        isActive: rule.isActive,
        minOrderAmount,
        discountType: rule.discountType,
        discountValue,
        minimumOrderAmount,
        maximumDiscountAmount,
        validityDays,
        perUserUsageLimit,
        usageLimit,
        title: rule.title.trim(),
        description: rule.description.trim() || null,
        codePrefix: rule.codePrefix.trim() || undefined,
        oncePerCycle: rule.oncePerCycle,
      };
    });
  };

  const save: React.FormEventHandler = async (event) => {
    event.preventDefault();
    const min = Number(form.minYearlyPoints);
    const max = form.maxYearlyPoints ? Number(form.maxYearlyPoints) : null;
    const code = normalizeCode(form.code);
    const existing = tiers.data?.data.filter((tier) => tier.id !== id) ?? [];

    if (!form.name.trim() || !code) return toast.error("Tier name and code are required.");
    if (min < 0 || (max != null && max < min)) return toast.error("Tier point range is invalid.");
    if (existing.some((tier) => normalizeCode(tier.code) === code)) {
      return toast.error("A tier with this code already exists.");
    }
    if (existing.some((tier) => tier.sortOrder === Number(form.sortOrder))) {
      return toast.error("Another tier already uses this sort order.");
    }
    if (max == null && existing.some((tier) => tier.maxYearlyPoints == null)) {
      return toast.error("Only one tier can have an open-ended maximum.");
    }

    const overlap = existing.find((tier) => {
      const otherMax = tier.maxYearlyPoints ?? Number.POSITIVE_INFINITY;
      const currentMax = max ?? Number.POSITIVE_INFINITY;
      return min <= otherMax && tier.minYearlyPoints <= currentMax;
    });
    if (overlap) return toast.error(`Point range overlaps with ${overlap.name}.`);

    const discount = Number(form.discountPercent) || 0;
    const fixed = Number(form.fixedAmountOff) || 0;
    const rewardMultiplier = Number(form.rewardMultiplier || 1);
    if (
      discount < 0 ||
      discount > 100 ||
      fixed < 0 ||
      !Number.isFinite(rewardMultiplier) ||
      rewardMultiplier < 0
    ) {
      return toast.error("Benefit values are invalid.");
    }

    let orderRewardPayload: Array<Record<string, unknown>> = [];
    try {
      orderRewardPayload = buildOrderRewardPayload();
    } catch (error) {
      return toast.error((error as Error).message);
    }

    const parsedLines = form.hamperItems.split("\n").filter((line) => line.trim());
    const items = parsedLines.map((line) => {
      const [name, quantity] = line.split(":");
      return { name: name?.trim(), quantity: Number(quantity) };
    });
    if (
      form.rewardType === "PHYSICAL" &&
      (!form.hamperName.trim() ||
        !form.hamperSku.trim() ||
        items.some((item) => !item.name || !Number.isInteger(item.quantity) || item.quantity <= 0))
    ) {
      return toast.error("Physical rewards require a hamper name, SKU, and valid item quantities.");
    }

    const benefitMeta =
      form.rewardType === "PHYSICAL"
        ? { giftHamper: { name: form.hamperName, sku: form.hamperSku, items } }
        : form.couponId
          ? { couponId: form.couponId, couponCode: form.couponCode }
          : null;

    const dto = {
      code: form.code,
      name: form.name.trim(),
      minYearlyPoints: min,
      maxYearlyPoints: max,
      sortOrder: Number(form.sortOrder) || 1,
      isActive: form.isActive,
      benefits: {
        freeDelivery: form.freeDelivery,
        discountPercent: discount,
        fixedAmountOff: fixed,
        rewardMultiplier,
        ...(orderRewardPayload.length ? { orderRewards: orderRewardPayload } : {}),
        reward: {
          rewardType: form.rewardType,
          title: form.rewardTitle.trim() || `${form.name} Reward`,
          description: form.rewardDescription.trim() || null,
          benefitValue: form.benefitValue || null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
          benefitMeta,
        },
      },
    };

    if (id) await update.mutateAsync({ id, dto });
    else await create.mutateAsync(dto);
    navigate("/dashboard/loyalty/tiers");
  };

  const saving = create.isPending || update.isPending;

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Loyalty Tier" : "Create Loyalty Tier"}
      subtitle="Configure yearly thresholds, customer benefits, and generated rewards."
      onBack={() => navigate("/dashboard/loyalty/tiers")}
    >
      <form onSubmit={save} className="space-y-6">
        <FormSection title="Tier identity">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Display name" required>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className={input} placeholder="3rd Phase" />
            </FormField>
            <FormField label="Code" required hint={`Normalized: ${normalizeCode(form.code) || "-"}`}>
              <input value={form.code} onChange={(e) => set("code", e.target.value)} className={input} placeholder="PHASE_3" />
            </FormField>
            <FormField label="Minimum yearly points" required>
              <input type="number" min="0" value={form.minYearlyPoints} onChange={(e) => set("minYearlyPoints", e.target.value)} className={input} placeholder="13000" />
            </FormField>
            <FormField label="Maximum yearly points">
              <input type="number" min="0" value={form.maxYearlyPoints} onChange={(e) => set("maxYearlyPoints", e.target.value)} className={input} placeholder="24999 or leave blank" />
            </FormField>
            <FormField label="Sort order">
              <input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} className={input} placeholder="3" />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              Active tier
            </label>
          </div>
        </FormSection>

        <FormSection title="Benefits">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.freeDelivery} onChange={(e) => set("freeDelivery", e.target.checked)} />
              Free delivery
            </label>
            <FormField label="Discount percent">
              <input type="number" min="0" max="100" value={form.discountPercent} onChange={(e) => set("discountPercent", e.target.value)} className={input} placeholder="5" />
            </FormField>
            <FormField label="Fixed amount off">
              <input type="number" min="0" value={form.fixedAmountOff} onChange={(e) => set("fixedAmountOff", e.target.value)} className={input} placeholder="500" />
            </FormField>
            <FormField label="Reward multiplier" hint="Example: 1.5 for 3rd phase.">
              <input type="number" min="0" step="0.01" value={form.rewardMultiplier} onChange={(e) => set("rewardMultiplier", e.target.value)} className={input} placeholder="1.5" />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          title="Order reward coupons"
          description="Create customer-specific next-order coupons when a qualifying order earns loyalty points."
        >
          <div className="space-y-4">
            {orderRewards.map((rule, index) => (
              <div key={index} className="rounded-xl border border-[#d2d2d7] bg-white p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1d1d1f]">Reward coupon #{index + 1}</p>
                    <p className="text-xs text-[#86868b]">Generated after the customer places a qualifying order.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOrderReward(index)}
                    className="inline-flex h-8 items-center gap-2 rounded-full border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormField label="Rule ID">
                    <input value={rule.id} onChange={(e) => updateOrderReward(index, "id", e.target.value)} className={input} placeholder="phase3-333-off-5000" />
                  </FormField>
                  <FormField label="Title" required>
                    <input value={rule.title} onChange={(e) => updateOrderReward(index, "title", e.target.value)} className={input} placeholder="Rs. 333 off on next order" />
                  </FormField>
                  <FormField label="Code prefix">
                    <input value={rule.codePrefix} onChange={(e) => updateOrderReward(index, "codePrefix", e.target.value)} className={input} placeholder="PHASE3 or GOLD" />
                  </FormField>
                  <FormField label="Qualifying order amount" required>
                    <input type="number" min="0" value={rule.minOrderAmount} onChange={(e) => updateOrderReward(index, "minOrderAmount", e.target.value)} className={input} placeholder="5000" />
                  </FormField>
                  <FormField label="Discount type">
                    <select value={rule.discountType} onChange={(e) => updateOrderReward(index, "discountType", e.target.value as "FLAT" | "PERCENTAGE")} className={input}>
                      <option value="FLAT">Flat amount</option>
                      <option value="PERCENTAGE">Percentage</option>
                    </select>
                  </FormField>
                  <FormField label="Discount value" required>
                    <input type="number" min="0" step="0.01" value={rule.discountValue} onChange={(e) => updateOrderReward(index, "discountValue", e.target.value)} className={input} placeholder={rule.discountType === "PERCENTAGE" ? "10" : "333"} />
                  </FormField>
                  <FormField label="Minimum order to use">
                    <input type="number" min="0" value={rule.minimumOrderAmount} onChange={(e) => updateOrderReward(index, "minimumOrderAmount", e.target.value)} className={input} placeholder={rule.minOrderAmount || "5000"} />
                  </FormField>
                  <FormField label="Maximum discount">
                    <input type="number" min="0" step="0.01" value={rule.maximumDiscountAmount} onChange={(e) => updateOrderReward(index, "maximumDiscountAmount", e.target.value)} className={input} placeholder="Leave blank for no cap" />
                  </FormField>
                  <FormField label="Validity days">
                    <input type="number" min="1" step="1" value={rule.validityDays} onChange={(e) => updateOrderReward(index, "validityDays", e.target.value)} className={input} placeholder="30" />
                  </FormField>
                  <FormField label="Per-user usage limit">
                    <input type="number" min="1" step="1" value={rule.perUserUsageLimit} onChange={(e) => updateOrderReward(index, "perUserUsageLimit", e.target.value)} className={input} placeholder="1" />
                  </FormField>
                  <FormField label="Total usage limit">
                    <input type="number" min="1" step="1" value={rule.usageLimit} onChange={(e) => updateOrderReward(index, "usageLimit", e.target.value)} className={input} placeholder="1" />
                  </FormField>
                  <div className="flex flex-col justify-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={rule.isActive} onChange={(e) => updateOrderReward(index, "isActive", e.target.checked)} />
                      Active rule
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={rule.oncePerCycle} onChange={(e) => updateOrderReward(index, "oncePerCycle", e.target.checked)} />
                      Issue once per loyalty cycle
                    </label>
                  </div>
                  <FormField label="Description">
                    <textarea value={rule.description} onChange={(e) => updateOrderReward(index, "description", e.target.value)} className="min-h-24 w-full rounded-xl border border-[#d2d2d7] p-3 text-sm" placeholder="Earned after placing an order above Rs. 5,000 in this phase." />
                  </FormField>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addOrderReward}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-4 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
            >
              <Plus size={14} />
              Add reward coupon rule
            </button>
          </div>
        </FormSection>

        <FormSection title="Tier reward" description="Generated automatically when a customer enters this tier. Digital rewards start assigned; physical rewards start pending.">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Reward type">
              <select value={form.rewardType} onChange={(e) => set("rewardType", e.target.value as RewardType)} className={input}>
                <option value="DIGITAL">Digital</option>
                <option value="PHYSICAL">Physical</option>
              </select>
            </FormField>
            <FormField label="Reward title">
              <input value={form.rewardTitle} onChange={(e) => set("rewardTitle", e.target.value)} className={input} placeholder="Phase 3 welcome reward" />
            </FormField>
            <FormField label="Benefit value">
              <input value={form.benefitValue} onChange={(e) => set("benefitValue", e.target.value)} className={input} placeholder="500 or Gift Hamper" />
            </FormField>
            <FormField label="Expires at">
              <input type="datetime-local" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className={input} />
            </FormField>
            <FormField label="Description">
              <textarea value={form.rewardDescription} onChange={(e) => set("rewardDescription", e.target.value)} className="min-h-24 w-full rounded-xl border p-3" placeholder="Reward assigned automatically when the customer reaches this phase." />
            </FormField>
          </div>

          {form.rewardType === "DIGITAL" ? (
            <div className="mt-4">
              <FormField label="Linked checkout coupon" hint="Optional. Only active coupons are shown.">
                <select
                  value={form.couponId}
                  onChange={(e) => {
                    const coupon = activeCoupons.find((entry) => entry.id === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      couponId: coupon?.id ?? "",
                      couponCode: coupon?.code ?? "",
                    }));
                  }}
                  className={input}
                >
                  <option value="">No linked coupon</option>
                  {activeCoupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.id}>
                      {coupon.code} - {coupon.title}
                    </option>
                  ))}
                </select>
              </FormField>
              {form.couponCode ? (
                <p className="mt-2 text-xs text-emerald-700">Customers earning this reward will receive coupon {form.couponCode}.</p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FormField label="Hamper name">
                <input value={form.hamperName} onChange={(e) => set("hamperName", e.target.value)} className={input} placeholder="Phase 3 Makeup Basket" />
              </FormField>
              <FormField label="Hamper SKU">
                <input value={form.hamperSku} onChange={(e) => set("hamperSku", e.target.value)} className={input} placeholder="HAMPER-PHASE3" />
              </FormField>
              <FormField label="Hamper items" hint="One per line: Item name:quantity">
                <textarea value={form.hamperItems} onChange={(e) => set("hamperItems", e.target.value)} className="min-h-28 w-full rounded-xl border p-3" placeholder={"Makeup sponge:1\nJelly highlighter:1"} />
              </FormField>
              <div className="flex items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                <Gift className="mr-2" />
                Physical fulfillment remains manual.
              </div>
            </div>
          )}
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving..." : isEdit ? "Update Tier" : "Create Tier"}
          submitIcon={saving ? <Loader2 className="animate-spin" size={14} /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/loyalty/tiers")}
        />
      </form>
    </ModernFormLayout>
  );
};
