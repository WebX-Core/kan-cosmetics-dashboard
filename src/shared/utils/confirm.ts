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
    modal.style.width = "min(96vw, 1040px)";
    modal.style.border = "1px solid #d2d2d7";
    modal.style.borderRadius = "8px";
    modal.style.background = "#fff";
    modal.style.boxShadow = "0 10px 30px rgba(0,0,0,0.22)";
    modal.style.padding = "44px";
    modal.style.display = "grid";
    modal.style.gap = "32px";

    const title = document.createElement("div");
    title.textContent = isDelete ? "Delete item?" : "Please confirm";
    title.style.fontWeight = "600";
    title.style.fontSize = "42px";
    title.style.lineHeight = "1.02";
    title.style.letterSpacing = "-0.02em";
    title.style.color = "#1d1d1f";

    const body = document.createElement("div");
    body.textContent = message;
    body.style.color = "#2c2c2e";
    body.style.fontSize = "22px";
    body.style.lineHeight = "1.2";

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "16px";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.style.height = "78px";
    cancel.style.minWidth = "148px";
    cancel.style.padding = "0 40px";
    cancel.style.borderRadius = "9999px";
    cancel.style.border = "1px solid #c7c7cc";
    cancel.style.background = "#fff";
    cancel.style.color = "#2c2c2e";
    cancel.style.fontSize = "40px";
    cancel.style.fontWeight = "500";
    cancel.style.lineHeight = "1";
    cancel.style.cursor = "pointer";

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.textContent = isDelete ? "Delete" : "Confirm";
    confirm.style.height = "78px";
    confirm.style.minWidth = "148px";
    confirm.style.padding = "0 40px";
    confirm.style.borderRadius = "9999px";
    confirm.style.cursor = "pointer";
    confirm.style.fontSize = "40px";
    confirm.style.fontWeight = "500";
    confirm.style.lineHeight = "1";
    if (isDelete) {
      confirm.style.border = "1px solid #0071e3";
      confirm.style.background = "#f50000";
      confirm.style.color = "#fff";
    } else {
      confirm.style.border = "1px solid #0071e3";
      confirm.style.background = "#0071e3";
      confirm.style.color = "#fff";
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
