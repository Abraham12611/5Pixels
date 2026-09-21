import { EditProductPage } from "@/components/admin/edit-product-page";

export default async function EditFilterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditProductPage id={id} type="filter" />;
}
