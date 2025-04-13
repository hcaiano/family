"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
      // Optionally show an error message to the user
    } else {
      router.push("/"); // Redirect to home page after logout
      router.refresh(); // Ensure server components re-evaluate auth state
    }
    setLoading(false);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleLogout}
      disabled={loading}
      aria-label="Log out"
    >
      {loading ? (
        <LogOut className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
    </Button>
  );
}
