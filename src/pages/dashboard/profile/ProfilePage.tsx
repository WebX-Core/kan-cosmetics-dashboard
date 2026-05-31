import React from "react";
import { ChevronDown, Upload, X } from "lucide-react";
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
    "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";
  const readonlyClass =
    "h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 text-[14px] text-[#1d1d1f]";

  return (
    <ModernFormLayout title="Edit Profile" subtitle="Update your account details.">
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
