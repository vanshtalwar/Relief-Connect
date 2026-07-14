import { AppShell } from "@/components/app-shell";
import { NotificationDrawer } from "@/components/notification-drawer";

export const metadata = {
  title: "Notifications",
  description: "Your latest updates and alerts.",
};

export default async function NotificationsPage() {
  return (
    <AppShell title="Notification center" subtitle="Claim updates, alerts, and nearby critical request notifications surface here.">
      <NotificationDrawer />
    </AppShell>
  );
}