import React from "react";
import { Loader2, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCreateLoyaltyRewardRule,
  useLoyaltyRewardRules,
  useLoyaltyTiers,
  useUpdateLoyaltyRewardRule,
  type LoyaltyRewardRuleDto,
  type RewardType,
} from "@/features/loyalty";
import {
  FormActions,
  FormField,
  FormSection,
  ModernFormLayout,
} from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";

type Form = {
  code: string;
  title: string;
  description: string;
  tierId: string;
  tierCode: string;
  triggerType: string;
  rewardType: RewardType;
  rewardStatus: string;
  isPhysical: boolean;
  isDigital: boolean;
  isActive: boolean;
  sortOrder: string;
  priority: string;
  minOrderAmount: string;
  maxOrderAmount: string;
  minProductSubtotal: string;
  maxProductSubtotal: string;
  minYearlyPoints: string;
  maxYearlyPoints: string;
  minLifetimePoints: string;
  maxLifetimePoints: string;
  rewardMultiplier: string;
  birthdayRewardMultiplier: string;
  statusPointMultiplier: string;
  bonusRewardPoints: string;
  bonusStatusPoints: string;
  birthdayMonthOnly: boolean;
  firstOrderOnly: boolean;
  selectedProductIds: string;
  selectedProductVariantIds: string;
  selectedCategoryIds: string;
  selectedSubcategoryIds: string;
  discountType: string;
  discountValue: string;
  maximumDiscountAmount: string;
  minimumOrderAmountForCoupon: string;
  couponValidityDays: string;
  usageLimit: string;
  perUserUsageLimit: string;
  codePrefix: string;
  freeShippingCount: string;
  freeShippingPercent: string;
  physicalGiftTitle: string;
  freeProductTitle: string;
  freeProductWorth: string;
  packingNote: string;
  quantity: string;
  oncePerCustomer: boolean;
  oncePerCycle: boolean;
  allowWithCoupon: boolean;
  stackable: boolean;
  startsAt: string;
  expiresAt: string;
};

const input =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]";
const textarea =
  "min-h-24 w-full rounded-xl border border-[#d2d2d7] bg-white p-3 text-sm outline-none focus:border-[var(--primary)]";

const initial: Form = {
  code: "",
  title: "",
  description: "",
  tierId: "",
  tierCode: "",
  triggerType: "ORDER_DELIVERED",
  rewardType: "DIGITAL",
  rewardStatus: "",
  isPhysical: false,
  isDigital: true,
  isActive: true,
  sortOrder: "1",
  priority: "",
  minOrderAmount: "",
  maxOrderAmount: "",
  minProductSubtotal: "",
  maxProductSubtotal: "",
  minYearlyPoints: "",
  maxYearlyPoints: "",
  minLifetimePoints: "",
  maxLifetimePoints: "",
  rewardMultiplier: "",
  birthdayRewardMultiplier: "",
  statusPointMultiplier: "",
  bonusRewardPoints: "",
  bonusStatusPoints: "",
  birthdayMonthOnly: false,
  firstOrderOnly: false,
  selectedProductIds: "",
  selectedProductVariantIds: "",
  selectedCategoryIds: "",
  selectedSubcategoryIds: "",
  discountType: "FLAT",
  discountValue: "",
  maximumDiscountAmount: "",
  minimumOrderAmountForCoupon: "",
  couponValidityDays: "",
  usageLimit: "",
  perUserUsageLimit: "",
  codePrefix: "",
  freeShippingCount: "",
  freeShippingPercent: "",
  physicalGiftTitle: "",
  freeProductTitle: "",
  freeProductWorth: "",
  packingNote: "",
  quantity: "1",
  oncePerCustomer: false,
  oncePerCycle: false,
  allowWithCoupon: false,
  stackable: false,
  startsAt: "",
  expiresAt: "",
};

