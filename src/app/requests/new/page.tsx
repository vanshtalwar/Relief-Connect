import { AppShell } from "@/components/app-shell";
import { RequestForm } from "@/components/request-form";

export const metadata = {
  title: "Request Help",
  description: "Submit a new emergency relief request.",
};

export default async function NewRequestPage() {
  return (
    <AppShell title="Create help request" subtitle="A multi-step request flow that validates input and can queue offline when connectivity drops.">
      <RequestForm />
    </AppShell>
  );
}