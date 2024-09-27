import { getUser } from "@/lib/server";

export default async function AdminLayout({ children }) {
  await getUser({ redirect: true });
  return <>{children}</>;
}
