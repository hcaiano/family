import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

// Define types directly within the hook file for co-location
export type Statement = {
  id: string;
  user_id: string;
  filename: string | null;
  storage_path: string;
  source_bank: string | null;
  transactions_count: number | null;
  created_at: string;
  updated_at: string;
  uploaded_at: string;
};

export interface StatementDetails {
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

export function useStatements() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [errorLoadingList, setErrorLoadingList] = useState<string | null>(null);

  const [statementToDelete, setStatementToDelete] = useState<Statement | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorDeleting, setErrorDeleting] = useState<string | null>(null);

  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(
    null
  );
  const [statementDetails, setStatementDetails] =
    useState<StatementDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [errorLoadingDetails, setErrorLoadingDetails] = useState<string | null>(
    null
  );

  const supabase = createClient();

  const fetchStatements = useCallback(async () => {
    console.log("🚀 [Hook] Fetching statements...");
    setIsLoadingList(true);
    setErrorLoadingList(null);
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user) {
        console.log("[Hook] No user session found or error, skipping fetch.");
        setStatements([]);
        setIsLoadingList(false);
        if (sessionError) throw sessionError;
        return;
      }

      const { data, error } = await supabase
        .from("statements")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      console.log("✅ [Hook] Statements fetched:", data?.length);
      setStatements(data || []);
    } catch (err: any) {
      console.error("[Hook] Error fetching statements:", err);
      const message = err.message || "Failed to fetch statements";
      setErrorLoadingList(message);
      toast.error(message);
      setStatements([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStatements();

    // Get current user's ID for filtering
    const getCurrentUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Set up real-time subscription for statements
        const channel = supabase
          .channel("statements_changes")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "statements",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("🔄 [Hook] New statement inserted:", payload);
              setStatements((prev) => [payload.new as Statement, ...prev]);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "statements",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("🔄 [Hook] Statement updated:", payload);
              setStatements((prev) =>
                prev.map((s) =>
                  s.id === payload.new.id ? (payload.new as Statement) : s
                )
              );
            }
          )
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "statements",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("🔄 [Hook] Statement deleted:", payload);
              setStatements((prev) =>
                prev.filter((s) => s.id !== payload.old.id)
              );
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    getCurrentUserId();
  }, [fetchStatements, supabase]);

  const confirmDelete = useCallback(async () => {
    if (!statementToDelete) return;

    console.log(
      `[Hook] Attempting to delete statement ID: ${statementToDelete.id}`
    );
    setIsDeleting(true);
    setErrorDeleting(null);

    try {
      // 1. Delete associated transactions
      const { data: deletedTransactions, error: transactionsError } =
        await supabase
          .from("transactions")
          .delete()
          .eq("statement_id", statementToDelete.id)
          .select("id");

      if (transactionsError) {
        console.error("[Hook] Transaction Deletion Failed:", transactionsError);
        throw new Error(
          `Transaction Deletion Failed: ${transactionsError.message}`
        );
      }

      // 2. Delete the statement record from database
      const { error: dbError } = await supabase
        .from("statements")
        .delete()
        .eq("id", statementToDelete.id);

      if (dbError) {
        console.error("[Hook] Statement Record Deletion Failed:", dbError);
        throw new Error(`Statement Record Deletion Failed: ${dbError.message}`);
      }

      // 3. Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from("statements")
        .remove([statementToDelete.storage_path]);

      if (storageError) {
        console.warn("[Hook] Storage Deletion Failed:", storageError);
      }

      // 4. Update UI state
      setStatements((prev) =>
        prev.filter((s) => s.id !== statementToDelete.id)
      );
      toast.success("Statement deleted successfully");
      setStatementToDelete(null);
    } catch (err: any) {
      console.error("[Hook] confirmDelete Error:", err);
      const errorMessage = err.message || "Unknown error during deletion";
      setErrorDeleting(errorMessage);
      toast.error(
        `Failed to delete statement: ${errorMessage}. Please try again.`
      );
      fetchStatements();
    } finally {
      setIsDeleting(false);
    }
  }, [statementToDelete, supabase, fetchStatements]);

  const viewDetails = useCallback(
    async (statement: Statement) => {
      if (!statement) {
        toast.error("Cannot fetch details for this statement.");
        return;
      }
      setSelectedStatement(statement);
      setIsDetailsLoading(true);
      setErrorLoadingDetails(null);
      setStatementDetails(null);
      try {
        const { data: transactions, error: fetchError } = await supabase
          .from("transactions")
          .select("transaction_date, description, amount, currency")
          .eq("statement_id", statement.id)
          .order("transaction_date", { ascending: false });

        if (fetchError) throw fetchError;

        if (!transactions || transactions.length === 0) {
          setStatementDetails({
            transactions: [],
            summary: { total_amount: 0, currency: "", count: 0 },
          });
          return;
        }

        const total = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const currency = transactions[0]?.currency || "";
        const calculatedSummary = {
          total_amount: total,
          currency: currency,
          count: transactions.length,
        };

        setStatementDetails({
          transactions: transactions.map((t) => ({
            ...t,
            amount: Number(t.amount),
          })),
          summary: calculatedSummary,
        });
      } catch (err: any) {
        console.error("[Hook] Failed to load details:", err);
        const message = err.message || "Failed to load statement details";
        setErrorLoadingDetails(message);
        toast.error(message);
        setStatementDetails(null);
      } finally {
        setIsDetailsLoading(false);
      }
    },
    [supabase]
  );

  const closeDetails = useCallback(() => {
    setSelectedStatement(null);
    setStatementDetails(null);
    setErrorLoadingDetails(null);
  }, []);

  const requestDelete = useCallback((statement: Statement) => {
    setErrorDeleting(null);
    setStatementToDelete(statement);
  }, []);

  const cancelDelete = useCallback(() => {
    setStatementToDelete(null);
    setErrorDeleting(null);
  }, []);

  return {
    statements,
    isLoadingList,
    errorLoadingList,
    fetchStatements,
    statementToDelete,
    isDeleting,
    errorDeleting,
    requestDelete,
    cancelDelete,
    confirmDelete,
    selectedStatement,
    statementDetails,
    isDetailsLoading,
    errorLoadingDetails,
    viewDetails,
    closeDetails,
  };
}
