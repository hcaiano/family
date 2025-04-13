import { createClient } from "@/lib/supabase/server";
import LoginButton from "@/components/auth/LoginButton";
import LogoutButton from "@/components/auth/LogoutButton";
import InvoiceUploader from "@/components/invoices/InvoiceUploader";
import InvoiceList from "@/components/invoices/InvoiceList";

const ALLOWED_EMAIL = "gatti.caiano@gmail.com";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();

  // Handle potential errors fetching user, but ignore expected "Auth session missing!"
  if (error && error.message !== "Auth session missing!") {
    console.error("Error fetching user:", error.message);
    // Optional: redirect to an error page or show a message
    // For now, treat as logged out
  }

  const user = data?.user;
  const isLoggedIn = !!user;
  const isAllowedUser = isLoggedIn && user.email === ALLOWED_EMAIL;

  // If logged in but not the allowed user, redirect or show unauthorized message
  if (isLoggedIn && !isAllowedUser) {
    // Option 1: Redirect to a specific page
    // redirect('/unauthorized')

    // Option 2: Show an unauthorized message on the home page
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>
            You are logged in, but you do not have permission to access this
            application.
          </p>
          {/* Optional: Add a logout button here */}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 space-y-8">
      {isAllowedUser ? (
        <div className="w-full max-w-4xl space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold">Invoices</h1>
            <LogoutButton />
          </div>
          <p>Welcome, {user.email}!</p>

          {/* Invoice Uploader Section */}
          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Upload New Invoice</h2>
            <InvoiceUploader userId={user.id} />
          </div>

          {/* Invoice List Section */}
          <div className="bg-card p-6 rounded-lg shadow">
            <InvoiceList userId={user.id} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p>Please log in to access the application.</p>
          <LoginButton />
        </div>
      )}
    </main>
  );
}
