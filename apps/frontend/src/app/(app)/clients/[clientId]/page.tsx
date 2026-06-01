import { ClientWorkspace } from "@/components/clients/client-workspace";

export default async function ClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <ClientWorkspace clientId={clientId} />;
}
