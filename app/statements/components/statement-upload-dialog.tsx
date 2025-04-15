"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Loader2, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface BankAccount {
  id: string;
  account_name: string;
  bank_type: string | null;
  user_id: string;
}

type UploadResponse = {
  success: boolean;
  message: string;
  details?: string;
  statementId?: string;
  bankType?: string;
  transactionCount?: number;
  error?: string;
};

type FileUploadResult = {
  success: boolean;
  message: string;
  error?: string;
};

const BANK_FILE_TYPES: Record<string, { format: string; extension: string }> = {
  revolut: { format: "CSV", extension: ".csv" },
  bpi: { format: "XLSX", extension: ".xlsx" },
  // Add more banks here as needed
};

interface StatementUploadDialogProps {
  trigger?: React.ReactNode;
}

export default function StatementUploadDialog({
  trigger,
}: StatementUploadDialogProps) {
  const supabase = createClient();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statementId, setStatementId] = useState<string | null>(null);

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setFile(null);
      setError(null);
      setSuccessMessage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddBankAccount = () => {
    setIsOpen(false);
    router.push("/settings/bank-accounts");
  };

  // Fetch user ID and bank accounts on mount
  useEffect(() => {
    let isMounted = true;
    setIsFetchingAccounts(true);

    const fetchData = async () => {
      setError(null);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!isMounted) return;
      if (sessionError || !session?.user) {
        setError(sessionError?.message || "Could not fetch user session.");
        setIsFetchingAccounts(false);
        return;
      }

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      const { data, error: dbError } = await supabase
        .from("bank_accounts")
        .select("id, account_name, bank_type, user_id")
        .eq("user_id", currentUserId);

      if (!isMounted) return;
      if (dbError) {
        setError(dbError.message);
      } else {
        setBankAccounts(data || []);
        if (data && data.length > 0) {
          setSelectedAccountId(data[0].id);
        }
      }
      setIsFetchingAccounts(false);
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [supabase, isOpen]); // Refetch when dialog opens

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      // Basic validation for allowed types (client-side)
      const allowedTypes = [
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Invalid file type. Please upload a CSV or XLSX file.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccessMessage(null);
    } else {
      setFile(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files?.[0] || null);
  };

  const handleAccountChange = (value: string) => {
    setSelectedAccountId(value);
    setError(null);
    setSuccessMessage(null);
  };

  // Drag and Drop Handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0] || null;
    handleFileSelect(droppedFile);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getSelectedBankType = () => {
    if (!selectedAccountId) return null;
    const selectedAccount = bankAccounts.find(
      (account) => account.id === selectedAccountId
    );
    return selectedAccount?.bank_type?.toLowerCase() || null;
  };

  const getFileTypeText = () => {
    const bankType = getSelectedBankType();
    if (!bankType || !BANK_FILE_TYPES[bankType]) {
      return "Please select a bank account";
    }
    const { format } = BANK_FILE_TYPES[bankType];
    return `${format} file format required`;
  };

  const getAcceptedFileTypes = () => {
    const bankType = getSelectedBankType();
    if (!bankType || !BANK_FILE_TYPES[bankType]) {
      return ".csv,.xlsx,.xls";
    }
    return BANK_FILE_TYPES[bankType].extension;
  };

  const handleUpload = useCallback(async () => {
    if (!file) {
      setError("Please select a statement file.");
      return;
    }
    if (!selectedAccountId) {
      setError("Please select a bank account.");
      return;
    }
    if (!userId) {
      setError("User ID not found. Cannot upload.");
      return;
    }
    if (bankAccounts.length === 0) {
      setError("No bank accounts available for upload.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${userId}/${selectedAccountId}/${fileName}`;

      // 1. Upload file
      const { error: uploadError } = await supabase.storage
        .from("statements")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // 2. Process statement
      const response = await fetch("/api/process-statement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storagePath: filePath,
          bankAccountId: selectedAccountId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process statement");
      }

      const data: UploadResponse = await response.json();
      setSuccessMessage(data.details || null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Wait for the statement to be processed before closing
      setStatementId(data.statementId || null);
      if (data.statementId) {
        // Subscribe to changes for this specific statement
        const channel = supabase
          .channel(`statement_${data.statementId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "statements",
              filter: `id=eq.${data.statementId}`,
            },
            (payload) => {
              if (payload.new.status === "parsed") {
                // Statement is fully processed, close dialog
                setIsOpen(false);
                channel.unsubscribe();
              }
            }
          )
          .subscribe();

        // Set a timeout to close the dialog anyway after 5 seconds
        setTimeout(() => {
          setIsOpen(false);
          channel.unsubscribe();
        }, 5000);
      } else {
        // If no statement ID, close after 2 seconds
        setTimeout(() => {
          setIsOpen(false);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [file, selectedAccountId, supabase, userId, bankAccounts]);

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Upload Statement</DialogTitle>
        <DialogDescription>
          Upload a bank statement to import transactions
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 pt-4">
        {/* Bank Account Selection or Add Bank Account Button */}
        <div className="space-y-2">
          {bankAccounts.length === 0 && !isFetchingAccounts ? (
            <Button
              variant="outline"
              onClick={handleAddBankAccount}
              className="w-full"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Bank Account
            </Button>
          ) : (
            <>
              <Label htmlFor="bankAccount">Bank Account</Label>
              <Select
                value={selectedAccountId}
                onValueChange={handleAccountChange}
                disabled={isLoading || isFetchingAccounts}
              >
                <SelectTrigger id="bankAccount">
                  <SelectValue
                    placeholder={
                      isFetchingAccounts
                        ? "Loading accounts..."
                        : "Select a bank account"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {!isFetchingAccounts &&
                    bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} ({account.bank_type || "N/A"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* File Upload Area */}
        {(bankAccounts.length > 0 || isFetchingAccounts) && (
          <div className="space-y-2">
            <Label htmlFor="statementFile">Statement File</Label>
            <div
              className={`
                relative rounded-lg border-2 border-dashed p-6 transition-colors
                ${isDragging ? "border-primary bg-primary/5" : "border-muted"}
                ${isLoading ? "opacity-50" : "hover:bg-muted/5"}
                cursor-pointer
              `}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={triggerFileInput}
            >
              <input
                ref={fileInputRef}
                id="statementFile"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                accept={getAcceptedFileTypes()}
                disabled={isLoading || !selectedAccountId}
              />
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-sm">
                  <span className="font-medium text-primary">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </div>
                <p className="text-xs text-muted-foreground">
                  {getFileTypeText()}
                </p>
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
          </p>
        )}
        {successMessage && (
          <p className="text-sm text-primary bg-primary/10 p-2 rounded">
            {successMessage}
          </p>
        )}

        {/* Upload Button */}
        {(bankAccounts.length > 0 || isFetchingAccounts) && (
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={
              isLoading ||
              !file ||
              !selectedAccountId ||
              bankAccounts.length === 0
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Statement
              </>
            )}
          </Button>
        )}
      </div>
    </DialogContent>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Statement
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
