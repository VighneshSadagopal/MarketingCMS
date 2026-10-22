import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Finishes Google sign-in, then checks the person is still on the team allowlist. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  // Google or Supabase refused, e.g. the sign-up hook rejected an email not on the list.
  if (oauthError) {
    const notAllowed = /team list|not allowed|403|hook/i.test(oauthError);
    return NextResponse.redirect(`${origin}/login?error=${notAllowed ? "not_allowed" : "failed"}`);
  }

  if (!code) return NextResponse.redirect(`${origin}/login?error=failed`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=failed`);

  const { data: allowed } = await supabase.rpc("am_i_allowed");
  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  return NextResponse.redirect(`${origin}/`);
}
