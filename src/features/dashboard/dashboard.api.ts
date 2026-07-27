import { api, unwrap } from "@/shared/api/api";
import type { DashboardOverviewResponse } from "./dashboard.types";

export const dashboardApi = {
  overview: async () =>
    unwrap<DashboardOverviewResponse>(await api.get("/dashboard/overview")),
};
