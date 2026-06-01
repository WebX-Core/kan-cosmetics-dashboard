import React from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import {
  ecommerceModules,
  ecommerceSidebarOrder,
} from "@/app/config/ecommerceModules";

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

  const content = (
    <div className="sidebar-enter flex h-full flex-col bg-white">
      {/* Logo — golden: 55px height */}
      <div className="flex h-[55px] items-center justify-between border-b border-[#e5e5e7] px-[21px]">
        <NavLink to="/dashboard" end onClick={onCloseMobile}>
          <img
            src="/logo/kan_logo_gold-01.png"
            className="h-7 w-auto"
            alt="KAN"
          />
        </NavLink>
        <button
          className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#e5e5e7] text-[#6e6e73] hover:bg-[#f5f5f7] md:hidden"
          onClick={onCloseMobile}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Nav */}
      <nav className="hide-scrollbar flex-1 overflow-y-auto px-[13px] py-[13px]">
        {grouped.map((group, groupIndex) => (
          <div
            key={group.section}
            className={groupIndex > 0 ? "mt-[21px]" : ""}
          >
            {group.section !== "Main" && (
              <p className="mb-[5px] px-[8px] text-[10px] font-semibold uppercase tracking-widest text-[#86868b]">
                {group.section}
              </p>
            )}
            <div className="space-y-[2px]">
              {group.modules.map((module, moduleIndex) => {
                const Icon = module.icon;
                const badgeCount = Math.max(
                  0,
                  notificationCounts[module.key] ?? 0,
                );
                const animationDelay = groupIndex * 90 + moduleIndex * 45;
                return (
                  <NavLink
                    key={module.key}
                    to={module.path}
                    end={module.path === "/dashboard"}
                    onClick={onCloseMobile}
                    style={{ animationDelay: `${animationDelay}ms` }}
                    className={({ isActive }) =>
                      `sidebar-item-enter group flex h-[34px] items-center gap-[8px] rounded-lg px-[8px] text-[13px] font-medium transition-colors ${
                        isActive
                          ? "bg-[#0071e3]/10 text-[#0071e3]"
                          : "text-[#1d1d1f] hover:bg-[#f5f5f7]"
                      }`
                    }
                  >
                    <Icon
                      size={15}
                      strokeWidth={module.key === "contacts" ? 2 : 1.75}
                      className="shrink-0 opacity-70 group-[.bg-\\[\\#0071e3\\]\\/10]:opacity-100"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {module.label}
                    </span>
                    {badgeCount > 0 ? (
                      <span className="ml-auto rounded-full bg-red-500 px-[6px] py-px text-[10px] font-bold text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#e5e5e7] px-[21px] py-[13px]">
        <div className="flex items-center justify-center gap-[8px] text-[11px] text-black">
          <span>Powered by</span>
          <a href="https://www.webxnepal.com" target="_blank">
            <img src="/logo/webx.svg" alt="Webx" className="h-3 w-auto " />
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[220px] border-r border-[#e5e5e7] md:block">
        {content}
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
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
};
