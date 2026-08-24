import React from "react";
import { AnimatePresence, motion } from "motion/react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SidebarHoverHighlightContextValue {
  setActiveRect: (rect: Rect | null) => void;
}

const SidebarHoverHighlightContext = React.createContext<SidebarHoverHighlightContextValue | null>(null);

// ponytail: purpose-built stand-in for @animate-ui's generic Highlight primitive —
// tracks one hovered item's bounds within this container and slides a pill to match.
export const SidebarHoverHighlightGroup: React.FC<React.PropsWithChildren> = ({ children }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = React.useState<Rect | null>(null);

  const setActiveRect = React.useCallback((next: Rect | null) => {
    setRect(next);
  }, []);

  return (
    <div ref={containerRef} className="relative space-y-[2px]">
      <AnimatePresence>
        {rect && (
          <motion.div
            className="absolute z-0 rounded-lg bg-[#f5f5f7]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.5 }}
          />
        )}
      </AnimatePresence>
      <SidebarHoverHighlightContext.Provider value={{ setActiveRect }}>
        {children}
      </SidebarHoverHighlightContext.Provider>
    </div>
  );
};

export const useSidebarHoverHighlight = () => {
  const ctx = React.useContext(SidebarHoverHighlightContext);

  const onMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    if (!ctx) return;
    const target = event.currentTarget;
    ctx.setActiveRect({
      top: target.offsetTop,
      left: target.offsetLeft,
      width: target.offsetWidth,
      height: target.offsetHeight,
    });
  };

  const onMouseLeave = () => ctx?.setActiveRect(null);

  return { onMouseEnter, onMouseLeave };
};
