export async function confirmAction(message: string): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  return new Promise<boolean>((resolve) => {
    const isDelete = /delete|destroy/i.test(message);

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(15, 23, 42, 0.45)";
    overlay.style.display = "grid";
    overlay.style.placeItems = "center";
    overlay.style.zIndex = "2000";

    const modal = document.createElement("div");
    modal.style.width = "min(90vw, 300px)";
    modal.style.border = "1px solid #d2d2d7";
    modal.style.borderRadius = "12px";
    modal.style.background = "#fff";
    modal.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
    modal.style.padding = "16px";
    modal.style.display = "grid";
    modal.style.gap = "4px";

    const title = document.createElement("div");
    title.textContent = isDelete ? "Delete item?" : "Please confirm";
    title.style.fontWeight = "600";
    title.style.fontSize = "13px";
    title.style.lineHeight = "1.3";
    title.style.letterSpacing = "-0.01em";
    title.style.color = "#1d1d1f";

    const body = document.createElement("div");
    body.textContent = message;
    body.style.color = "#6e6e73";
    body.style.fontSize = "12px";
    body.style.lineHeight = "1.4";
    body.style.marginBottom = "6px";

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "6px";
    actions.style.marginTop = "2px";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.style.height = "28px";
    cancel.style.padding = "0 12px";
    cancel.style.borderRadius = "9999px";
    cancel.style.border = "1px solid #d2d2d7";
    cancel.style.background = "#fff";
    cancel.style.color = "#1d1d1f";
    cancel.style.fontSize = "12px";
    cancel.style.fontWeight = "500";
    cancel.style.cursor = "pointer";
    cancel.style.transition = "background 0.15s";
    cancel.onmouseenter = () => { cancel.style.background = "#f5f5f7"; };
    cancel.onmouseleave = () => { cancel.style.background = "#fff"; };

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.textContent = isDelete ? "Delete" : "Confirm";
    confirm.style.height = "28px";
    confirm.style.padding = "0 12px";
    confirm.style.borderRadius = "9999px";
    confirm.style.cursor = "pointer";
    confirm.style.fontSize = "12px";
    confirm.style.fontWeight = "500";
    confirm.style.transition = "background 0.15s";
    if (isDelete) {
      confirm.style.border = "none";
      confirm.style.background = "#dc2626";
      confirm.style.color = "#fff";
      confirm.onmouseenter = () => { confirm.style.background = "#b91c1c"; };
      confirm.onmouseleave = () => { confirm.style.background = "#dc2626"; };
    } else {
      confirm.style.border = "none";
      confirm.style.background = "#0071e3";
      confirm.style.color = "#fff";
      confirm.onmouseenter = () => { confirm.style.background = "#0066cc"; };
      confirm.onmouseleave = () => { confirm.style.background = "#0071e3"; };
    }

    const cleanup = () => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    const close = (result: boolean) => {
      cleanup();
      resolve(result);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };

    cancel.onclick = () => close(false);
    confirm.onclick = () => close(true);
    overlay.onclick = (e) => {
      if (e.target === overlay) close(false);
    };

    actions.append(cancel, confirm);
    modal.append(title, body, actions);
    overlay.append(modal);
    document.body.append(overlay);
    document.addEventListener("keydown", onKeyDown);
    confirm.focus();
  });
}
