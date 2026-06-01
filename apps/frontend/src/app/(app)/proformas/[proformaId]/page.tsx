import { ProformaTable } from "@/components/table/proforma-table";

export default async function ProformaPage({ params }: { params: Promise<{ proformaId: string }> }) {
  const { proformaId } = await params;
  return <ProformaTable proformaId={proformaId} />;
}
