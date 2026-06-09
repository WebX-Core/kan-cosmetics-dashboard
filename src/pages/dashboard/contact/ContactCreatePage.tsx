import React from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCreateContact } from "@/features/contact";
import {
  ModernFormLayout,
  FormSection,
  FormField,
  FormActions,
} from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

const inputCls =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  number: z.string().trim().min(1, "Phone number is required"),
  message: z.string().trim().min(1, "Message is required"),
  sortOrder: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? Number(v) : undefined),
    z.number().int().positive().optional(),
  ),
});

type FieldErrors = Partial<Record<string, string>>;

export const ContactCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const createMutation = useCreateContact();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const parsed = schema.safeParse({ name, email, number, message, sortOrder });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    try {
      await createMutation.mutateAsync(parsed.data);
      toast.success("Contact created");
      navigate("/dashboard/contact", { replace: true });
    } catch (err) {
      const { message: errMsg, fieldErrors: apiFieldErrors } = parseApiError(err);
      toast.error(errMsg);
      if (apiFieldErrors) setFieldErrors(apiFieldErrors);
    }
  };

  const isSubmitting = createMutation.isPending;

  return (
    <ModernFormLayout
      title="Create Contact"
      subtitle="Add a new contact entry"
      onBack={() => navigate("/dashboard/contact")}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {/* Contact Details */}
        <FormSection title="Contact Details">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Name" required error={fieldErrors.name}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className={inputCls}
              />
            </FormField>

            <FormField label="Email" required error={fieldErrors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className={inputCls}
              />
            </FormField>

            <FormField label="Phone Number" required error={fieldErrors.number}>
              <input
                type="tel"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="+1 555 000 0000"
                className={inputCls}
              />
            </FormField>
          </div>
        </FormSection>

        {/* Message */}
        <FormSection title="Message">
          <FormField label="Message" required error={fieldErrors.message}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Enter the message…"
              className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 resize-none"
            />
          </FormField>
        </FormSection>

        {/* Settings */}
        <FormSection title="Settings">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Sort Order" error={fieldErrors.sortOrder}>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                min={1}
                className={inputCls}
              />
            </FormField>
          </div>
        </FormSection>

        <FormActions
          submitLabel="Create Contact"
          isSubmitting={isSubmitting}
          submitIcon={<Loader2 size={11} />}
          onCancel={() => navigate("/dashboard/contact")}
        />
      </form>
    </ModernFormLayout>
  );
};
