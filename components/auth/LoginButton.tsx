"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons"; // Assuming you'll create an icons component
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function LoginButton() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Optional: Add query params, scopes, etc.
          // queryParams: { access_type: 'offline', prompt: 'consent' },
          redirectTo: `${location.origin}/auth/callback`, // Important: Needs matching Route Handler
        },
      });
      if (error) {
        console.error("OAuth Error:", error.message);
        // TODO: Show user-friendly error message
        setIsLoading(false);
      }
      // Redirect happens in the background via Supabase
    } catch (error) {
      console.error("Login function error:", error);
      setIsLoading(false);
      // TODO: Show user-friendly error message
    }
  };

  return (
    <Button onClick={handleLogin} disabled={isLoading}>
      {isLoading ? <Loader2 /> : <Icons.google />}
      Login with Google
    </Button>
  );
}
