import { CaseDetailClient } from "@/components/cases/CaseDetailClient";


export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  
  return <CaseDetailClient caseId={caseId} />;
}