import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Save, Trash2, UploadCloud } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { billingApi, useSaveCompanySetting, type CompanySetting, type CompanySettingDto } from "@/features/billing";
import { ModernFormLayout, FormActions, FormField, FormSection } from "@/shared/components/forms/ModernFormLayout";

type Form = Omit<CompanySettingDto, "logo"> & { logo: File | null };
const empty: Form = { companyName: "", legalName: "", senderName: "", logoUrl: "", logo: null, address: "", city: "", district: "", country: "Nepal", phone: "", email: "", website: "", vatNumber: "", panNumber: "", registrationNumber: "", invoicePrefix: "KAN", fiscalYear: "", invoiceStartNumber: 1, billingNote: "", termsAndConditions: "", isActive: true };
const inputClass = "h-9 w-full rounded-lg border border-[#d2d2d7] bg-white px-3 text-[12px] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const textareaClass = "min-h-24 w-full rounded-lg border border-[#d2d2d7] bg-white p-3 text-[12px] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const toForm = (row: CompanySetting): Form => ({ ...empty, ...row, logoUrl: row.logoUrl ?? "", logo: null });

type LogoUploaderProps = Readonly<{
  file: File | null;
  existingUrl: string;
  onChange: (file: File | null) => void;
  onClearExisting: () => void;
}>;

const LogoUploader: React.FC<LogoUploaderProps> = ({ file, existingUrl, onChange, onClearExisting }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const previewUrl = React.useMemo(() => file ? URL.createObjectURL(file) : existingUrl, [file, existingUrl]);

  React.useEffect(() => () => { if (file && previewUrl) URL.revokeObjectURL(previewUrl); }, [file, previewUrl]);
  const select = (files: FileList | null) => {
    const selected = files?.[0];
    if (selected?.type.startsWith("image/")) onChange(selected);
  };
  const clear = () => {
    if (file) onChange(null);
    else onClearExisting();
    if (inputRef.current) inputRef.current.value = "";
  };

  if (previewUrl) return <div className="flex items-center gap-4 rounded-xl border border-[#d2d2d7] bg-white p-3">
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e5e5e7] bg-[#f5f5f7]"><img src={previewUrl} alt="Company logo preview" className="h-full w-full object-contain"/></div>
    <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-[#1d1d1f]">{file?.name || "Current company logo"}</p><p className="mt-1 text-[11px] text-[#86868b]">{file ? `${(file.size / 1024).toFixed(1)} KB · New upload` : "Logo currently saved on this profile"}</p><button type="button" onClick={() => inputRef.current?.click()} className="mt-3 text-[11px] font-semibold text-[var(--primary)] hover:underline">Replace image</button></div>
    <button type="button" onClick={clear} aria-label="Remove logo" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d2d2d7] text-[#86868b] transition hover:border-red-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={14}/></button>
    <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => select(event.target.files)} className="hidden"/>
  </div>;

  return <button type="button" onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files); }} className={`flex min-h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 py-6 text-center transition ${dragging ? "border-[var(--primary)] bg-indigo-50/60" : "border-[#c7c7cc] bg-[#fafafa] hover:border-[var(--primary)] hover:bg-indigo-50/30"}`}>
    <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--primary)] shadow-sm ring-1 ring-black/5"><UploadCloud size={18}/></span>
    <span className="text-[12px] font-semibold text-[#1d1d1f]">Choose a logo or drag it here</span>
    <span className="mt-1 text-[11px] text-[#86868b]">PNG, JPG, WebP or SVG</span>
    <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => select(event.target.files)} className="hidden"/>
  </button>;
};

