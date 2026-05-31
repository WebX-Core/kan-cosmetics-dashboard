import React from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { useCreateTeam } from "@/features/team";
import {
  ModernFormLayout,
  FormSection,
  FormField,
  FormActions,
} from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import RichTextEditor from "@/shared/components/RichTextEditor";
import { queryClient } from "@/shared/api/queryClient";

const inputCls =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const schema = z.object({
  fullname: z.string().min(1, "Full name is required"),
  designation: z.string().min(1, "Designation is required"),
  countryCode: z.string().min(1, "Country code is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  description: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  instagram: z.string().optional(),
  isLeader: z.boolean().default(false),
  addToHome: z.boolean().default(false),
  sortOrder: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : undefined)),
});

type FormState = {
  fullname: string;
  designation: string;
  countryCode: string;
  phoneNumber: string;
  description: string;
  facebook: string;
  twitter: string;
  linkedin: string;
  instagram: string;
  isLeader: boolean;
  addToHome: boolean;
  sortOrder: string;
};

const defaultForm: FormState = {
  fullname: "",
  designation: "",
  countryCode: "+977",
  phoneNumber: "",
  description: "",
  facebook: "",
  twitter: "",
  linkedin: "",
  instagram: "",
  isLeader: false,
  addToHome: false,
  sortOrder: "",
};

export const TeamCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const createTeam = useCreateTeam();

  const [form, setForm] = React.useState<FormState>(defaultForm);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const imagePreview = React.useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  React.useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = schema.safeParse({ ...form, image: file ?? undefined });
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error(result.error.issues[0]?.message ?? "Invalid form");
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const parsed = result.data;
      await createTeam.mutateAsync({ ...parsed, image: file ?? null });
      await queryClient.invalidateQueries({ queryKey: ["team", "list"] });
      toast.success("Team member created");
      navigate("/dashboard/team");
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModernFormLayout
      title="Create Team Member"
      subtitle="Add a new team member profile"
      onBack={() => navigate("/dashboard/team")}
    >
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5">
        <FormSection title="Profile">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Full Name" required error={errors.fullname}>
              <input
                type="text"
                value={form.fullname}
                onChange={(e) => setForm((p) => ({ ...p, fullname: e.target.value }))}
                placeholder="e.g. Jane Smith"
                className={inputCls}
              />
            </FormField>
            <FormField label="Designation" required error={errors.designation}>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
                placeholder="e.g. Marketing Director"
                className={inputCls}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Contact">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Country Code" required error={errors.countryCode}>
              <input
                type="text"
                value={form.countryCode}
                onChange={(e) => setForm((p) => ({ ...p, countryCode: e.target.value }))}
                placeholder="+977"
                className={inputCls}
              />
            </FormField>
            <FormField label="Phone Number" required error={errors.phoneNumber}>
              <input
                type="text"
                value={form.phoneNumber}
                onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="9800000000"
                className={inputCls}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Social Links">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Facebook" error={errors.facebook}>
              <input
                type="text"
                value={form.facebook}
                onChange={(e) => setForm((p) => ({ ...p, facebook: e.target.value }))}
                placeholder="https://facebook.com/..."
                className={inputCls}
              />
            </FormField>
            <FormField label="Twitter" error={errors.twitter}>
              <input
                type="text"
                value={form.twitter}
                onChange={(e) => setForm((p) => ({ ...p, twitter: e.target.value }))}
                placeholder="https://twitter.com/..."
                className={inputCls}
              />
            </FormField>
            <FormField label="LinkedIn" error={errors.linkedin}>
              <input
                type="text"
                value={form.linkedin}
                onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
                className={inputCls}
              />
            </FormField>
            <FormField label="Instagram" error={errors.instagram}>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))}
                placeholder="https://instagram.com/..."
                className={inputCls}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="About">
          <FormField label="Description" error={errors.description}>
            <RichTextEditor
              initialContent={form.description}
              onChange={(v) => setForm((p) => ({ ...p, description: v }))}
            />
          </FormField>
        </FormSection>

        <FormSection title="Photo">
          <FormField label="Image">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-[13px] text-[#1d1d1f] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#f5f5f7] file:px-3 file:py-1 file:text-[12px] file:font-medium file:text-[#1d1d1f] hover:border-[#0071e3]"
            />
            {imagePreview && (
              <div className="mt-3 flex items-start gap-3">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-[120px] w-[120px] rounded-xl border border-[#d2d2d7] object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="mt-1 rounded-full bg-[#f5f5f7] px-3 py-1 text-[11px] font-medium text-[#1d1d1f] transition hover:bg-[#e8e8ed]"
                >
                  Remove
                </button>
              </div>
            )}
          </FormField>
        </FormSection>

        <FormSection title="Settings">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Sort Order" error={errors.sortOrder}>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
                placeholder="0"
                className={inputCls}
              />
            </FormField>
            <FormField label="Leader">
              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 hover:bg-[#f9f9f9]">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${form.isLeader ? "border-[#0071e3] bg-[#0071e3]" : "border-[#d2d2d7] bg-white"}`}
                >
                  {form.isLeader && <Check size={11} strokeWidth={3} className="text-white" />}
                </div>
                <span className="text-sm text-[#1d1d1f]">Mark as Leader</span>
                <input
                  type="checkbox"
                  checked={form.isLeader}
                  onChange={(e) => setForm((p) => ({ ...p, isLeader: e.target.checked }))}
                  className="sr-only"
                />
              </label>
            </FormField>
            <FormField label="Home Page">
              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 hover:bg-[#f9f9f9]">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${form.addToHome ? "border-[#0071e3] bg-[#0071e3]" : "border-[#d2d2d7] bg-white"}`}
                >
                  {form.addToHome && <Check size={11} strokeWidth={3} className="text-white" />}
                </div>
                <span className="text-sm text-[#1d1d1f]">Show on Home</span>
                <input
                  type="checkbox"
                  checked={form.addToHome}
                  onChange={(e) => setForm((p) => ({ ...p, addToHome: e.target.checked }))}
                  className="sr-only"
                />
              </label>
            </FormField>
          </div>
        </FormSection>

        <FormActions
          submitLabel="Create Team Member"
          isSubmitting={isSubmitting}
          onCancel={() => navigate("/dashboard/team")}
          submitIcon={<Loader2 size={11} className="hidden" />}
        />
      </form>
    </ModernFormLayout>
  );
};
