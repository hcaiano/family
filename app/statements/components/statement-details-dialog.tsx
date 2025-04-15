import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Statement, StatementDetails } from "../hooks/useStatements";

interface StatementDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: Statement | null;
  details: StatementDetails | null;
  isLoading: boolean;
  error: string | null;
}

export function StatementDetailsDialog({
  open,
  onOpenChange,
  statement,
  details,
  isLoading,
  error,
}: StatementDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Statement Details</DialogTitle>
          <DialogDescription>
            {statement?.filename} - {statement?.source_bank}
          </DialogDescription>
          {/* Display details loading error if it exists (but not if loading)*/}
          {error && !isLoading && (
            <p className="text-sm text-red-600 mt-2">Error: {error}</p>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : details && details.transactions.length > 0 ? (
          <div className="space-y-4 mt-4">
            <div className="rounded-lg border bg-muted p-4">
              <h3 className="font-medium mb-2 text-sm">Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(
                      details.summary.total_amount,
                      details.summary.currency
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Transactions
                  </p>
                  <p className="text-lg font-semibold">
                    {details.summary.count}
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
                  {details.transactions.map(
                    (
                      t: StatementDetails["transactions"][number],
                      i: number
                    ) => (
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
                    )
                  )}
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
  );
}
