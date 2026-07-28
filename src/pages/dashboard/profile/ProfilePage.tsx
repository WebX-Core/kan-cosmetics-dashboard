import React from "react";
import { CheckCircle2, ChevronDown, Upload, X } from "lucide-react";
import { useAuth } from "@/app/providers/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useAdminUsersGet, useUpdateAdminUser } from "@/features/adminUsers";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { resolveProfileImageUrl } from "@/shared/utils/profileImage";

type FormState = Readonly<{
  firstname: string;
  middlename: string;
  lastname: string;
  phone: string;
  address: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  profile: File | null;
}>;

type CompletionItem = Readonly<{
  label: string;
  filled: boolean;
  weight: number;
}>;

export const ProfilePage: React.FC = () => {
  const { state } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const user = state.user;
  const userId = typeof user?.id === "string" ? user.id : "";
  const query = useAdminUsersGet(userId, Boolean(userId));
  const updateMutation = useUpdateAdminUser();
  const fetchedUser = (query.data ?? {}) as Record<string, unknown>;

  const [form, setForm] = React.useState<FormState>({
    firstname: "",
    middlename: "",
    lastname: "",
    phone: "",
    address: "",
    gender: "OTHER",
    profile: null,
  });

  React.useEffect(() => {
    const row = query.data as Record<string, unknown> | undefined;
    if (!row) return;
    setForm((prev) => ({
      ...prev,
      firstname: typeof row.firstname === "string" ? row.firstname : "",
      middlename: typeof row.middlename === "string" ? row.middlename : "",
      lastname: typeof row.lastname === "string" ? row.lastname : "",
      phone: typeof row.phone === "string" ? row.phone : "",
      address: typeof row.address === "string" ? row.address : "",
      gender:
        row.gender === "MALE" || row.gender === "FEMALE" || row.gender === "OTHER"
          ? row.gender
          : "OTHER",
      profile: null,
    }));
  }, [query.data]);

  const profilePreviewUrl = React.useMemo(() => {
    if (form.profile) return URL.createObjectURL(form.profile);
    return resolveProfileImageUrl(query.data ?? user ?? null);
  }, [form.profile, query.data, user]);

  const profileCompletion = React.useMemo(() => {
    const completionItems: ReadonlyArray<CompletionItem> = [
      { label: "First name", filled: form.firstname.trim().length > 0, weight: 20 },
      { label: "Last name", filled: form.lastname.trim().length > 0, weight: 20 },
      { label: "Phone", filled: form.phone.trim().length > 0, weight: 15 },
      { label: "Address", filled: form.address.trim().length > 0, weight: 20 },
      { label: "Gender", filled: form.gender.trim().length > 0, weight: 10 },
      { label: "Photo", filled: Boolean(form.profile || profilePreviewUrl), weight: 15 },
    ];

    const totalWeight = completionItems.reduce((sum, item) => sum + item.weight, 0);
    const completedWeight = completionItems.reduce(
      (sum, item) => sum + (item.filled ? item.weight : 0),
      0,
    );

    return {
      items: completionItems,
      percent: totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0,
      completedWeight,
      totalWeight,
    };
  }, [form.address, form.firstname, form.gender, form.lastname, form.phone, form.profile, profilePreviewUrl]);

  React.useEffect(() => {
    return () => {
      if (form.profile && profilePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(profilePreviewUrl);
      }
    };
  }, [form.profile, profilePreviewUrl]);

  const saving = updateMutation.isPending;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!userId) {
      toast.error("Current user is not available.");
      return;
    }
    if (!form.firstname.trim() || !form.lastname.trim()) {
      toast.error("First name and last name are required.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: userId,
        payload: {
          firstname: form.firstname.trim(),
          middlename: form.middlename.trim() || undefined,
          lastname: form.lastname.trim(),
          email:
            (typeof fetchedUser.email === "string" && fetchedUser.email) ||
            (typeof user?.email === "string" ? user.email : ""),
          phone: form.phone.trim(),
          address: form.address.trim(),
          gender: form.gender,
          isVerified:
            typeof fetchedUser.isVerified === "boolean" ? fetchedUser.isVerified : true,
          profile: form.profile ?? undefined,
        },
      });
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (!userId) {
    return <div className="p-6 text-sm text-[#6e6e73]">No active user found.</div>;
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
  const readonlyClass =
    "h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 text-[14px] text-[#1d1d1f]";

  return (
    <ModernFormLayout title="Edit Profile" subtitle="Update your account details.">
      <div className="rounded-[18px] border border-[#d2d2d7] bg-white p-[18px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[56ch] space-y-2">
            <div className="text-[11px] font-medium tracking-[0.14em] text-[#6e6e73]">
              Profile completion
            </div>
            <div className="text-[13px] leading-5 text-[#424245]">
              Based on the editable profile fields. Address counts when it is filled in, so
              incomplete location data lowers the score.
            </div>
            <div className="text-[11px] text-[#6e6e73]">
              {profileCompletion.completedWeight} of {profileCompletion.totalWeight} weighted points filled
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[28px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
              {profileCompletion.percent}%
            </div>
            <div className="text-[11px] text-[#6e6e73]">
              {profileCompletion.percent === 100 ? "Complete" : "In progress"}
            </div>
          </div>
        </div>

        <div
          role="progressbar"
          aria-label="Profile completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={profileCompletion.percent}
          className="mt-4 h-2 overflow-hidden rounded-full bg-[#ececf0]"
        >
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300 ease-out"
            style={{ width: `${profileCompletion.percent}%` }}
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {profileCompletion.items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-2xl border border-[#ececf0] bg-[#fafafa] px-3 py-2 text-[12px] text-[#424245]"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  item.filled ? "bg-emerald-50 text-emerald-600" : "bg-[#ececf0] text-[#8e8e93]"
                }`}
                aria-hidden="true"
              >
                <CheckCircle2 size={13} strokeWidth={2.2} />
              </span>
              <span className="flex-1">{item.label}</span>
              <span className="text-[11px] text-[#6e6e73]">
                {item.filled ? "Filled" : "Missing"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-[21px]">
        <FormSection title="Account">
          <div className="grid gap-[13px] md:grid-cols-2">
            <FormField label="Email">
              <input
                type="text"
                value={typeof user?.email === "string" ? user.email : ""}
                readOnly
                className={readonlyClass}
              />
            </FormField>
            <FormField label="Role">
              <input
                type="text"
                value={state.role ?? ""}
                readOnly
                className={readonlyClass}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Personal Details">
          <div className="grid gap-[13px] md:grid-cols-3">
            <FormField label="First Name" required>
              <input
                type="text"
                value={form.firstname}
                onChange={(e) => setForm((prev) => ({ ...prev, firstname: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Middle Name">
              <input
                type="text"
                value={form.middlename}
                onChange={(e) => setForm((prev) => ({ ...prev, middlename: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Last Name" required>
              <input
                type="text"
                value={form.lastname}
                onChange={(e) => setForm((prev) => ({ ...prev, lastname: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Phone">
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Gender">
              <div className="relative">
                <select
                  value={form.gender}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      gender: e.target.value as "MALE" | "FEMALE" | "OTHER",
                    }))
                  }
                  className={`${inputClass} appearance-none pr-9`}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              </div>
            </FormField>
            <FormField label="Address">
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className={inputClass}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Profile Photo">
          <div className="flex items-start gap-5">
            <div className="relative h-[80px] w-[80px] shrink-0">
              <div className="h-[80px] w-[80px] overflow-hidden rounded-full border border-[#d2d2d7] bg-[#f5f5f7]">
                {profilePreviewUrl ? (
                  <img src={profilePreviewUrl} alt="Profile photo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-[#86868b]">No photo</div>
                )}
              </div>
              {form.profile && (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, profile: null }))}
                  aria-label="Remove photo"
                  className="absolute -right-1 -top-1 flex h-[20px] w-[20px] items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] shadow-sm hover:text-red-600 transition-colors"
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#d2d2d7] bg-white px-4 h-11 text-[14px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]">
                <Upload size={14} className="text-[#6e6e73]" />
                {form.profile ? "Change Photo" : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => setForm((prev) => ({ ...prev, profile: e.target.files?.[0] ?? null }))}
                />
              </label>
              <p className="text-[12px] text-[#86868b]">JPG, PNG or GIF. Max 5 MB.</p>
            </div>
          </div>
        </FormSection>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/change-password"
            className="inline-flex h-[34px] items-center rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            Change Password
          </Link>
          <FormActions
            submitLabel={saving ? "Saving..." : "Save Profile"}
            isSubmitting={saving}
            onCancel={() => navigate("/dashboard")}
          />
        </div>
      </form>
    </ModernFormLayout>
  );
};
