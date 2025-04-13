"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
// import type { Database } from "@/types/database"; // Assuming this path is correct now - REMOVED

// Define the simplified Statement type locally
type Statement = {
  id: string;
  user_id: string;
  filename: string | null;
  storage_path: string;
  source_bank: string | null;
  transactions_count: number | null; // Count might be null initially
  created_at: string;
  updated_at: string;
  uploaded_at: string;
};

// Re-add StatementDetails type
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
  const [statementToDelete, setStatementToDelete] = useState<Statement | null>(
    null
  );
  // Re-add state for details view
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(
    null
  );
  const [statementDetails, setStatementDetails] =
    useState<StatementDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const supabase = createClient();

  const fetchStatements = useCallback(async () => {
    console.log("🚀 Fetching statements...");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        console.log("No user session found, skipping fetch.");
        setStatements([]);
        return;
      }

      const { data, error } = await supabase
        .from("statements")
        .select("*") // Select all columns directly from statements table
        .eq("user_id", sessionData.session.user.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      console.log("✅ Statements fetched:", JSON.stringify(data, null, 2));
      setStatements(data || []);
    } catch (err: any) {
      console.error("Error fetching statements:", err);
      toast.error("Failed to fetch statements");
      setStatements([]); // Clear statements on error
    }
  }, [supabase]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  const handleDelete = async (statement: Statement) => {
    // Keep delete logic as is - it seems to work now
    console.log(
      `Attempting to delete statement ID: ${statement.id}, Path: ${statement.storage_path}`
    );
    try {
      // 1. Delete associated transactions
      console.log(
        `Deleting transactions with source_bank=${statement.source_bank} and source_id=${statement.storage_path}...`
      );
      const { data: deletedTransactions, error: transactionsError } =
        await supabase
          .from("transactions")
          .delete()
          .eq("source_bank", statement.source_bank)
          .eq("source_id", statement.storage_path)
          .select("id");

      if (transactionsError) {
        console.error("Transaction Deletion Failed:", transactionsError);
        throw new Error(
          `Transaction Deletion Failed: ${transactionsError.message}`
        );
      }
      console.log(`Deleted ${deletedTransactions?.length || 0} transactions.`);

      // 2. Delete the statement record from database
      console.log("Deleting statement record from database...");
      const { error: dbError } = await supabase
        .from("statements")
        .delete()
        .eq("id", statement.id);

      if (dbError) {
        console.error("Statement Record Deletion Failed:", dbError);
        throw new Error(`Statement Record Deletion Failed: ${dbError.message}`);
      }
      console.log("Statement record deleted successfully.");

      // 3. Delete the file from storage
      console.log("Deleting storage file...");
      const { error: storageError } = await supabase.storage
        .from("statements")
        .remove([statement.storage_path]);

      if (storageError) {
        console.warn("Storage Deletion Failed (non-critical?):", storageError);
      } else {
        console.log("Storage file deleted successfully.");
      }

      // 4. Only update UI state *after* all critical operations succeed
      console.log("Updating UI state...");
      setStatements((prev) => prev.filter((s) => s.id !== statement.id));
      toast.success("Statement deleted successfully");
      setStatementToDelete(null);
    } catch (err: any) {
      console.error("handleDelete Error:", err);
      const errorMessage = err.message || String(err);
      toast.error(
        `Failed to delete statement: ${errorMessage}. Please try again.`
      );
      setStatementToDelete(null);

      console.log("Refreshing statement list due to error...");
      fetchStatements();
    }
  };

  // Re-add handleViewDetails function
  const handleViewDetails = async (statement: Statement) => {
    setSelectedStatement(statement);
    setIsDetailsLoading(true);
    setStatementDetails(null); // Clear previous details
    try {
      const { data: transactions, error: fetchError } = await supabase
        .from("transactions")
        .select("transaction_date, description, amount, currency")
        .eq("source_bank", statement.source_bank)
        .eq("source_id", statement.storage_path) // Use storage_path as source_id
        .order("transaction_date", { ascending: false });

      if (fetchError) {
        console.error("Failed to fetch transactions for details:", fetchError);
        throw fetchError;
      }

      if (!transactions || transactions.length === 0) {
        console.log(
          "No transactions found for this statement via details view."
        );
        setStatementDetails({
          transactions: [],
          summary: { total_amount: 0, currency: "", count: 0 },
        });
        return; // Important to return here if none found
      }

      // Calculate totals directly from fetched transactions
      const total = transactions.reduce((sum, t) => sum + t.amount, 0);
      const calculatedSummary = {
        total_amount: total,
        currency: transactions[0]?.currency || "", // Handle case of empty array somehow?
        count: transactions.length,
      };

      setStatementDetails({
        transactions: transactions,
        summary: calculatedSummary,
      });
    } catch (err: any) {
      console.error("Failed to load details:", err);
      toast.error(`Failed to load statement details: ${err.message}`);
      setStatementDetails(null); // Clear details on error
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Log data used for rendering
  console.log(
    "Rendering statements table with data:",
    JSON.stringify(statements, null, 2)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Bank Statements"
        description="Manage your bank statements and import transactions"
        action={{
          label: "Upload Statement",
          href: "/statements/upload",
          icon: Upload,
        }}
      />

      {statements.length === 0 ? (
        <EmptyState
          title="No statements yet"
          description="Upload your first bank statement to get started"
          action={{
            label: "Upload Statement",
            href: "/statements/upload",
            icon: Upload,
          }}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((statement) => (
                <TableRow key={statement.id}>
                  <TableCell className="font-medium">
                    {statement.filename}
                  </TableCell>
                  <TableCell>{statement.source_bank}</TableCell>
                  <TableCell>
                    {statement.uploaded_at
                      ? formatDistanceToNow(new Date(statement.uploaded_at), {
                          addSuffix: true,
                        })
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Directly display the count from the statement record */}
                    {statement.transactions_count ?? 0} transactions
                  </TableCell>
                  <TableCell>
                    {/* Re-add View Details Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(statement)}
                      disabled={
                        isDetailsLoading &&
                        selectedStatement?.id === statement.id
                      }
                    >
                      {isDetailsLoading &&
                      selectedStatement?.id === statement.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "View Details"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 ml-2" // Added margin
                      onClick={() => setStatementToDelete(statement)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!statementToDelete}
        onOpenChange={(open) => !open && setStatementToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              statement, its associated transactions, and the uploaded file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (statementToDelete) {
                  handleDelete(statementToDelete);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-add Statement Details Dialog */}
      <Dialog
        open={!!selectedStatement}
        onOpenChange={() => {
          setSelectedStatement(null);
          setStatementDetails(null); // Clear details when closing
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Statement Details</DialogTitle>
            <DialogDescription>
              {selectedStatement?.filename} - {selectedStatement?.source_bank}
            </DialogDescription>
          </DialogHeader>
          {isDetailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : statementDetails && statementDetails.transactions.length > 0 ? (
            <div className="space-y-4 mt-4">
              <div className="rounded-lg border bg-muted p-4">
                <h3 className="font-medium mb-2 text-sm">Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total Amount
                    </p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(
                        statementDetails.summary.total_amount,
                        statementDetails.summary.currency
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total Transactions
                    </p>
                    <p className="text-lg font-semibold">
                      {statementDetails.summary.count}
                    </p>
                  </div>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto border rounded-md">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-10">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statementDetails.transactions.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {new Date(t.transaction_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {t.description}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(t.amount, t.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found for this statement.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
