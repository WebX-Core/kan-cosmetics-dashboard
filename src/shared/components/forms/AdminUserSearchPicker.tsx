import React from "react";
import { Check, Loader2, Search, ShieldCheck, X } from "lucide-react";
import { useAdminUserSearch, type AdminUserSearchOption } from "@/shared/hooks/useAdminUserSearch";

type Props = Readonly<{
  label: string;
  placeholder?: string;
  value: AdminUserSearchOption | null;
  onChange: (user: AdminUserSearchOption | null) => void;
  required?: boolean;
  helperText?: string;
}>;

export const AdminUserSearchPicker: React.FC<Props> = ({
  label,
  placeholder = "Search users by name, email, or phone",
  value,
  onChange,
  required = false,
  helperText,
}) => {
  const { users, isSearching, search, setSearch } = useAdminUserSearch();
  const [isOpen, setIsOpen] = React.useState(false);
  const closeTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleSelect = (user: AdminUserSearchOption) => {
    onChange(user);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearch("");
    setIsOpen(false);
  };

  const selectedMeta = [value?.email, value?.phone].filter(Boolean).join(" • ");
  const optionMeta = (user: AdminUserSearchOption): string => [user.email, user.phone].filter(Boolean).join(" • ");

  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-medium text-[#1d1d1f]">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>

      {value ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium text-[#1d1d1f]">{value.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#6e6e73]">
              {selectedMeta ? <span>{selectedMeta}</span> : null}
              {selectedMeta ? <span>•</span> : null}
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={11} className="text-[var(--primary)]" />
                {value.role}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            aria-label="Clear selected user"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            size={13}
            strokeWidth={2}
            className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[#86868b]"
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              closeTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 150);
            }}
            placeholder={placeholder}
            className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white pl-[34px] pr-[34px] text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
          />
          {isSearching ? (
            <Loader2
              size={12}
              strokeWidth={2}
              className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 animate-spin text-[var(--primary)]"
            />
          ) : null}

          {isOpen ? (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#d2d2d7] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
              <div className="max-h-72 overflow-auto p-2">
                {users.length > 0 ? (
                  users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(user)}
                      className="group flex w-full items-start justify-between gap-4 rounded-xl px-3 py-2 text-left transition hover:bg-[#f5f5f7]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-[#1d1d1f]">{user.name}</div>
                        <div className="mt-1 text-[12px] text-[#6e6e73]">{optionMeta(user)}</div>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="rounded-full bg-[#f5f5f7] px-2 py-1 text-[11px] font-medium text-[#1d1d1f]">
                          {user.role}
                        </span>
                        <Check size={14} className="text-[var(--primary)] opacity-0 transition group-hover:opacity-100" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-[13px] text-[#6e6e73]">
                    No users found.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {helperText ? <p className="text-[12px] leading-5 text-[#6e6e73]">{helperText}</p> : null}
    </div>
  );
};