const normalizeCode = (value: string) =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const str = (value: unknown) => (value == null ? "" : String(value));
const dateInput = (value: unknown) => (typeof value === "string" ? value.slice(0, 16) : "");
const ids = (value: unknown) => (Array.isArray(value) ? value.join(", ") : "");
const cleanString = (value: string) => value.trim() || null;
const cleanNumber = (value: string) => (value.trim() ? Number(value) : null);
const cleanInteger = (value: string) => (value.trim() ? Math.trunc(Number(value)) : null);
const cleanIds = (value: string) =>
  value.split(",").map((item) => item.trim()).filter(Boolean);

export const LoyaltyRewardRuleFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);
  const tiers = useLoyaltyTiers();
  const rules = useLoyaltyRewardRules({ page: 1, limit: 1000 });
  const create = useCreateLoyaltyRewardRule();
  const update = useUpdateLoyaltyRewardRule();
  const [form, setForm] = React.useState<Form>(initial);

  React.useEffect(() => {
    if (!id) return;
    const row = rules.data?.data.find((rule) => rule.id === id);
    if (!row) return;
    setForm({
      code: row.code,
      title: row.title,
      description: str(row.description),
      tierId: str(row.tierId ?? row.tier?.id),
      tierCode: str(row.tierCode),
      triggerType: str(row.triggerType) || "ORDER_DELIVERED",
      rewardType: (row.rewardType ?? "DIGITAL") as RewardType,
      rewardStatus: str(row.rewardStatus),
      isPhysical: Boolean(row.isPhysical),
      isDigital: row.isDigital !== false,
      isActive: row.isActive !== false,
      sortOrder: str(row.sortOrder ?? 1),
      priority: str(row.priority),
      minOrderAmount: str(row.minOrderAmount),
      maxOrderAmount: str(row.maxOrderAmount),
      minProductSubtotal: str(row.minProductSubtotal),
      maxProductSubtotal: str(row.maxProductSubtotal),
      minYearlyPoints: str(row.minYearlyPoints),
      maxYearlyPoints: str(row.maxYearlyPoints),
      minLifetimePoints: str(row.minLifetimePoints),
      maxLifetimePoints: str(row.maxLifetimePoints),
      rewardMultiplier: str(row.rewardMultiplier),
      birthdayRewardMultiplier: str(row.birthdayRewardMultiplier),
      statusPointMultiplier: str(row.statusPointMultiplier),
      bonusRewardPoints: str(row.bonusRewardPoints),
      bonusStatusPoints: str(row.bonusStatusPoints),
      birthdayMonthOnly: Boolean(row.birthdayMonthOnly),
      firstOrderOnly: Boolean(row.firstOrderOnly),
      selectedProductIds: ids(row.selectedProductIds),
      selectedProductVariantIds: ids(row.selectedProductVariantIds),
      selectedCategoryIds: ids(row.selectedCategoryIds),
      selectedSubcategoryIds: ids(row.selectedSubcategoryIds),
      discountType: str(row.discountType) || "FLAT",
      discountValue: str(row.discountValue),
      maximumDiscountAmount: str(row.maximumDiscountAmount),
      minimumOrderAmountForCoupon: str(row.minimumOrderAmountForCoupon),
      couponValidityDays: str(row.couponValidityDays),
      usageLimit: str(row.usageLimit),
      perUserUsageLimit: str(row.perUserUsageLimit),
      codePrefix: str(row.codePrefix),
      freeShippingCount: str(row.freeShippingCount),
      freeShippingPercent: str(row.freeShippingPercent),
      physicalGiftTitle: str(row.physicalGiftTitle),
      freeProductTitle: str(row.freeProductTitle),
      freeProductWorth: str(row.freeProductWorth),
      packingNote: str(row.packingNote),
      quantity: str(row.quantity ?? 1),
      oncePerCustomer: Boolean(row.oncePerCustomer),
      oncePerCycle: Boolean(row.oncePerCycle),
      allowWithCoupon: row.allowWithCoupon === true,
      stackable: row.stackable === true,
      startsAt: dateInput(row.startsAt),
      expiresAt: dateInput(row.expiresAt),
    });
  }, [id, rules.data?.data]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validateNumber = (label: string, value: string, min = 0) => {
    if (!value.trim()) return true;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min) {
      toast.error(`${label} must be ${min} or greater.`);
      return false;
    }
    return true;
  };

  const submit: React.FormEventHandler = async (event) => {
    event.preventDefault();
    const code = normalizeCode(form.code);
    if (!form.title.trim() || !code) return toast.error("Rule title and code are required.");
    const numberChecks = [
      ["Minimum order amount", form.minOrderAmount],
      ["Maximum order amount", form.maxOrderAmount],
      ["Minimum product subtotal", form.minProductSubtotal],
      ["Maximum product subtotal", form.maxProductSubtotal],
      ["Reward multiplier", form.rewardMultiplier],
      ["Birthday reward multiplier", form.birthdayRewardMultiplier],
      ["Status point multiplier", form.statusPointMultiplier],
      ["Bonus reward points", form.bonusRewardPoints],
      ["Bonus status points", form.bonusStatusPoints],
      ["Discount value", form.discountValue],
      ["Maximum discount amount", form.maximumDiscountAmount],
      ["Minimum order amount for coupon", form.minimumOrderAmountForCoupon],
      ["Free shipping percent", form.freeShippingPercent],
      ["Free product worth", form.freeProductWorth],
      ["Quantity", form.quantity],
    ] as const;
    if (!numberChecks.every(([label, value]) => validateNumber(label, value))) return;
    if (form.discountType === "PERCENTAGE" && Number(form.discountValue) > 100) {
      return toast.error("Percentage discount cannot exceed 100.");
    }

    const dto: LoyaltyRewardRuleDto = {
      code,
      title: form.title.trim(),
      description: cleanString(form.description),
      tierId: form.tierId || null,
      tierCode: cleanString(form.tierCode),
      triggerType: cleanString(form.triggerType),
      rewardType: form.rewardType,
      rewardStatus: cleanString(form.rewardStatus),
      isPhysical: form.isPhysical,
      isDigital: form.isDigital,
      isActive: form.isActive,
      sortOrder: cleanInteger(form.sortOrder) ?? 1,
      priority: cleanInteger(form.priority),
      minOrderAmount: cleanNumber(form.minOrderAmount),
      maxOrderAmount: cleanNumber(form.maxOrderAmount),
      minProductSubtotal: cleanNumber(form.minProductSubtotal),
      maxProductSubtotal: cleanNumber(form.maxProductSubtotal),
      minYearlyPoints: cleanInteger(form.minYearlyPoints),
      maxYearlyPoints: cleanInteger(form.maxYearlyPoints),
      minLifetimePoints: cleanInteger(form.minLifetimePoints),
      maxLifetimePoints: cleanInteger(form.maxLifetimePoints),
      rewardMultiplier: cleanNumber(form.rewardMultiplier),
      birthdayRewardMultiplier: cleanNumber(form.birthdayRewardMultiplier),
      statusPointMultiplier: cleanNumber(form.statusPointMultiplier),
      bonusRewardPoints: cleanInteger(form.bonusRewardPoints),
      bonusStatusPoints: cleanInteger(form.bonusStatusPoints),
      birthdayMonthOnly: form.birthdayMonthOnly,
      firstOrderOnly: form.firstOrderOnly,
      selectedProductIds: cleanIds(form.selectedProductIds),
      selectedProductVariantIds: cleanIds(form.selectedProductVariantIds),
      selectedCategoryIds: cleanIds(form.selectedCategoryIds),
      selectedSubcategoryIds: cleanIds(form.selectedSubcategoryIds),
      discountType: form.discountValue.trim() ? form.discountType : null,
      discountValue: cleanNumber(form.discountValue),
      maximumDiscountAmount: cleanNumber(form.maximumDiscountAmount),
      minimumOrderAmountForCoupon: cleanNumber(form.minimumOrderAmountForCoupon),
      couponValidityDays: cleanInteger(form.couponValidityDays),
      usageLimit: cleanInteger(form.usageLimit),
      perUserUsageLimit: cleanInteger(form.perUserUsageLimit),
      codePrefix: cleanString(form.codePrefix),
      freeShippingCount: cleanInteger(form.freeShippingCount),
      freeShippingPercent: cleanNumber(form.freeShippingPercent),
      physicalGiftTitle: cleanString(form.physicalGiftTitle),
      freeProductTitle: cleanString(form.freeProductTitle),
      freeProductWorth: cleanNumber(form.freeProductWorth),
      packingNote: cleanString(form.packingNote),
      quantity: cleanInteger(form.quantity) ?? 1,
      oncePerCustomer: form.oncePerCustomer,
      oncePerCycle: form.oncePerCycle,
      allowWithCoupon: form.allowWithCoupon,
      stackable: form.stackable,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };

    if (id) await update.mutateAsync({ id, dto });
    else await create.mutateAsync(dto);
    navigate("/dashboard/loyalty/reward-rules");
  };

  const saving = create.isPending || update.isPending;

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Reward Rule" : "Create Reward Rule"}
      subtitle="Configure dynamic loyalty rewards, coupons, bonus points, birthday benefits, and packing notes."
      onBack={() => navigate("/dashboard/loyalty/reward-rules")}
    >
      <form onSubmit={submit} className="space-y-6">
        <FormSection title="Rule identity" description="A rule decides when and how a customer receives a loyalty benefit.">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Rule title" required>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="Rs. 333 off after Rs. 5,000 order" />
            </FormField>
            <FormField label="Rule code" required hint={`Normalized: ${normalizeCode(form.code) || "-"}`}>
              <input value={form.code} onChange={(e) => set("code", e.target.value)} className={input} placeholder="PHASE2_333_OFF" />
            </FormField>
            <FormField label="Trigger">
              <select value={form.triggerType} onChange={(e) => set("triggerType", e.target.value)} className={input}>
                <option value="">Any trigger</option>
                <option value="ORDER_CREATED">Order created</option>
                <option value="ORDER_DELIVERED">Order delivered</option>
                <option value="ORDER_SETTLED">Payment settled</option>
              </select>
            </FormField>
            <FormField label="Linked tier">
              <select value={form.tierId} onChange={(e) => set("tierId", e.target.value)} className={input}>
                <option value="">Any tier</option>
                {(tiers.data?.data ?? []).map((tier) => (
                  <option key={tier.id} value={tier.id}>{tier.name} ({tier.code})</option>
                ))}
              </select>
            </FormField>
            <FormField label="Tier code fallback">
              <input value={form.tierCode} onChange={(e) => set("tierCode", e.target.value)} className={input} placeholder="PHASE_3" />
            </FormField>
            <FormField label="Reward type">
              <select value={form.rewardType} onChange={(e) => set("rewardType", e.target.value as RewardType)} className={input}>
                <option value="DIGITAL">Digital</option>
                <option value="PHYSICAL">Physical</option>
              </select>
            </FormField>
            <FormField label="Reward status">
              <select value={form.rewardStatus} onChange={(e) => set("rewardStatus", e.target.value)} className={input}>
                <option value="">Backend default</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="PENDING">Pending</option>
                <option value="FULFILLED">Fulfilled</option>
              </select>
            </FormField>
            <FormField label="Sort order">
              <input type="number" min="1" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} className={input} placeholder="1" />
            </FormField>
            <FormField label="Priority">
              <input type="number" value={form.priority} onChange={(e) => set("priority", e.target.value)} className={input} placeholder="Lower number runs first" />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[#424245]">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />Active rule</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPhysical} onChange={(e) => set("isPhysical", e.target.checked)} />Show to packing staff</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isDigital} onChange={(e) => set("isDigital", e.target.checked)} />Digital/customer benefit</label>
          </div>
        </FormSection>

        <FormSection title="Eligibility" description="Leave any condition blank when it should not restrict the rule.">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Minimum order amount"><input type="number" min="0" value={form.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value)} className={input} placeholder="5000" /></FormField>
            <FormField label="Maximum order amount"><input type="number" min="0" value={form.maxOrderAmount} onChange={(e) => set("maxOrderAmount", e.target.value)} className={input} placeholder="No maximum" /></FormField>
            <FormField label="Minimum selected product subtotal"><input type="number" min="0" value={form.minProductSubtotal} onChange={(e) => set("minProductSubtotal", e.target.value)} className={input} placeholder="3000" /></FormField>
            <FormField label="Maximum selected product subtotal"><input type="number" min="0" value={form.maxProductSubtotal} onChange={(e) => set("maxProductSubtotal", e.target.value)} className={input} placeholder="No maximum" /></FormField>
            <FormField label="Minimum yearly points"><input type="number" min="0" value={form.minYearlyPoints} onChange={(e) => set("minYearlyPoints", e.target.value)} className={input} placeholder="5000" /></FormField>
            <FormField label="Maximum yearly points"><input type="number" min="0" value={form.maxYearlyPoints} onChange={(e) => set("maxYearlyPoints", e.target.value)} className={input} placeholder="12999" /></FormField>
            <FormField label="Minimum lifetime points"><input type="number" min="0" value={form.minLifetimePoints} onChange={(e) => set("minLifetimePoints", e.target.value)} className={input} placeholder="Optional" /></FormField>
            <FormField label="Maximum lifetime points"><input type="number" min="0" value={form.maxLifetimePoints} onChange={(e) => set("maxLifetimePoints", e.target.value)} className={input} placeholder="Optional" /></FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Product IDs" hint="Comma-separated UUIDs. Rule applies only when order contains these products.">
              <textarea value={form.selectedProductIds} onChange={(e) => set("selectedProductIds", e.target.value)} className={textarea} placeholder="product-uuid-1, product-uuid-2" />
            </FormField>
            <FormField label="Variant IDs" hint="Comma-separated UUIDs for shade/variant-specific offers.">
              <textarea value={form.selectedProductVariantIds} onChange={(e) => set("selectedProductVariantIds", e.target.value)} className={textarea} placeholder="variant-uuid-1, variant-uuid-2" />
            </FormField>
            <FormField label="Category IDs"><textarea value={form.selectedCategoryIds} onChange={(e) => set("selectedCategoryIds", e.target.value)} className={textarea} placeholder="category-uuid-1, category-uuid-2" /></FormField>
            <FormField label="Subcategory IDs"><textarea value={form.selectedSubcategoryIds} onChange={(e) => set("selectedSubcategoryIds", e.target.value)} className={textarea} placeholder="subcategory-uuid-1, subcategory-uuid-2" /></FormField>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[#424245]">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.birthdayMonthOnly} onChange={(e) => set("birthdayMonthOnly", e.target.checked)} />Only during birthday month</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.firstOrderOnly} onChange={(e) => set("firstOrderOnly", e.target.checked)} />First order only</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.allowWithCoupon} onChange={(e) => set("allowWithCoupon", e.target.checked)} />Allow when order used coupon</label>
          </div>
        </FormSection>

        <FormSection title="Point calculation" description="These fields control 1x, 1.5x, 2x, 3x and bonus point behavior.">
          <div className="grid gap-4 md:grid-cols-5">
            <FormField label="Reward multiplier"><input type="number" min="0" step="0.01" value={form.rewardMultiplier} onChange={(e) => set("rewardMultiplier", e.target.value)} className={input} placeholder="1.5" /></FormField>
            <FormField label="Birthday multiplier"><input type="number" min="0" step="0.01" value={form.birthdayRewardMultiplier} onChange={(e) => set("birthdayRewardMultiplier", e.target.value)} className={input} placeholder="2 or 3" /></FormField>
            <FormField label="Status point multiplier"><input type="number" min="0" step="0.01" value={form.statusPointMultiplier} onChange={(e) => set("statusPointMultiplier", e.target.value)} className={input} placeholder="1" /></FormField>
            <FormField label="Bonus reward points"><input type="number" min="0" value={form.bonusRewardPoints} onChange={(e) => set("bonusRewardPoints", e.target.value)} className={input} placeholder="5000" /></FormField>
            <FormField label="Bonus status points"><input type="number" min="0" value={form.bonusStatusPoints} onChange={(e) => set("bonusStatusPoints", e.target.value)} className={input} placeholder="Optional" /></FormField>
          </div>
        </FormSection>

        <FormSection title="Coupon benefit" description="Backend creates a customer-specific coupon when the order qualifies.">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Discount type">
              <select value={form.discountType} onChange={(e) => set("discountType", e.target.value)} className={input}>
                <option value="FLAT">Flat amount</option>
                <option value="PERCENTAGE">Percentage</option>
              </select>
            </FormField>
            <FormField label="Discount value"><input type="number" min="0" step="0.01" value={form.discountValue} onChange={(e) => set("discountValue", e.target.value)} className={input} placeholder="333" /></FormField>
            <FormField label="Coupon minimum order"><input type="number" min="0" value={form.minimumOrderAmountForCoupon} onChange={(e) => set("minimumOrderAmountForCoupon", e.target.value)} className={input} placeholder="5000" /></FormField>
            <FormField label="Maximum discount"><input type="number" min="0" value={form.maximumDiscountAmount} onChange={(e) => set("maximumDiscountAmount", e.target.value)} className={input} placeholder="No cap" /></FormField>
            <FormField label="Validity days"><input type="number" min="1" value={form.couponValidityDays} onChange={(e) => set("couponValidityDays", e.target.value)} className={input} placeholder="30" /></FormField>
            <FormField label="Total usage limit"><input type="number" min="1" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} className={input} placeholder="1" /></FormField>
            <FormField label="Per-user usage limit"><input type="number" min="1" value={form.perUserUsageLimit} onChange={(e) => set("perUserUsageLimit", e.target.value)} className={input} placeholder="1" /></FormField>
            <FormField label="Coupon code prefix"><input value={form.codePrefix} onChange={(e) => set("codePrefix", e.target.value)} className={input} placeholder="PHASE3" /></FormField>
          </div>
        </FormSection>

        <FormSection title="Packing and physical benefits" description="Use these fields when staff must include a free product or gift hamper in the order.">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Physical gift title"><input value={form.physicalGiftTitle} onChange={(e) => set("physicalGiftTitle", e.target.value)} className={input} placeholder="Makeup basket" /></FormField>
            <FormField label="Free product title"><input value={form.freeProductTitle} onChange={(e) => set("freeProductTitle", e.target.value)} className={input} placeholder="Jelly highlighter" /></FormField>
            <FormField label="Free product worth"><input type="number" min="0" value={form.freeProductWorth} onChange={(e) => set("freeProductWorth", e.target.value)} className={input} placeholder="800" /></FormField>
            <FormField label="Quantity"><input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className={input} placeholder="1" /></FormField>
            <FormField label="Free shipping count"><input type="number" min="0" value={form.freeShippingCount} onChange={(e) => set("freeShippingCount", e.target.value)} className={input} placeholder="1" /></FormField>
            <FormField label="Free shipping percent"><input type="number" min="0" max="100" value={form.freeShippingPercent} onChange={(e) => set("freeShippingPercent", e.target.value)} className={input} placeholder="100" /></FormField>
            <FormField label="Starts at"><input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={input} /></FormField>
            <FormField label="Expires at"><input type="datetime-local" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className={input} /></FormField>
          </div>
          <FormField label="Packing note" hint="Visible on order details when this physical reward is attached.">
            <textarea value={form.packingNote} onChange={(e) => set("packingNote", e.target.value)} className={textarea} placeholder="Include one makeup basket in the parcel. Confirm before dispatch." />
          </FormField>
          <div className="flex flex-wrap gap-4 text-sm text-[#424245]">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.oncePerCustomer} onChange={(e) => set("oncePerCustomer", e.target.checked)} />Issue once per customer</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.oncePerCycle} onChange={(e) => set("oncePerCycle", e.target.checked)} />Issue once per yearly cycle</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.stackable} onChange={(e) => set("stackable", e.target.checked)} />Allow stacking with other reward rules</label>
          </div>
          <FormField label="Description">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} className={textarea} placeholder="Short internal description of why this benefit exists." />
          </FormField>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving..." : isEdit ? "Update Rule" : "Create Rule"}
          submitIcon={saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/loyalty/reward-rules")}
        />
      </form>
    </ModernFormLayout>
  );
};
