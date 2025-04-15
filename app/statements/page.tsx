"use client";

import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useStatements, Statement } from "./hooks/useStatements";

// Import the new components
import { StatementTableRow } from "./components/statement-table-row";
import { DeleteConfirmationDialog } from "./components/delete-confirmation-dialog";
import { StatementDetailsDialog } from "./components/statement-details-dialog";
import StatementUploadDialog from "./components/statement-upload-dialog";

export default function StatementsPage() {
  const {
    statements,
    isLoadingList,
    errorLoadingList,
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
  } = useStatements();

  // Handle loading state
  if (isLoadingList) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Handle error state
  if (errorLoadingList) {
    return (
      <div className="text-center text-red-600">
        <p>Error loading statements: {errorLoadingList}</p>
        {/* Optionally add a retry button */}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Bank Statements"
        description="Manage your bank statements and import transactions"
        action={{
          label: "Upload Statement",
          icon: Upload,
          onClick: () =>
            document.getElementById("upload-statement-trigger")?.click(),
        }}
      />

      {statements.length === 0 ? (
        <EmptyState
          title="No statements yet"
          description="Upload your first bank statement to get started"
          action={{
            label: "Upload Statement",
            icon: Upload,
            onClick: () =>
              document.getElementById("upload-statement-trigger")?.click(),
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
                <TableHead className="w-[180px]">Actions</TableHead>{" "}
                {/* Adjusted width */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((statement: Statement) => (
                <StatementTableRow
                  key={statement.id}
                  statement={statement}
                  onViewDetails={viewDetails}
                  onRequestDelete={requestDelete}
                  isDeleting={isDeleting}
                  isDetailsLoading={isDetailsLoading}
                  isSelectedForDetails={selectedStatement?.id === statement.id}
                  isSelectedForDelete={statementToDelete?.id === statement.id}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <StatementUploadDialog
        trigger={
          <Button id="upload-statement-trigger" className="hidden">
            Upload Statement
          </Button>
        }
      />

      {/* Render Delete Confirmation Dialog Component */}
      <DeleteConfirmationDialog
        open={!!statementToDelete}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        statementToDelete={statementToDelete}
        errorDeleting={errorDeleting}
      />

      {/* Render Statement Details Dialog Component */}
      <StatementDetailsDialog
        open={!!selectedStatement}
        onOpenChange={(open) => !open && closeDetails()}
        statement={selectedStatement}
        details={statementDetails}
        isLoading={isDetailsLoading}
        error={errorLoadingDetails}
      />
    </>
  );
}
