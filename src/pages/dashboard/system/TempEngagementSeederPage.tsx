import React from "react";
import { Beaker, Loader2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { engagementApi } from "@/features/engagement";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

const COUNT_PER_TYPE = 5;
const TOTAL = COUNT_PER_TYPE * 3;
const BASE_PHONE = 9804940177;

const pad = (value: number): string => String(value).padStart(2, "0");
const nextPhone = (offset: number): string => `+977${String(BASE_PHONE + offset)}`;

export const TempEngagementSeederPage: React.FC = () => {
  const toast = useToast();

  const createInquiry = engagementApi.inquiries.crud.hooks.useCreate();
  const createSiteInquiry = engagementApi.siteInquiries.hooks.useCreate();
  const createContact = engagementApi.contacts.hooks.useCreate();

  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(0);
  const [status, setStatus] = React.useState("Ready to create fake engagement records.");

  const progress = Math.round((done / TOTAL) * 100);

  const runSeeder = async () => {
    if (running) return;
    const stamp = Date.now();
    setRunning(true);
    setDone(0);

    try {
      for (let i = 1; i <= COUNT_PER_TYPE; i += 1) {
        const index = pad(i);
        setStatus(`Creating inquiry ${i}/${COUNT_PER_TYPE}`);
        await createInquiry.mutateAsync({
          name: `Inquiry User ${index}`,
          email: `inquiry${stamp}${index}@example.com`,
          phone: nextPhone(i - 1),
          message: `Fake product inquiry #${index}`,
        });
        setDone((prev) => prev + 1);
      }

      for (let i = 1; i <= COUNT_PER_TYPE; i += 1) {
        const index = pad(i);
        setStatus(`Creating site inquiry ${i}/${COUNT_PER_TYPE}`);
        await createSiteInquiry.mutateAsync({
          fullName: `Site User ${index}`,
          email: `site${stamp}${index}@example.com`,
          phone: nextPhone(COUNT_PER_TYPE + i - 1),
          inquiryType: "information",
          details: `Fake site inquiry #${index}`,
          sourcePage: "/contact",
        });
        setDone((prev) => prev + 1);
      }

      for (let i = 1; i <= COUNT_PER_TYPE; i += 1) {
        const index = pad(i);
        setStatus(`Creating contact ${i}/${COUNT_PER_TYPE}`);
        await createContact.mutateAsync({
          fullname: `Contact User ${index}`,
          email: `contact${stamp}${index}@example.com`,
          phoneNo: nextPhone(COUNT_PER_TYPE * 2 + i - 1),
          address: "Kathmandu, Nepal",
          purpose: "Administration",
          message: `Fake contact message #${index}`,
        });
        setDone((prev) => prev + 1);
      }

      setStatus("Seeder completed.");
      toast.success("Created 5 inquiries, 5 site inquiries, and 5 contacts.");
    } catch (error) {
      setStatus("Seeder failed.");
      toast.error(parseApiError(error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <PageLayout
      title="Temporary Engagement Seeder"
      subtitle="Creates fake records for product inquiries, site inquiries, and contact messages."
    >
      <div className="max-w-[760px] rounded-xl border border-[#e5e5e7] bg-white p-5">
        <div className="mb-3 flex items-center gap-2 text-[14px] text-[#1d1d1f]">
          <Beaker size={16} className="text-[#0071e3]" />
          Temporary utility route for local testing.
        </div>

        <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-[#f0f0f2]">
          <div
            className="h-full rounded-full bg-[#0071e3] transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="mb-4 flex items-center justify-between text-[12px] text-[#6e6e73]">
          <span>{status}</span>
          <span>
            {done}/{TOTAL} ({progress}%)
          </span>
        </div>

        <button
          type="button"
          disabled={running}
          onClick={() => void runSeeder()}
          className="inline-flex h-[34px] items-center gap-2 rounded-full bg-[#0071e3] px-[21px] text-[13px] font-medium text-white transition-colors hover:bg-[#0066cc] disabled:opacity-50"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Beaker size={14} />}
          {running ? "Creating..." : "Create 5 Each"}
        </button>
      </div>
    </PageLayout>
  );
};
