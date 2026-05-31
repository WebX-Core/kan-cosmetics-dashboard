import React from "react";

type StatusToggleProps = Readonly<{
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void | Promise<void>;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}>;

export const StatusToggle: React.FC<StatusToggleProps> = ({
  checked,
  disabled = false,
  onChange,
  onClick,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={(event) => {
      onClick?.(event);
      if (event.defaultPrevented || disabled) return;
      void onChange(!checked);
    }}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
      checked ? "bg-emerald-500" : "bg-zinc-300"
    } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);