export const CompanySettingFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const save = useSaveCompanySetting();
  const [form, setForm] = React.useState<Form>(empty);
  const query = useQuery({ queryKey: ["billing", "company-settings", id], queryFn: () => billingApi.companySettings.get(id!), enabled: isEdit });

  React.useEffect(() => { if (query.data) setForm(toForm(query.data)); }, [query.data]);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((previous) => ({ ...previous, [key]: value }));
  const submit: React.FormEventHandler = async (event) => {
    event.preventDefault();
    await save.mutateAsync({ id, dto: form });
    navigate("/dashboard/company-settings");
  };

  if (isEdit && query.isLoading) return <div className="flex min-h-[400px] items-center justify-center text-sm text-[#86868b]"><Loader2 size={18} className="mr-2 animate-spin"/> Loading company profile…</div>;

  return <ModernFormLayout title={isEdit ? "Edit Company Profile" : "Create Company Profile"} subtitle="Configure the seller identity and invoice details used when bills are generated." onBack={() => navigate("/dashboard/company-settings")}>
    <form onSubmit={submit} className="space-y-[21px]">
      <FormSection title="Company Details" description="Business identity shown on shipping labels and VAT bills.">
        <div className="grid gap-[13px] md:grid-cols-2">
          <FormField label="Company name" required><input required value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={inputClass}/></FormField>
          <FormField label="Legal name"><input value={form.legalName ?? ""} onChange={(e) => set("legalName", e.target.value)} className={inputClass}/></FormField>
          <FormField label="Sender name"><input value={form.senderName ?? ""} onChange={(e) => set("senderName", e.target.value)} className={inputClass}/></FormField>
          <FormField label="Address" required><input required value={form.address} onChange={(e) => set("address", e.target.value)} className={inputClass}/></FormField>
          {([ ["city", "City"], ["district", "District"], ["country", "Country"], ["phone", "Phone"], ["email", "Email"], ["website", "Website"] ] as const).map(([key, label]) => <FormField key={key} label={label}><input type={key === "email" ? "email" : key === "website" ? "url" : "text"} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} className={inputClass}/></FormField>)}
        </div>
      </FormSection>
      <FormSection title="Registration & Invoicing" description="Tax registration and invoice-numbering configuration.">
        <div className="grid gap-[13px] md:grid-cols-2">
          {([ ["vatNumber", "VAT number"], ["panNumber", "PAN number"], ["registrationNumber", "Registration number"], ["invoicePrefix", "Invoice prefix"], ["fiscalYear", "Fiscal year"] ] as const).map(([key, label]) => <FormField key={key} label={label} required={key === "invoicePrefix"}><input required={key === "invoicePrefix"} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} className={inputClass}/></FormField>)}
          <FormField label="Invoice start number"><input type="number" min={1} value={form.invoiceStartNumber} onChange={(e) => set("invoiceStartNumber", Number(e.target.value))} className={inputClass}/></FormField>
        </div>
      </FormSection>
      <FormSection title="Branding & Bill Content" description="Add the company logo and optional text printed on invoices.">
        <div className="grid gap-[13px] md:grid-cols-2">
          <FormField label="Logo URL"><input type="url" value={form.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} className={inputClass}/></FormField>
          <div className="md:col-span-2"><FormField label="Company logo" hint="The uploaded file takes priority over the logo URL."><LogoUploader file={form.logo} existingUrl={form.logoUrl ?? ""} onChange={(file) => set("logo", file)} onClearExisting={() => set("logoUrl", "")}/></FormField></div>
          <div className="md:col-span-2"><FormField label="Billing note"><textarea value={form.billingNote ?? ""} onChange={(e) => set("billingNote", e.target.value)} className={textareaClass}/></FormField></div>
          <div className="md:col-span-2"><FormField label="Terms and conditions"><textarea value={form.termsAndConditions ?? ""} onChange={(e) => set("termsAndConditions", e.target.value)} className={textareaClass}/></FormField></div>
          <label className="flex items-center gap-2 text-[12px] font-medium text-gray-700"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 rounded border-[#d2d2d7]"/> Use as active billing profile</label>
        </div>
      </FormSection>
      <FormActions onCancel={() => navigate("/dashboard/company-settings")} isSubmitting={save.isPending} submitLabel={isEdit ? "Update Company Profile" : "Create Company Profile"} submitIcon={<Save size={11}/>}/>
    </form>
  </ModernFormLayout>;
};
