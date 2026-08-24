import React from "react";
import { NavLink } from "react-router-dom";
import { ChevronLeft, X } from "lucide-react";
import {
  ecommerceModules,
  ecommerceSidebarOrder,
  type EcommerceModule,
} from "@/app/config/ecommerceModules";
import {
  SidebarHoverHighlightGroup,
  useSidebarHoverHighlight,
} from "@/shared/components/dashboard/SidebarHoverHighlight";

interface SidebarNavItemProps {
  module: EcommerceModule;
  isCollapsed: boolean;
  badgeCount: number;
  animationDelay: number;
  onCloseMobile: () => void;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  module,
  isCollapsed,
  badgeCount,
  animationDelay,
  onCloseMobile,
}) => {
  const Icon = module.icon;
  const { onMouseEnter, onMouseLeave } = useSidebarHoverHighlight();

  return (
    <NavLink
      to={module.path}
      end={module.path === "/dashboard"}
      onClick={onCloseMobile}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ animationDelay: `${animationDelay}ms` }}
      title={isCollapsed ? module.label : undefined}
      className={({ isActive }) =>
        `sidebar-item-enter group relative z-10 flex h-[34px] items-center rounded-lg text-[13px] font-medium transition-[background-color,color,padding,gap] duration-200 ${
          isCollapsed ? "justify-center gap-0 px-0" : "gap-[8px] px-[8px]"
        } ${
          isActive
            ? "bg-[var(--primary)]/10 text-[var(--primary)]"
            : "text-[#1d1d1f]"
        }`
      }
    >
      <Icon
        size={15}
        strokeWidth={module.key === "contacts" ? 2 : 1.75}
        className="shrink-0 opacity-70 group-[.bg-\\[\\var(--primary)\\]\\/10]:opacity-100"
      />
      <span
        className={`min-w-0 flex-1 truncate transition-all duration-200 ${
          isCollapsed ? "w-0 flex-none opacity-0" : "opacity-100"
        }`}
        aria-hidden={isCollapsed}
      >
        {module.label}
      </span>
      {badgeCount > 0 ? (
        <span
          className={`rounded-full bg-red-500 text-[10px] font-bold text-white transition-all duration-200 ${
            isCollapsed
              ? "absolute right-[7px] top-[6px] h-[7px] w-[7px] overflow-hidden p-0 text-transparent"
              : "ml-auto px-[6px] py-px"
          }`}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </NavLink>
  );
};

type Props = Readonly<{
  canUsersManage: boolean;
  canContactManage: boolean;
  hasModuleAccess?: (moduleKey: string) => boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  notificationCounts?: Partial<Record<string, number>>;
}>;

export const Sidebar: React.FC<Props> = ({
  canUsersManage,
  canContactManage,
  hasModuleAccess,
  mobileOpen,
  onCloseMobile,
  notificationCounts = {},
}) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const filtered = ecommerceModules.filter((module) => {
    if (hasModuleAccess && !hasModuleAccess(module.key)) return false;
    if (module.key === "users" || module.key === "permissions")
      return canUsersManage;
    if (module.key === "contacts") return canContactManage;
    return true;
  });

  const grouped = ecommerceSidebarOrder
    .map((section) => ({
      section,
      modules: filtered.filter((module) => module.section === section),
    }))
    .filter((group) => group.modules.length > 0);

  const content = (mode: "desktop" | "mobile") => {
    const isDesktop = mode === "desktop";
    const isCollapsed = isDesktop && collapsed;

    return (
    <div
      className={`sidebar-enter flex h-full flex-col bg-white transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isCollapsed ? "w-[68px]" : "w-[220px]"
      }`}
      data-state={isCollapsed ? "collapsed" : "expanded"}
    >
      {/* Logo — golden: 55px height */}
      <div
        className={`flex items-center border-b border-[#e5e5e7] transition-[padding] duration-300 ${
          isCollapsed
            ? "h-auto flex-col gap-[10px] px-[10px] py-[10px]"
            : "h-[55px] justify-between px-[21px]"
        }`}
      >
        <NavLink
          to="/dashboard"
          end
          onClick={onCloseMobile}
          className="flex min-w-0 items-center justify-center"
          aria-label="Dashboard"
        >
          <img
            src="/logo/kan-blue.png"
            className={`h-7 w-auto object-contain transition-all duration-300 ${
              isCollapsed ? "max-w-[34px]" : "max-w-[118px]"
            }`}
            alt="KAN"
          />
        </NavLink>
        {isDesktop ? (
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] shadow-sm transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              size={14}
              strokeWidth={2}
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        ) : !isCollapsed ? (
          <button
            className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#e5e5e7] text-[#6e6e73] hover:bg-[#f5f5f7]"
            onClick={onCloseMobile}
          >
            <X size={14} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      {/* Nav */}
      <nav
        className={`hide-scrollbar flex-1 overflow-y-auto transition-[padding] duration-300 ${
          isCollapsed ? "px-[8px] py-[13px]" : "px-[13px] py-[13px]"
        }`}
      >
        {grouped.map((group, groupIndex) => (
          <div
            key={group.section}
            className={groupIndex > 0 ? "mt-[21px]" : ""}
          >
            {group.section !== "Main" && (
              <p
                className={`mb-[5px] overflow-hidden whitespace-nowrap px-[8px] text-[10px] font-semibold uppercase tracking-widest text-[#86868b] transition-all duration-200 ${
                  isCollapsed ? "h-0 opacity-0" : "h-[16px] opacity-100"
                }`}
                aria-hidden={isCollapsed}
              >
                {group.section}
              </p>
            )}
            <SidebarHoverHighlightGroup>
              {group.modules.map((module, moduleIndex) => (
                <SidebarNavItem
                  key={module.key}
                  module={module}
                  isCollapsed={isCollapsed}
                  badgeCount={Math.max(0, notificationCounts[module.key] ?? 0)}
                  animationDelay={groupIndex * 90 + moduleIndex * 45}
                  onCloseMobile={onCloseMobile}
                />
              ))}
            </SidebarHoverHighlightGroup>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className={`border-t border-[#e5e5e7] py-[13px] transition-[padding] duration-300 ${
          isCollapsed ? "px-[8px]" : "px-[21px]"
        }`}
      >
        <div className="flex items-center justify-center gap-[8px] text-[11px] text-black">
          <span
            className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${
              isCollapsed ? "w-0 opacity-0" : "opacity-100"
            }`}
            aria-hidden={isCollapsed}
          >
            Powered by
          </span>
          <a href="https://www.webxnepal.com" target="_blank" rel="noreferrer">
            <img src="/logo/webx.svg" alt="Webx" className="h-3 w-auto" />
          </a>
        </div>
      </div>
    </div>
  );
  };

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-[#e5e5e7] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:block ${
          collapsed ? "w-[68px]" : "w-[220px]"
        }`}
      >
        {content("desktop")}
      </aside>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        >
          <aside
            className="sidebar-enter h-full w-[220px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {content("mobile")}
          </aside>
        </div>
      ) : null}
    </>
  );
};
