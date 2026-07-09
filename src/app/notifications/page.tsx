import { AppShell } from "@/components/app-shell";
import { NotificationDrawer } from "@/components/notification-drawer";

export default function NotificationsPage() {
  return (
    <AppShell title="Notification center" subtitle="Claim updates, alerts, and nearby critical request notifications surface here.">
      <NotificationDrawer />
    </AppShell>
  );
}