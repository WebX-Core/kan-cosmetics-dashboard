export type DashboardOverviewCustomer = Readonly<{
  id?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  profilePicture?: string | null;
}>;

export type DashboardOverviewOrderItem = Readonly<{
  id?: string;
  productId?: string | null;
  productName?: string;
  productSlug?: string | null;
  productVariantId?: string | null;
  variantName?: string | null;
  variantType?: string | null;
  variantValue?: string | null;
  price?: string | number;
  quantity?: number;
  subtotal?: string | number;
  image?: string | null;
}>;

export type DashboardOverviewAddress = Readonly<{
  id?: string;
  type?: string;
  fullName?: string;
  phone?: string;
  secondaryPhone?: string | null;
  destinationBranch?: string | null;
  destinationBranchCode?: string | null;
  destinationCityArea?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  district?: string | null;
  area?: string | null;
  landmark?: string | null;
  postalCode?: string;
  country?: string;
}>;

export type DashboardOverviewOrder = Readonly<{
  id?: string;
  orderNumber?: string;
  orderStatus?: string;
  paymentStatus?: string;
  orderSource?: string;
  subtotalAmount?: string | number;
  discountAmount?: string | number;
  shippingAmount?: string | number;
  totalAmount?: string | number;
  editableUntil?: string;
  deliveryAutoAssigned?: boolean;
  deliveryAssignedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  customer?: DashboardOverviewCustomer | null;
  itemCount?: number;
  quantityTotal?: number;
  items?: ReadonlyArray<DashboardOverviewOrderItem>;
  shippingAddress?: DashboardOverviewAddress | null;
}>;

export type DashboardOverviewInquiry = Readonly<Record<string, unknown>>;

export type DashboardSummary = Readonly<{
  totalOrders: number;
  totalSales: number;
  customerGrowth: number;
  totalRevenue: number;
  orderTrendPercent: number;
  salesTrendPercent: number;
  customerGrowthPercent: number;
  revenueTrendPercent: number;
}>;

export type DashboardSalesPoint = Readonly<{
  label: string;
  value: number;
}>;

export type DashboardSalesOverview = Readonly<{
  "7d": ReadonlyArray<DashboardSalesPoint>;
  "1m": ReadonlyArray<DashboardSalesPoint>;
  "6m": ReadonlyArray<DashboardSalesPoint>;
  "12m": ReadonlyArray<DashboardSalesPoint>;
}>;

export type DashboardCategorySale = Readonly<{
  name: string;
  count: number;
  revenue: number;
}>;

export type DashboardSalesActivity = Readonly<{
  packed: number;
  delivered: number;
  shipped: number;
  invoicedRevenue: number;
}>;

export type DashboardTopProduct = Readonly<{
  id: string | null;
  name: string;
  slug: string | null;
  category: string;
  image: string | null;
  quantitySold: number;
  orderCount: number;
  revenue: number;
}>;

export type DashboardVisitorsByCountry = Readonly<{
  country: string;
  sessions: number;
  users: number;
  percentage: number;
}>;

export type DashboardVisitorMetrics = Readonly<{
  sessions: number;
  users: number;
  countries: ReadonlyArray<DashboardVisitorsByCountry>;
}>;

export type DashboardOverviewResponse = Readonly<{
  summary: DashboardSummary;
  salesOverview: DashboardSalesOverview;
  categorySales: ReadonlyArray<DashboardCategorySale>;
  salesActivity: DashboardSalesActivity;
  topProducts: Readonly<{
    "7d": ReadonlyArray<DashboardTopProduct>;
    "30d": ReadonlyArray<DashboardTopProduct>;
  }>;
  visitors: Readonly<{
    today: DashboardVisitorMetrics;
    "7d": DashboardVisitorMetrics;
    "30d": DashboardVisitorMetrics;
  }>;
  recentOrders: ReadonlyArray<DashboardOverviewOrder>;
  recentInquiries: ReadonlyArray<DashboardOverviewInquiry>;
}>;
