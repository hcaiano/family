"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  transaction_date: string;
  source_bank: "Revolut" | "BPI";
  status: "unmatched" | "matched";
  invoice_id: string | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
          router.push("/auth/login");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", sessionData.session.user.id)
          .order("transaction_date", { ascending: false });

        if (fetchError) throw fetchError;
        setTransactions(data || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTransactions();
  }, [supabase, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Manage your transactions and match them with invoices"
        action={{
          label: "Import Statement",
          href: "/statements/upload",
          icon: Upload,
        }}
      />

      {transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Import a bank statement to get started"
          action={{
            label: "Import Statement",
            href: "/statements/upload",
            icon: Upload,
          }}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Description</th>
                  <th className="text-left p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium">Source</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b last:border-0">
                    <td className="p-4 text-sm">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(transaction.transaction_date)}
                      </div>
                    </td>
                    <td className="p-4 text-sm">{transaction.description}</td>
                    <td className="p-4 text-sm">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: transaction.currency,
                      }).format(transaction.amount)}
                    </td>
                    <td className="p-4 text-sm">{transaction.source_bank}</td>
                    <td className="p-4 text-sm">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                          transaction.status === "matched"
                            ? "bg-green-50 text-green-700"
                            : "bg-yellow-50 text-yellow-700"
                        )}
                      >
                        {transaction.status === "matched"
                          ? "Matched"
                          : "Unmatched"}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-right">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          /* TODO: Implement match invoice action */
                        }}
                      >
                        Match Invoice
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
