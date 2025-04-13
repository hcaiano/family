"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: "paid" | "unpaid";
  client_name: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
          setError("Please log in to view invoices.");
          setIsLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("invoices")
          .select("*")
          .eq("user_id", sessionData.session.user.id)
          .order("issue_date", { ascending: false });

        if (fetchError) throw fetchError;
        setInvoices(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvoices();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your invoices and match them with transactions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No invoices yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first invoice to get started
          </p>
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Number</th>
                  <th className="text-left p-4 font-medium">Client</th>
                  <th className="text-left p-4 font-medium">Issue Date</th>
                  <th className="text-left p-4 font-medium">Due Date</th>
                  <th className="text-left p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b last:border-0">
                    <td className="p-4 text-sm">{invoice.number}</td>
                    <td className="p-4 text-sm">{invoice.client_name}</td>
                    <td className="p-4 text-sm">
                      {new Date(invoice.issue_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: invoice.currency,
                      }).format(invoice.amount)}
                    </td>
                    <td className="p-4 text-sm">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                          invoice.status === "paid"
                            ? "bg-green-50 text-green-700"
                            : "bg-yellow-50 text-yellow-700"
                        )}
                      >
                        {invoice.status === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
