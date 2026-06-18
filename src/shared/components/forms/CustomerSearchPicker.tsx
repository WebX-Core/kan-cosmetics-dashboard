import React from "react";
import { Check, Loader2, X } from "lucide-react";
import {
  useCustomerSearch,
  type CustomerSearchOption,
} from "@/shared/hooks/useCustomerSearch";

type Props = Readonly<{
  label: string;
  placeholder?: string;
  value: CustomerSearchOption | null;
  onChange: (customer: CustomerSearchOption | null) => void;
  required?: boolean;
  helperText?: string;
}>;

export const CustomerSearchPicker: React.FC<Props> = ({
  label,
  placeholder = "Search customers by name, email, or phone",
  value,
  onChange,
  required = false,
  helperText,
}) => {
  const { customers, isSearching, search, setSearch } = useCustomerSearch();
  const [isOpen, setIsOpen] = React.useState(false);
  const closeTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const displayValue = search;

  const handleSelect = (customer: CustomerSearchOption) => {
    onChange(customer);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-medium text-[#1d1d1f]">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>

      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-3">
          <div>
            <div className="text-[14px] font-medium text-[#1d1d1f]">
              {value.name}
            </div>
            <div className="text-[12px] text-[#6e6e73]">
              {value.email}
              {value.phone ? ` • ${value.phone}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            aria-label="Clear selected customer"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            value={displayValue}
            onChange={(event) => {
              setSearch(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              closeTimeoutRef.current = window.setTimeout(
                () => setIsOpen(false),
                150,
              );
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
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(customer)}
                      className="group flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left transition hover:bg-[#f5f5f7]"
                    >
                      <div>
                        <div className="text-[14px] font-medium text-[#1d1d1f]">
                          {customer.name}
                        </div>
                        <div className="text-[12px] text-[#6e6e73]">
                          {customer.email}
                          {customer.phone ? ` • ${customer.phone}` : ""}
                        </div>
                      </div>
                      <Check
                        size={14}
                        className="text-[var(--primary)] opacity-0 transition group-hover:opacity-100"
                      />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-[13px] text-[#6e6e73]">
                    No customers found.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {helperText ? (
        <p className="text-[12px] leading-5 text-[#6e6e73]">{helperText}</p>
      ) : null}
    </div>
  );
};
