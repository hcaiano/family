import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the `@supabase/ssr` package. It exchanges an auth code for the user's session.
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth Callback Error:", error.message);
      // URL to redirect to after sign in process fails
      return NextResponse.redirect(
        `${origin}/login?error=Could not authenticate user`
      );
    }

    if (user) {
      // Check if profile exists
      const { error: profileError } = await supabase
        .from("profiles")
        .select()
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code === "PGRST116") {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          full_name: user.user_metadata.full_name,
          avatar_url: user.user_metadata.avatar_url,
        });

        if (insertError) {
          console.error("Error creating profile:", insertError.message);
          return NextResponse.redirect(
            `${origin}/login?error=Could not create user profile`
          );
        }
      } else if (profileError) {
        console.error("Error checking profile:", profileError.message);
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(origin);
}
