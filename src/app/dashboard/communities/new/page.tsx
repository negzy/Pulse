import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import CommunityForm from "@/components/CommunityForm";

export default async function NewCommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Add community</h1>
      <CommunityForm userId={user.id} />
    </div>
  );
}
