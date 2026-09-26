import { redirect } from "next/navigation";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let authenticated = false;
  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    authenticated = !error && Boolean(data.user);
  } catch {
    authenticated = false;
  }
  if (!authenticated) redirect("/login");

  return children;
}
