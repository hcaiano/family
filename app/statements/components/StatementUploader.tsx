"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Loader2, PlusCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

interface BankAccount {
  id: string;
  account_name: string;
  bank_type: string | null;
  user_id: string;
}

interface UploadResponse {
  message: string;
  bankType: string;
  transactionCount: number;
  details: string;
}

interface FormValues {
  bankAccountId: string;
  file: File | null;
}

const validateForm = ({ value }: { value: FormValues }) => {
  if (!value.bankAccountId) {
    return "Bank account is required";
  }
  if (!value.file) {
    return "File is required";
  }
  return undefined;
};

const BANK_FILE_TYPES: Record<string, { format: string; extension: string }> = {
  revolut: { format: "CSV", extension: ".csv" },
  bpi: { format: "XLSX", extension: ".xlsx" },
  // Add more banks here as needed
};

export default function StatementUploader() {
  const supabase = createClient();
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      bankAccountId: "",
      file: null,
    } as FormValues,
    validators: {
      onChange: validateForm,
    },
    onSubmit: async ({ value }) => {
      if (!value.file || !value.bankAccountId || !userId) {
        return;
      }

      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const fileName = `${Date.now()}-${value.file.name}`;
        const filePath = `${userId}/${value.bankAccountId}/${fileName}`;

        // 1. Upload file
        const { error: uploadError } = await supabase.storage
          .from("statements")
          .upload(filePath, value.file);

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
            bankAccountId: value.bankAccountId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process statement");
        }

        const data: UploadResponse = await response.json();
        setSuccessMessage(data.details);
        form.reset();
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    },
  });

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
          form.setFieldValue("bankAccountId", data[0].id);
        }
      }
      setIsFetchingAccounts(false);
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

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
        form.setFieldValue("file", null);
        return;
      }
      form.setFieldValue("file", selectedFile);
      setError(null);
      setSuccessMessage(null);
    } else {
      form.setFieldValue("file", null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files?.[0] || null);
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

  const getSelectedBankType = () => {
    const selectedAccount = bankAccounts.find(
      (account) => account.id === form.state.values.bankAccountId
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

  const handleAddBankAccount = () => {
    router.push("/bank-accounts/new");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Upload Statement</CardTitle>
          <CardDescription>
            Upload a bank statement to import transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bank Account Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bankAccount">Bank Account</Label>
              {bankAccounts.length === 0 && !isFetchingAccounts && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddBankAccount}
                  className="h-8"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Bank Account
                </Button>
              )}
            </div>
            <form.Field name="bankAccountId">
              {(field) => (
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  disabled={
                    isLoading || isFetchingAccounts || bankAccounts.length === 0
                  }
                >
                  <SelectTrigger id="bankAccount">
                    <SelectValue
                      placeholder={
                        isFetchingAccounts
                          ? "Loading accounts..."
                          : bankAccounts.length === 0
                          ? "No bank accounts found"
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
              )}
            </form.Field>
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label htmlFor="statementFile">Statement File</Label>
            <form.Field name="file">
              {(field) => (
                <div
                  className={`
                    relative rounded-lg border-2 border-dashed p-6 transition-colors
                    ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted"
                    }
                    ${isLoading ? "opacity-50" : "hover:bg-muted/5"}
                    cursor-pointer
                  `}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    id="statementFile"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    accept={getAcceptedFileTypes()}
                    disabled={isLoading || !form.state.values.bankAccountId}
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
                    {field.state.value && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {field.state.value.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </form.Field>
          </div>

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
          <form.Subscribe
            selector={(state) => [
              state.canSubmit,
              state.isSubmitting,
              state.values.file,
              state.values.bankAccountId,
            ]}
          >
            {([canSubmit, isSubmitting, file, bankAccountId]) => (
              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  !file ||
                  !bankAccountId ||
                  bankAccounts.length === 0 ||
                  !canSubmit
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
          </form.Subscribe>
        </CardContent>
      </Card>
    </form>
  );
}
