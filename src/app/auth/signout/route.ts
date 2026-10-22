import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Signs the person out and returns to /login, passing on an optional reason (e.g. ?error=removed). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL("/login", origin);
  const reason = searchParams.get("error");
  if (reason === "removed" || reason === "not_allowed") url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}
