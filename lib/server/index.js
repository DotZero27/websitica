import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";


export const supabase = () => {
  const cookieStore = cookies();
  return createClient(cookieStore);
};