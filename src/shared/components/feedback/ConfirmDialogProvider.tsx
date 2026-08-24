import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

interface ConfirmRequest {
  message: string;
  resolve: (result: boolean) => void;
}

let requestConfirm: ((message: string) => Promise<boolean>) | null = null;

export const confirmAction = (message: string): Promise<boolean> => {
  if (!requestConfirm) return Promise.resolve(false);
  return requestConfirm(message);
};

export const ConfirmDialogProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [request, setRequest] = React.useState<ConfirmRequest | null>(null);

  React.useEffect(() => {
    requestConfirm = (message) => new Promise((resolve) => setRequest({ message, resolve }));
    return () => {
      requestConfirm = null;
    };
  }, []);

  const close = (result: boolean) => {
    request?.resolve(result);
    setRequest(null);
  };

  const isDelete = request ? /delete|destroy/i.test(request.message) : false;

  return (
    <>
      {children}
      <AlertDialog open={Boolean(request)} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isDelete ? "Delete item?" : "Please confirm"}</AlertDialogTitle>
            <AlertDialogDescription>{request?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => close(true)}
              className={isDelete ? "bg-[#dc2626] hover:bg-[#b91c1c]" : undefined}
            >
              {isDelete ? "Delete" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
