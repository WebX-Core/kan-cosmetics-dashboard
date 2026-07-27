import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Bell,
  BellRing,
  Boxes,
  ClipboardList,
  FileClock,
  FileSearch,
  Globe,
  Inbox,
  LayoutDashboard,
  List,
  Mail,
  MessageCircleQuestion,
  Package,
  Rss,
  SearchCheck,
  Send,
  ShieldUser,
  ShoppingCart,
  Star,
  Quote,
  TicketPercent,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

export type EcommerceModule = Readonly<{
  key: string;
  label: string;
  path: string;
  section: string;
  description: string;
  icon: LucideIcon;
  shortcut?: string;
}>;

export const ecommerceModules: ReadonlyArray<EcommerceModule> = [
  { key: "overview", label: "Dashboard", path: "/dashboard", section: "Main", description: "KPI cards, latest orders, low stock, unread inquiries, and recent activity.", icon: LayoutDashboard, shortcut: "D" },

  { key: "products", label: "Products", path: "/dashboard/products", section: "Products", description: "Full product catalog list with stock, price, and category overview.", icon: Package, shortcut: "P" },
  { key: "categories", label: "Categories", path: "/dashboard/categories", section: "Products", description: "Category CRUD, subcategory CRUD, and slug management.", icon: ClipboardList },
  { key: "inventory", label: "Inventory", path: "/dashboard/inventory", section: "Products", description: "Variant-aware stock levels, reserves, adjustments, and low-stock monitoring.", icon: Boxes, shortcut: "I" },

  { key: "orders", label: "Orders", path: "/dashboard/orders", section: "Sales", description: "Order list, status updates, totals, and customer linkage.", icon: ShoppingCart, shortcut: "O" },
  { key: "payments", label: "Payments", path: "/dashboard/payments", section: "Sales", description: "Payment status tracking, transaction lookup, and method filters.", icon: Wallet },
  { key: "coupons", label: "Coupons", path: "/dashboard/coupons", section: "Sales", description: "Coupon CRUD, activation windows, and usage tracking.", icon: TicketPercent },
  { key: "delivery", label: "Delivery", path: "/dashboard/delivery/ready-for-pickup", section: "Sales", description: "Packed orders, bulk pickup requests, shipment timelines, and delivery partner sync.", icon: Truck },
  { key: "carts", label: "Carts", path: "/dashboard/carts", section: "Sales", description: "Active carts, abandoned carts, and line-item visibility.", icon: ShoppingCart },
  { key: "wishlists", label: "Wishlists", path: "/dashboard/wishlists", section: "Sales", description: "Wishlist viewing by customer with product and variant mapping.", icon: Star },

  { key: "customers", label: "Customers", path: "/dashboard/customers", section: "Support", description: "All registered customers with profile, order history, and purchase records.", icon: Users, shortcut: "C" },

  { key: "product-inquiries", label: "Inquiries", path: "/dashboard/support/product-inquiries", section: "Support", description: "Inbox, handled flags, and reply threads for product questions.", icon: Bell },
  { key: "site-inquiries", label: "Site Inquiries", path: "/dashboard/support/site-inquiries", section: "Support", description: "AI digital hair color and site-level inquiry inbox with notes and replies.", icon: SearchCheck },
  { key: "contacts", label: "Contacts", path: "/dashboard/support/contacts", section: "Support", description: "General contact inbox with view and handled state through replies.", icon: Users },
  { key: "reviews", label: "Reviews", path: "/dashboard/reviews", section: "Support", description: "Review moderation with product and site review split.", icon: Star },
  { key: "testimonials", label: "Testimonials", path: "/dashboard/testimonials", section: "Support", description: "Curated site-wide customer testimonials with publish control.", icon: Quote },
  { key: "faqs", label: "FAQs", path: "/dashboard/faqs", section: "Support", description: "FAQ CRUD with product and site FAQ split plus active toggle.", icon: MessageCircleQuestion },

  { key: "blog-posts", label: "Blog", path: "/dashboard/blog-posts", section: "Marketing", description: "Blog post CRUD and publish toggle.", icon: Rss },
  { key: "newsletter", label: "Newsletter", path: "/dashboard/newsletter", section: "Marketing", description: "Subscriber list, subscription state, and segmentation.", icon: Send },
  { key: "email-campaigns", label: "Email Campaigns", path: "/dashboard/marketing/email-campaigns", section: "Marketing", description: "Email marketing campaign management.", icon: Mail },
  { key: "email-recipients", label: "Email Recipients", path: "/dashboard/marketing/email-recipients", section: "Marketing", description: "Recipients linked to email campaigns.", icon: Users },
  { key: "email-recipient-buckets", label: "Recipient Buckets", path: "/dashboard/marketing/email-recipient-buckets", section: "Marketing", description: "Audience buckets for targeted email campaigns.", icon: Archive },
  { key: "email-queue", label: "Email Queue", path: "/dashboard/marketing/email-queue", section: "Marketing", description: "Outbound email queue and delivery status.", icon: List },
  { key: "email-logs", label: "Email Logs", path: "/dashboard/marketing/email-logs", section: "Marketing", description: "Delivery history for all outbound emails.", icon: Inbox },
  { key: "web-push-notifications", label: "Push Notifications", path: "/dashboard/marketing/web-push/notifications", section: "Marketing", description: "Send and manage browser push notifications.", icon: BellRing },
  { key: "web-push-subscriptions", label: "Push Subscriptions", path: "/dashboard/marketing/web-push/subscriptions", section: "Marketing", description: "Browser push notification subscriptions.", icon: Bell },

  { key: "seo", label: "SEO", path: "/dashboard/seo-metadata", section: "Reports", description: "Page-level SEO metadata management by route key.", icon: Globe },
  { key: "activity-logs", label: "Activity", path: "/dashboard/activity-logs", section: "Reports", description: "User and customer activity timeline with filters.", icon: FileClock, shortcut: "A" },
  { key: "audit-logs", label: "Audit", path: "/dashboard/audit-logs", section: "Reports", description: "Admin change trail by entity and actor.", icon: FileSearch },

  { key: "users", label: "Users", path: "/dashboard/users", section: "Administration", description: "Admin users and soft-delete visibility.", icon: ShieldUser, shortcut: "U" },
];

export const ecommerceSidebarOrder: ReadonlyArray<string> = [
  "Main",
  "Products",
  "Sales",
  "Support",
  "Marketing",
  "Reports",
  "Administration",
];
