import { ContentDetail } from "@/components/content/content-detail";

export default async function ContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ suggest?: string }>;
}) {
  const [{ id }, { suggest }] = await Promise.all([params, searchParams]);
  return <ContentDetail id={id} suggest={suggest} kind="post" />;
}
