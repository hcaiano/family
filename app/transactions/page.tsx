"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2, Upload, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { columns } from "./components/columns";
import { DataTable } from "./components/data-table";
import type { Transaction } from "./components/columns";

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
        <DataTable
          columns={columns}
          data={transactions}
          onDownloadCSV={downloadTransactionsCSV}
        />
      )}
    </>
  );
}
