"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { TransactionMenu } from "./components/transaction-menu";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  transaction_date: string;
  source_bank: "Revolut" | "BPI";
  status: "unmatched" | "matched";
  invoice_id: string | null;
  vendor_id: string | null;
  category_id: string | null;
  vendor?: {
    id: string;
    name: string;
    is_subscription: boolean;
  } | null;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchTransactions = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        router.push("/auth/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select(
          `
          *,
          vendor:vendors!transactions_vendor_id_fkey(*),
          category:categories!transactions_category_id_fkey(*)
        `
        )
        .eq("user_id", sessionData.session.user.id)
        .order("transaction_date", { ascending: false });

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Set up real-time subscription to transactions
    const setupRealtimeSubscription = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const channel = supabase
        .channel("transactions-channel")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
          },
          (payload) => {
            console.log("Transaction change received:", payload);
            fetchTransactions();
          }
        )
        .subscribe();

      return channel;
    };

    let channel: ReturnType<typeof supabase.channel> | undefined;
    setupRealtimeSubscription().then((ch) => {
      channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, router]);

  const downloadTransactionsCSV = () => {
    if (transactions.length === 0) {
      toast.error("No transactions to download");
      return;
    }

    // Create CSV header
    const headers = [
      "Date",
      "Description",
      "Amount",
      "Currency",
      "Vendor",
      "Category",
      "Status",
    ];

    // Format transactions as CSV rows
    const rows = transactions.map((t) => [
      formatDate(t.transaction_date),
      `"${t.description.replace(/"/g, '""')}"`, // Handle quotes in descriptions
      t.amount.toString(),
      t.currency,
      t.vendor?.name || "",
      t.category?.name || "",
      t.status,
    ]);

    // Combine headers and rows
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    // Create and download the file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `transactions-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        actions={[
          {
            label: "Download CSV",
            onClick: downloadTransactionsCSV,
            icon: Download,
            variant: "outline",
          },
          {
            label: "Import Statement",
            href: "/statements/upload",
            icon: Upload,
          },
        ]}
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
        <>
          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Description</th>
                    <th className="text-left p-4 font-medium">Amount</th>
                    <th className="text-left p-4 font-medium">Vendor</th>
                    <th className="text-left p-4 font-medium">Category</th>
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
                      <td className="p-4 text-sm">
                        {transaction.vendor ? (
                          <div className="flex items-center gap-1">
                            <span>{transaction.vendor.name}</span>
                            {transaction.vendor.is_subscription && (
                              <Badge variant="outline" className="text-xs h-5">
                                Sub
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Not assigned
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {transaction.category ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: transaction.category.color,
                              }}
                            />
                            <span>{transaction.category.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Not assigned
                          </span>
                        )}
                      </td>
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
                        <div className="flex justify-end items-center gap-2">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                              /* TODO: Implement match invoice action */
                            }}
                          >
                            Match
                          </Button>
                          <TransactionMenu
                            transactionId={transaction.id}
                            vendorId={transaction.vendor_id}
                            categoryId={transaction.category_id}
                            onUpdate={fetchTransactions}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
