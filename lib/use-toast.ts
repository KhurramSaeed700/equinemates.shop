import { toast } from "sonner";

export function useToast() {
  return {
    success: (message: string, description?: string) => {
      toast.success(message, {
        description,
        duration: 3000,
      });
    },
    error: (message: string, description?: string) => {
      toast.error(message, {
        description,
        duration: 3000,
      });
    },
    info: (message: string, description?: string) => {
      toast(message, {
        description,
        duration: 3000,
      });
    },
    loading: (message: string) => {
      return toast.loading(message);
    },
    dismiss: (toastId?: string | number) => {
      toast.dismiss(toastId);
    },
    promise: <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      },
    ) => {
      return toast.promise(promise, messages);
    },
  };
}
