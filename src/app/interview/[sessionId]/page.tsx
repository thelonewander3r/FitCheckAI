import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionRootPage({ params }: Props) {
  const { sessionId } = await params;
  redirect(`/interview/${sessionId}/analysis`);
}
