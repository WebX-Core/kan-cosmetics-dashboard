import React from "react";
import { Eye, EyeOff, Trash2, UploadCloud } from "lucide-react";
import RichTextEditor from "@/shared/components/RichTextEditor";
import { Button } from "@/shared/components/ui/button";

export type EntityFieldOption = Readonly<{ label: string; value: string }>;

export type EntityFieldConfig = Readonly<{
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "file" | "date" | "password" | "richtext";
  required?: boolean;
  placeholder?: string;
  options?: ReadonlyArray<EntityFieldOption>;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  rows?: number;
}>;

type Props = Readonly<{
  fields: ReadonlyArray<EntityFieldConfig>;
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onFieldChange: (name: string, value: unknown) => void;
  filePreviewUrls?: Record<string, unknown>;
  onRemoveExistingPreview?: (name: string, index: number) => void;
}>;

const inputClass = "h-7 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[12px] text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";
const labelClass = "block text-[12px] font-medium text-gray-700";
const errorClass = "text-[11px] text-red-500";

const FileInputField: React.FC<Readonly<{
  field: EntityFieldConfig;
  value: unknown;
  existingPreview?: unknown;
  error?: string;
  onFieldChange: (name: string, value: unknown) => void;
  onRemoveExistingPreview?: (name: string, index: number) => void;
}>> = ({ field, value, existingPreview, error, onFieldChange, onRemoveExistingPreview }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [limitMessage, setLimitMessage] = React.useState("");
  const files = React.useMemo(() => {
    if (Array.isArray(value)) return value.filter((v): v is File => v instanceof File);
    if (value instanceof File) return [value];
    return [] as File[];
  }, [value]);

  const previewUrls = React.useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  React.useEffect(() => {
    return () => {
      for (const url of previewUrls) URL.revokeObjectURL(url);
    };
  }, [previewUrls]);

  const existingUrls = React.useMemo(() => {
    const isImageLikeUrl = (value: string): boolean =>
      /^https?:\/\//i.test(value) || /^data:image\//i.test(value);

    const pickUrls = (value: unknown): string[] => {
      if (!value) return [];
      if (typeof value === "string") return isImageLikeUrl(value) ? [value] : [];
      if (Array.isArray(value)) return value.flatMap((v) => pickUrls(v));
      if (typeof value === "object") {
        const obj = value as Record<string, unknown>;
        const direct = [obj.url, obj.fileUrl, obj.imageUrl, obj.image, obj.coverImageUrl, obj.logoUrl, obj.path, obj.src]
          .filter((v): v is string => typeof v === "string" && isImageLikeUrl(v));
        if (direct.length > 0) return direct;
        return Object.values(obj).flatMap((v) => pickUrls(v));
      }
      return [];
    };
    return pickUrls(existingPreview);
  }, [existingPreview]);

  const previews = [
    ...previewUrls.map((url, index) => ({ url, kind: "new" as const, index })),
    ...existingUrls.map((url, index) => ({ url, kind: "existing" as const, index })),
  ];
  const maxFiles = field.multiple ? field.maxFiles : undefined;
  const totalFilesCount = files.length + existingUrls.length;
  const isRequired = field.required ?? (!field.name.startsWith("remove") && field.name !== "sortOrder");

  const removeNewAt = (fileIndex: number) => {
    if (field.multiple) {
      const next = files.filter((_, i) => i !== fileIndex);
      onFieldChange(field.name, next);
      return;
    }
    onFieldChange(field.name, null);
  };

  return (
    <div className="col-span-full space-y-2">
      <span className={labelClass}>
        {field.label}
        {isRequired && <span className="ml-1 text-red-500">*</span>}
      </span>
      {/* Dashed upload zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 transition-colors hover:border-[#0071e3]/40 hover:bg-[#0071e3]/5"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white">
          <UploadCloud size={16} className="text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-[11px] text-gray-400">
            {field.accept ? `Accepted: ${field.accept}` : "PNG, JPEG, MP3, MP4"}
            {typeof maxFiles === "number" ? ` · Max ${maxFiles} files` : ""}
          </p>
        </div>
        <span className="rounded-full bg-gray-900 px-3.5 py-1.5 text-[12px] font-medium text-white">
          Browse File
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={field.accept}
        multiple={Boolean(field.multiple)}
        className="hidden"
        onChange={(e) => {
          if (field.multiple) {
            const incoming = Array.from(e.target.files ?? []);
            const existing = Array.isArray(value) ? value.filter((v): v is File => v instanceof File) : [];
            const unique = [...existing, ...incoming].filter(
              (file, index, arr) =>
                arr.findIndex(
                  (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
                ) === index
            );
            const availableSlots = typeof maxFiles === "number" ? Math.max(maxFiles - existingUrls.length, 0) : Number.POSITIVE_INFINITY;
            const next = unique.slice(0, availableSlots);
            if (typeof maxFiles === "number" && unique.length > next.length) {
              setLimitMessage(`Max ${maxFiles} files allowed.`);
            } else {
              setLimitMessage("");
            }
            onFieldChange(field.name, next);
            e.currentTarget.value = "";
            return;
          }
          onFieldChange(field.name, e.target.files?.[0] ?? null);
        }}
      />
      {files.length > 0 && (
        <p className="text-[11px] text-gray-400">Selected: {files.map((f) => f.name).join(", ")}</p>
      )}
      {field.multiple && typeof maxFiles === "number" && (
        <p className="text-[11px] text-gray-400">{Math.min(totalFilesCount, maxFiles)}/{maxFiles}</p>
      )}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {previews.map((item, idx) => (
            <div key={`${field.name}-preview-${item.kind}-${idx}`} className="relative">
              <img
                src={item.url}
                alt={`${field.label} preview ${idx + 1}`}
                className="h-14 w-14 rounded-md border border-gray-200 object-cover"
              />
              {item.kind === "new" ? (
                <button
                  type="button"
                  onClick={() => removeNewAt(item.index)}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600"
                >
                  <Trash2 size={9} />
                </button>
              ) : onRemoveExistingPreview ? (
                <button
                  type="button"
                  onClick={() => onRemoveExistingPreview(field.name, item.index)}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600"
                >
                  <Trash2 size={9} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {limitMessage && <p className="text-[11px] text-amber-600">{limitMessage}</p>}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
};

export const EntityFormRenderer: React.FC<Props> = ({ fields, values, errors, onFieldChange, filePreviewUrls, onRemoveExistingPreview }) => {
  const [passwordVisible, setPasswordVisible] = React.useState<Record<string, boolean>>({});

  const isWideField = (field: EntityFieldConfig): boolean =>
    field.type === "textarea" ||
    field.type === "richtext" ||
    field.type === "file" ||
    field.type === "checkbox" ||
    field.name.toLowerCase().includes("description") ||
    field.name.toLowerCase().includes("message") ||
    field.name.toLowerCase().includes("address");

  const optionalFieldNames = new Set([
    "middlename", "sortOrder", "facebook", "twitter", "linkedin",
    "instagram", "isVerified", "isActive", "addToHome", "isLeader",
  ]);

  const renderLabel = (field: EntityFieldConfig) => {
    const required =
      field.required ??
      (!optionalFieldNames.has(field.name) && !field.name.startsWith("remove") && field.type !== "checkbox");
    return (
      <label className={labelClass}>
        {field.label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
    );
  };

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
      {fields.map((f) => {
        if (f.name === "sortOrder") {
          return null;
        }

        if (f.type === "checkbox") {
          return (
            <label
              key={f.name}
              className="col-span-full flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 transition-colors hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={Boolean(values[f.name])}
                onChange={(e) => onFieldChange(f.name, e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-[#0071e3]"
              />
              <span className="text-[12px] font-medium text-gray-700">{f.label}</span>
            </label>
          );
        }

        if (f.type === "textarea") {
          return (
            <div key={f.name} className="col-span-full space-y-1">
              {renderLabel(f)}
              <textarea
                rows={f.rows ?? 4}
                value={String(values[f.name] ?? "")}
                placeholder={f.placeholder}
                onChange={(e) => onFieldChange(f.name, e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-[12px] text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
              />
              {errors?.[f.name] && <p className={errorClass}>{errors[f.name]}</p>}
            </div>
          );
        }

        if (f.type === "richtext") {
          return (
            <div key={f.name} className="col-span-full space-y-1">
              {renderLabel(f)}
              <RichTextEditor initialContent={String(values[f.name] ?? "")} onChange={(v) => onFieldChange(f.name, v)} />
              {errors?.[f.name] && <p className={errorClass}>{errors[f.name]}</p>}
            </div>
          );
        }

        if (f.type === "select") {
          return (
            <div key={f.name} className={`${isWideField(f) ? "col-span-full" : ""} space-y-1`}>
              {renderLabel(f)}
              <select
                value={String(values[f.name] ?? "")}
                onChange={(e) => onFieldChange(f.name, e.target.value)}
                className={inputClass}
              >
                {(f.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors?.[f.name] && <p className={errorClass}>{errors[f.name]}</p>}
            </div>
          );
        }

        if (f.type === "file") {
          return (
            <FileInputField
              key={f.name}
              field={f}
              value={values[f.name]}
              existingPreview={filePreviewUrls?.[f.name] ?? null}
              error={errors?.[f.name]}
              onFieldChange={onFieldChange}
              onRemoveExistingPreview={onRemoveExistingPreview}
            />
          );
        }

        return (
          <div key={f.name} className={`${isWideField(f) ? "col-span-full" : ""} space-y-1`}>
            {renderLabel(f)}
            {f.type === "password" ? (
              <div className="relative">
                <input
                  type={passwordVisible[f.name] ? "text" : "password"}
                  value={String(values[f.name] ?? "")}
                  placeholder={f.placeholder}
                  onChange={(e) => onFieldChange(f.name, e.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPasswordVisible((prev) => ({ ...prev, [f.name]: !prev[f.name] }))}
                  aria-label={passwordVisible[f.name] ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 border-none bg-transparent p-0 text-gray-400 shadow-none hover:bg-transparent hover:text-gray-600"
                >
                  {passwordVisible[f.name] ? <EyeOff size={12} /> : <Eye size={12} />}
                </Button>
              </div>
            ) : (
              <input
                type={f.type}
                value={String(values[f.name] ?? "")}
                placeholder={f.placeholder}
                onChange={(e) => onFieldChange(f.name, e.target.value)}
                className={inputClass}
              />
            )}
            {errors?.[f.name] && <p className={errorClass}>{errors[f.name]}</p>}
          </div>
        );
      })}
    </div>
  );
};
