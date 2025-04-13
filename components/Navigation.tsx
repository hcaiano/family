"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import LoginButton from "./auth/LoginButton";
import { ThemeToggle } from "./theme-toggle";

export function Navigation() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const links = [
    { href: "/", label: "Transactions" },
    { href: "/invoices", label: "Invoices" },
    { href: "/statements", label: "Statements" },
  ];

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary">
                Gatti Caiano
              </span>
            </Link>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === link.href
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isAuthenticated ? <LogoutButton /> : <LoginButton />}
          </div>
        </div>
      </div>
    </nav>
  );
}
