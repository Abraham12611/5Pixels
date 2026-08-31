import { EditProductPage } from "@/components/admin/edit-product-page";

export default async function EditPosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditProductPage id={id} type="poster" />;
}
