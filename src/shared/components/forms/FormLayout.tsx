import React from "react";

type Props = Readonly<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  aside?: React.ReactNode;
}>;

export const FormLayout: React.FC<Props> = ({ title, subtitle, actions, children, aside }) => {
  return (
    <div className="compact-form grid w-full max-w-280 gap-[12px]">
      <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-white px-3.5 py-[12px]">
        <div>
          <h2 className="m-0 text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">{title}</h2>
          {subtitle ? <div className="mt-1 text-[11px] text-[var(--muted)]">{subtitle}</div> : null}
        </div>
        {actions}
      </div>

      <div className={`grid items-start gap-[12px] ${aside ? "xl:grid-cols-[minmax(0,1fr)_280px]" : "grid-cols-1"}`}>
        <div className="rounded-[12px] border border-[var(--line)] bg-white p-3.5">
          {children}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </div>
  );
};
