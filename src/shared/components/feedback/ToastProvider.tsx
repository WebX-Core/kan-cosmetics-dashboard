/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

type ToastKind = "success" | "error" | "info";

type ToastItem = Readonly<{
  id: number;
  kind: ToastKind;
  message: string;
}>;

type ToastContextValue = Readonly<{
  push: (message: string, kind?: ToastKind) => void;
}>;

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TOAST_THEME: Readonly<
  Record<
    ToastKind,
    Readonly<{
      title: string;
      icon: React.ReactNode;
      railClass: string;
      iconWrapClass: string;
      borderClass: string;
    }>
  >
> = {
  success: {
    title: "Success",
    icon: <CheckCircle2 size={16} className="text-[#166534]" />,
    railClass: "bg-[#34c759]",
    iconWrapClass: "bg-[#ecfdf3]",
    borderClass: "border-[#bbf7d0]",
  },
  error: {
    title: "Action Failed",
    icon: <TriangleAlert size={16} className="text-[#b42318]" />,
    railClass: "bg-[#ff3b30]",
    iconWrapClass: "bg-[#fef2f2]",
    borderClass: "border-[#fecaca]",
  },
  info: {
    title: "Notice",
    icon: <Info size={16} className="text-[#075985]" />,
    railClass: "bg-[#0ea5e9]",
    iconWrapClass: "bg-[#f0f9ff]",
    borderClass: "border-[#bae6fd]",
  },
};

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ReadonlyArray<ToastItem>>([]);
  const lastToastRef = React.useRef<Readonly<{ id: number; kind: ToastKind; message: string; at: number }> | null>(null);
  const timeoutHandlesRef = React.useRef<Map<number, number>>(new Map());

  const removeToast = React.useCallback((id: number) => {
    const handle = timeoutHandlesRef.current.get(id);
    if (handle) {
      window.clearTimeout(handle);
      timeoutHandlesRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = React.useCallback((message: string, kind: ToastKind = "info") => {
    const now = Date.now();
    const last = lastToastRef.current;
    if (last && last.kind === kind && last.message === message && now - last.at < 1200) {
      return;
    }

    // CRUD hooks and their page-level handlers can complete in the same tick.
    // Keep the later, more specific success message instead of stacking two toasts.
    if (last && kind === "success" && last.kind === "success" && now - last.at < 800) {
      const previousHandle = timeoutHandlesRef.current.get(last.id);
      if (previousHandle) window.clearTimeout(previousHandle);
      setToasts((current) => current.map((item) => item.id === last.id ? { ...item, message } : item));
      const timeoutHandle = window.setTimeout(() => removeToast(last.id), 4200);
      timeoutHandlesRef.current.set(last.id, timeoutHandle);
      lastToastRef.current = { id: last.id, kind, message, at: now };
      return;
    }

    const id = Date.now() + Math.floor(Math.random() * 10000);
    lastToastRef.current = { id, kind, message, at: now };
    setToasts((prev) => [...prev, { id, kind, message }]);

    const timeoutHandle = window.setTimeout(() => {
      removeToast(id);
    }, 4200);
    timeoutHandlesRef.current.set(id, timeoutHandle);
  }, [removeToast]);

  React.useEffect(
    () => () => {
      for (const handle of timeoutHandlesRef.current.values()) {
        window.clearTimeout(handle);
      }
      timeoutHandlesRef.current.clear();
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="fixed bottom-[13px] right-[13px] z-[3000] grid w-[min(92vw,396px)] gap-[8px]"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`motion-reduce:animate-none animate-[toast-enter_220ms_cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden rounded-[12px] border bg-white shadow-[0_16px_34px_rgba(2,6,23,0.16)] ${TOAST_THEME[t.kind].borderClass}`}
          >
            <span className={`absolute inset-y-0 left-0 w-[3px] ${TOAST_THEME[t.kind].railClass}`} />
            <div className="flex items-start gap-[10px] px-[13px] py-[11px] pl-[12px]">
              <span className={`mt-[1px] inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full ${TOAST_THEME[t.kind].iconWrapClass}`}>
                {TOAST_THEME[t.kind].icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6e6e73]">
                  {TOAST_THEME[t.kind].title}
                </p>
                <p className="mt-[2px] break-words text-[13px] font-medium leading-[1.35] text-[#1d1d1f]">
                  {t.message}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                className="h-[24px] w-[24px] shrink-0 rounded-full border-none bg-transparent p-0 text-[#86868b] shadow-none hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
              >
                <X size={12} />
              </Button>
            </div>
            <div className="h-[2px] w-full bg-[#f0f0f2]" aria-hidden="true">
              <div className={`motion-reduce:animate-none h-full animate-[toast-life_4200ms_linear_forwards] ${TOAST_THEME[t.kind].railClass}`} />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");

  return {
    success: (message: string) => ctx.push(message, "success"),
    error: (message: string) => ctx.push(message, "error"),
    info: (message: string) => ctx.push(message, "info"),
  };
}
