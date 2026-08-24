import React from "react";
import { Bell, ChevronDown, LogOut, Menu, User } from "lucide-react";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/shared/components/dashboard/BreadCrumbs";
import { GlobalSearch } from "@/shared/components/dashboard/GlobalSearch";

type Props = Readonly<{
  displayName: string;
  roleLabel: string;
  email?: string;
  profilePicture?: string;
  onOpenMobile: () => void;
  onProfile: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
  unreadContactsCount?: number;
  unreadContacts?: ReadonlyArray<{
    id: string;
    name: string;
    email: string;
    createdAt?: string;
  }>;
}>;

export const TopNav: React.FC<Props> = ({
  displayName,
  roleLabel,
  email,
  profilePicture,
  onOpenMobile,
  onProfile,
  onLogout,
  isLoggingOut,
  unreadContactsCount = 0,
  unreadContacts = [],
}) => {
  const [open, setOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [avatarBroken, setAvatarBroken] = React.useState(false);

  React.useEffect(() => {
    setAvatarBroken(false);
  }, [profilePicture]);

  return (
    <header className="sticky top-0 z-30 h-13.75 border-b border-l border-[#e5e5e7] bg-white">
      <div className="flex h-full items-center gap-3.25 px-5.25">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={onOpenMobile}
          className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[#e5e5e7] text-[#6e6e73] hover:bg-[#f5f5f7] md:hidden"
        >
          <Menu size={16} strokeWidth={2} />
        </button>

        <div className="hidden min-w-0 flex-1 md:block">
          <Breadcrumbs />
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch />

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((v) => !v)}
              className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[#e5e5e7] text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
            >
              <Bell size={15} strokeWidth={2} />
              {unreadContactsCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.75 text-[9px] font-bold text-white">
                  {unreadContactsCount > 9 ? "9+" : unreadContactsCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute right-0 top-10.5 z-50 w-[320px] overflow-hidden rounded-xl border border-[#e5e5e7] bg-white shadow-lg">
                  <div className="border-b border-[#f0f0f2] px-5.25 py-3.25">
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">
                      Unread Contacts
                    </p>
                  </div>
                  {unreadContacts.length === 0 ? (
                    <div className="px-5.25 py-8.5 text-center text-[13px] text-[#6e6e73]">
                      No unread contacts.
                    </div>
                  ) : (
                    <div className="max-h-70 overflow-auto">
                      {unreadContacts.slice(0, 8).map((contact) => (
                        <Link
                          to={`/dashboard/support/contacts/${contact.id}`}
                          key={contact.id}
                          className="block border-b border-[#f5f5f7] px-5.25 py-3.25 transition-colors hover:bg-[#fafafa] last:border-0"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-[#1d1d1f]">
                                {contact.name || contact.email}
                              </p>
                              <p className="truncate text-[12px] text-[#6e6e73]">
                                {contact.email}
                              </p>
                              {contact.createdAt && (
                                <p className="mt-0.75 text-[11px] text-[#86868b]">
                                  {new Date(contact.createdAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 rounded-full bg-red-50 px-2 py-px text-[10px] font-semibold text-red-600">
                              New
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-[#f0f0f2] p-2">
                    <Link
                      to="/dashboard/support/contacts"
                      onClick={() => setNotificationsOpen(false)}
                      className="block rounded-full bg-blue-500 px-5.25 py-2 text-center text-[13px] font-medium text-white! hover:bg-blue-600"
                    >
                      View All Contacts
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              type="button"
              className="flex h-8.5 items-center gap-2 rounded-full border border-[#e5e5e7] pl-1.25 pr-3.25 transition-colors hover:bg-[#f5f5f7]"
            >
              {profilePicture && !avatarBroken ? (
                <img
                  src={profilePicture}
                  alt={displayName}
                  className="h-6 w-6 rounded-full object-cover"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-[11px] font-semibold text-white">
                  {(displayName[0] ?? "K").toUpperCase()}
                </span>
              )}
              <div className="hidden text-left md:block">
                <p className="text-[13px] font-medium text-[#1d1d1f] leading-none">
                  {displayName}
                </p>
              </div>
              <ChevronDown
                size={13}
                strokeWidth={2}
                className="hidden text-[#86868b] md:block"
              />
            </button>

            {open && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOpen(false)}
                />
                <div className="absolute right-0 top-10.5 z-50 w-55 overflow-hidden rounded-xl border border-[#e5e5e7] bg-white shadow-lg">
                  <div className="border-b border-[#f0f0f2] px-5.25 py-3.25">
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">
                      {displayName}
                    </p>
                    <p className="mt-0.75 text-[12px] text-[#6e6e73]">
                      {email ?? "—"}
                    </p>
                    <p className="mt-1 text-[8px] text-[#6e6e73] leading-none">
                      {roleLabel}
                    </p>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        onProfile();
                        setOpen(false);
                      }}
                      className="flex h-8.5 w-full items-center gap-2 rounded-lg px-3.25 text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
                    >
                      <User size={14} strokeWidth={2} />
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        setOpen(false);
                      }}
                      disabled={isLoggingOut}
                      className="mt-0.5 flex h-8.5 w-full items-center gap-2 rounded-lg px-3.25 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <LogOut size={14} strokeWidth={2} />
                      {isLoggingOut ? "Logging out…" : "Log Out"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
