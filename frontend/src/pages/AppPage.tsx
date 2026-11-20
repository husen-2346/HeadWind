import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";

export function AppPage() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

export default AppPage;
