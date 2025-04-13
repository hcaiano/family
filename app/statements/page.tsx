"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Statement {
  id: string;
  filename: string;
  uploaded_at: string;
  source_bank: "REVOLUT" | "BPI";
  status: "processing" | "completed" | "error";
  transactions_count: number;
  error_message?: string;
  total_amount?: number;
  currency?: string;
  storage_path: string;
}

interface StatementDetails {
  transactions: Array<{
    transaction_date: string;
    description: string;
    amount: number;
    currency: string;
  }>;
  summary: {
    total_amount: number;
    currency: string;
    count: number;
  };
}

export default function StatementsPage() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(
    null
  );
  const [statementToDelete, setStatementToDelete] = useState<Statement | null>(
    null
  );
  const [statementDetails, setStatementDetails] =
    useState<StatementDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const supabase = createClient();

  const fetchStatements = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        setError("Please log in to view statements.");
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("statements")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .order("uploaded_at", { ascending: false });

      if (fetchError) throw fetchError;
      setStatements(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatements();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("statements")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "statements",
        },
        (payload) => {
          const updatedStatement = payload.new as Statement;
          if (updatedStatement.status === "completed") {
            toast.success("Statement Processed", {
              description: `Successfully processed ${updatedStatement.transactions_count} transactions`,
            });
          } else if (updatedStatement.status === "error") {
            toast.error("Processing Error", {
              description:
                updatedStatement.error_message ||
                "An error occurred while processing the statement",
            });
          }
          // Update the statement in the list
          setStatements((prev) =>
            prev.map((s) =>
              s.id === updatedStatement.id ? updatedStatement : s
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleDelete = async (statement: Statement) => {
    try {
      // First delete associated transactions
      const { error: transactionsError } = await supabase
        .from("transactions")
        .delete()
        .eq("source_bank", statement.source_bank)
        .eq("source_id", statement.storage_path);

      if (transactionsError) {
        console.error("Error deleting transactions:", transactionsError);
        throw transactionsError;
      }

      // Then delete the file from storage
      const { error: storageError } = await supabase.storage
        .from("statements")
        .remove([statement.storage_path]);

      if (storageError) {
        console.error("Error deleting file from storage:", storageError);
        throw storageError;
      }

      // Finally delete the statement record
      const { error: dbError } = await supabase
        .from("statements")
        .delete()
        .eq("id", statement.id);

      if (dbError) {
        console.error("Error deleting statement record:", dbError);
        throw dbError;
      }

      // Remove the statement from local state
      setStatements((prev) => prev.filter((s) => s.id !== statement.id));

      // Close the details modal if it's open for this statement
      if (selectedStatement?.id === statement.id) {
        setSelectedStatement(null);
      }

      toast.success("Statement Deleted", {
        description: `Successfully deleted statement "${statement.filename}" and its transactions`,
      });
    } catch (err: any) {
      console.error("Delete operation failed:", err);
      setError(`Failed to delete statement: ${err.message}`);
      toast.error("Delete Failed", {
        description: err.message || "Failed to delete statement",
      });
    }
  };

  const handleViewDetails = async (statement: Statement) => {
    setSelectedStatement(statement);
    setIsDetailsLoading(true);
    try {
      const { data: transactions, error: fetchError } = await supabase
        .from("transactions")
        .select("transaction_date, description, amount, currency")
        .eq("source_bank", statement.source_bank)
        .eq("source_id", statement.storage_path)
        .order("transaction_date", { ascending: false });

      if (fetchError) throw fetchError;

      if (!transactions || transactions.length === 0) {
        setStatementDetails(null);
        return;
      }

      // Group transactions by currency
      const groupedByCurrency = transactions.reduce((acc, t) => {
        if (!acc[t.currency]) {
          acc[t.currency] = {
            total_amount: 0,
            count: 0,
          };
        }
        acc[t.currency].total_amount += t.amount;
        acc[t.currency].count += 1;
        return acc;
      }, {} as Record<string, { total_amount: number; count: number }>);

      // Use the currency with the most transactions as the main currency
      const mainCurrency = Object.entries(groupedByCurrency).sort(
        (a, b) => b[1].count - a[1].count
      )[0][0];

      setStatementDetails({
        transactions: transactions,
        summary: {
          total_amount: groupedByCurrency[mainCurrency].total_amount,
          currency: mainCurrency,
          count: transactions.length,
        },
      });
    } catch (err: any) {
      console.error("Error loading statement details:", err);
      setError(`Failed to load statement details: ${err.message}`);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const confirmDelete = (statement: Statement) => {
    setStatementToDelete(statement);
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
          <h1 className="text-2xl font-bold">Bank Statements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and manage your bank statements
          </p>
        </div>
        <Button asChild>
          <Link href="/statements/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Statement
          </Link>
        </Button>
      </div>

      {statements.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No statements uploaded</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your first bank statement to get started
          </p>
          <Button asChild className="mt-4">
            <Link href="/statements/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Statement
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Filename</th>
                  <th className="text-left p-4 font-medium">Bank</th>
                  <th className="text-left p-4 font-medium">Uploaded</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Transactions</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((statement) => (
                  <tr key={statement.id} className="border-b last:border-0">
                    <td className="p-4 text-sm">{statement.filename}</td>
                    <td className="p-4 text-sm">{statement.source_bank}</td>
                    <td className="p-4 text-sm">
                      {new Date(statement.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                          {
                            "bg-green-50 text-green-700":
                              statement.status === "completed",
                            "bg-yellow-50 text-yellow-700":
                              statement.status === "processing",
                            "bg-red-50 text-red-700":
                              statement.status === "error",
                          }
                        )}
                      >
                        {statement.status.charAt(0).toUpperCase() +
                          statement.status.slice(1)}
                        {statement.status === "error" &&
                          statement.error_message && (
                            <span className="ml-1 text-xs">
                              ({statement.error_message})
                            </span>
                          )}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      {statement.transactions_count > 0 ? (
                        <span>
                          {statement.transactions_count} transactions
                          {statement.total_amount && statement.currency && (
                            <span className="text-muted-foreground ml-1">
                              (
                              {formatCurrency(
                                statement.total_amount,
                                statement.currency
                              )}
                              )
                            </span>
                          )}
                        </span>
                      ) : (
                        "No transactions"
                      )}
                    </td>
                    <td className="p-4 text-sm text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(statement)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(statement)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog
        open={!!selectedStatement}
        onOpenChange={() => setSelectedStatement(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Statement Details</DialogTitle>
            <DialogDescription>
              {selectedStatement?.filename} - {selectedStatement?.source_bank}
            </DialogDescription>
          </DialogHeader>
          {isDetailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : statementDetails ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium mb-2">Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Amount
                    </p>
                    <p className="text-lg font-medium">
                      {formatCurrency(
                        statementDetails.summary.total_amount,
                        statementDetails.summary.currency
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Transactions
                    </p>
                    <p className="text-lg font-medium">
                      {statementDetails.summary.count}
                    </p>
                  </div>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Description</th>
                      <th className="text-right p-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementDetails.transactions.map((t, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2 text-sm">
                          {new Date(t.transaction_date).toLocaleDateString()}
                        </td>
                        <td className="p-2 text-sm">{t.description}</td>
                        <td className="p-2 text-sm text-right">
                          {formatCurrency(t.amount, t.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for this statement.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!statementToDelete}
        onOpenChange={(open) => !open && setStatementToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the statement "
              {statementToDelete?.filename}" and all its transactions. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (statementToDelete) {
                  handleDelete(statementToDelete);
                  setStatementToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
