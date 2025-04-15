"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2, Upload, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "./components/data-table";
import { TransactionMenu } from "./components/transaction-menu";
import type { Transaction } from "./components/columns";
import type { ColumnDef } from "@tanstack/react-table";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const columns: ColumnDef<Transaction>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "transaction_date",
      header: "Date",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {formatDate(row.getValue("transaction_date"))}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-[500px] truncate">
          {row.getValue("description")}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const amount = row.getValue("amount") as number;
        const currency = row.original.currency;

        return (
          <div className="text-right font-medium">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: currency,
            }).format(amount)}
          </div>
        );
      },
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) => {
        const vendor = row.original.vendor;
        return vendor ? (
          <div className="flex items-center gap-1">
            <span>{vendor.name}</span>
            {vendor.is_subscription && (
              <Badge variant="outline" className="text-xs h-5">
                Sub
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">Not assigned</span>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.original.category;
        return category ? (
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span>{category.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Not assigned</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            className={status === "matched" ? "bg-green-500" : "bg-red-500"}
            variant="solid"
          >
            {status === "matched" ? "Matched" : "Unmatched"}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.length === 0 ? true : value.includes(row.getValue(id));
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const transaction = row.original;
        return (
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
        );
      },
      enableHiding: false,
    },
  ];

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

      // Explicitly sort client-side (date desc, then description asc)
      const sortedData = (data || []).sort((a, b) => {
        const dateA = a.transaction_date
          ? new Date(a.transaction_date).getTime()
          : 0;
        const dateB = b.transaction_date
          ? new Date(b.transaction_date).getTime()
          : 0;

        // Handle potential NaN values from invalid dates
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1; // Treat invalid dates as older
        if (isNaN(dateB)) return -1; // Treat invalid dates as older

        // Primary sort: Date descending
        if (dateA !== dateB) {
          return dateB - dateA;
        }

        // Secondary sort: Description ascending (case-insensitive)
        const descA = (a.description || "").toLowerCase();
        const descB = (b.description || "").toLowerCase();
        return descA.localeCompare(descB);
      });

      setTransactions(sortedData);
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
      if (!sessionData.session?.user) return;

      const channel = supabase
        .channel("transactions-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${sessionData.session.user.id}`,
          },
          (payload) => {
            console.log("Transaction change received:", payload);
            // Simplify: Refetch all transactions on any change for now
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
