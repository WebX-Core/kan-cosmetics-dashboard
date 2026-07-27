import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "./dashboard.api";

const keys = {
  overview: () => ["dashboard", "overview"] as const,
};

export const useDashboardOverview = () =>
  useQuery({
    queryKey: keys.overview(),
    queryFn: dashboardApi.overview,
    staleTime: 30_000,
  });
