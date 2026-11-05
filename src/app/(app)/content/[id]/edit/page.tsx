import { ContentEdit } from "@/components/content/content-edit";

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContentEdit id={id} kind="post" />;
}
