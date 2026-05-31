import React from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

type ModernFormLayoutProps = Readonly<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  stats?: ReadonlyArray<{ label: string; value: string }>;
  children: React.ReactNode;
}>;

export const ModernFormLayout: React.FC<ModernFormLayoutProps> = ({
  title,
  subtitle,
  onBack,
  children,
}) => {
  return (
    <div className="compact-form min-h-screen bg-[#f5f5f7]">
      <div className="w-full space-y-[14px] p-[24px] pb-[38px]">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-[6px] flex items-center gap-[4px] text-[11px] text-[#6e6e73] transition-colors hover:text-[#1d1d1f]"
            >
              <ArrowLeft size={11} strokeWidth={2} />
              Back
            </button>
          )}
          <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">{title}</h1>
          {subtitle && <p className="mt-[3px] text-[11px] text-[#6e6e73]">{subtitle}</p>}
        </div>

        {children}
      </div>
    </div>
  );
};

type FormSectionProps = Readonly<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}>;

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  action,
  children,
}) => {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
          {action}
        </div>
        {description && <p className="mt-0.5 text-[11px] text-gray-500">{description}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
};

type FormFieldProps = Readonly<{
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}>;

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  hint,
  children,
}) => {
  return (
    <div className="space-y-1">
      <label className="block text-[12px] font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
};

type FormActionsProps = Readonly<{
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
  submitIcon?: React.ReactNode;
}>;

export const FormActions: React.FC<FormActionsProps> = ({
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  onCancel,
  submitIcon,
}) => {
  return (
    <div className="flex items-center gap-[6px] pt-[6px]">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex min-h-[30px] items-center rounded-full border border-[#d2d2d7] bg-white px-[14px] py-[7px] text-[11px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-[30px] items-center gap-[6px] rounded-full bg-[#0071e3] px-[14px] py-[7px] text-[11px] font-medium text-white transition-colors hover:bg-[#0066cc] disabled:opacity-50 active:scale-[0.982]"
      >
        {isSubmitting ? <Loader2 size={11} className="animate-spin" /> : submitIcon}
        {isSubmitting ? "Saving…" : submitLabel}
      </button>
    </div>
  );
};
