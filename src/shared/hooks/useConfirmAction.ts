import React from "react";

export type ConfirmAction = "delete" | "recover" | "destroy";

export const useConfirmAction = () => {
  const [open, setOpen] = React.useState(false);
  const [action, setAction] = React.useState<ConfirmAction>("delete");
  const [ids, setIds] = React.useState<ReadonlyArray<string>>([]);

  const prompt = (a: ConfirmAction, pending: ReadonlyArray<string>) => {
    if (!pending.length) return;
    setAction(a);
    setIds(pending);
    setOpen(true);
  };

  const dismiss = () => {
    setOpen(false);
    setIds([]);
  };

  return { open, action, ids, prompt, dismiss };
};
