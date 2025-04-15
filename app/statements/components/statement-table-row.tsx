import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Statement } from "../hooks/useStatements";

interface StatementTableRowProps {
  statement: Statement;
  onViewDetails: (statement: Statement) => void;
  onRequestDelete: (statement: Statement) => void;
  isDeleting: boolean;
  isDetailsLoading: boolean;
  isSelectedForDetails: boolean;
  isSelectedForDelete: boolean;
}

export function StatementTableRow({
  statement,
  onViewDetails,
  onRequestDelete,
  isDeleting,
  isDetailsLoading,
  isSelectedForDetails,
  isSelectedForDelete,
}: StatementTableRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{statement.filename}</TableCell>
      <TableCell>{statement.source_bank}</TableCell>
      <TableCell>
        {statement.uploaded_at
          ? formatDistanceToNow(new Date(statement.uploaded_at), {
              addSuffix: true,
            })
          : "N/A"}
      </TableCell>
      <TableCell className="text-right">
        {statement.transactions_count ?? 0} transactions
      </TableCell>
      <TableCell className="w-[180px] space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(statement)}
          disabled={isDetailsLoading && isSelectedForDetails}
        >
          {isDetailsLoading && isSelectedForDetails ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "View Details"
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700"
          onClick={() => onRequestDelete(statement)}
          disabled={isDeleting && isSelectedForDelete}
        >
          {isDeleting && isSelectedForDelete ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
