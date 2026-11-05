import { ContentEdit } from "@/components/content/content-edit";

export const metadata = { title: "Edit blog · DrupalAsia Marketing CMS" };

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContentEdit id={id} kind="blog" />;
}
