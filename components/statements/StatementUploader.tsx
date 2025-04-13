"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icons } from "@/components/icons"; // Assuming you have an Icons component
import { Loader2 } from "lucide-react";

interface BankAccount {
  id: string;
  name: string; // Assuming a 'name' column exists for display
  type: string | null;
  user_id: string;
}

interface UploadResponse {
  message: string;
  bankType: string;
  processed: number;
  inserted: number;
  duplicates_skipped: number;
  errors: number;
}

export default function StatementUploader() {
  const supabase = createClient();
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
        .select("id, name, type, user_id")
        .eq("user_id", currentUserId);

      if (!isMounted) return;
      if (dbError) {
        setError(dbError.message);
      } else {
        setBankAccounts(data || []);
        if (data && data.length > 0) {
          setSelectedAccountId(data[0].id);
        } else {
          // Optional: Set error if no bank accounts found?
          // setError("No bank accounts found. Please add one first.");
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
        "application/vnd.ms-excel", // Older Excel format
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

  const handleAccountChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAccountId(event.target.value);
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
    // Style element on drag over maybe?
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0] || null;
    handleFileSelect(droppedFile);
    // Clear the file input visually if using drag/drop
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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

      // 2. Invoke function
      const { data: functionResponse, error: functionError } =
        await supabase.functions.invoke<UploadResponse>("process-statement", {
          body: { storagePath: filePath, bankAccountId: selectedAccountId },
        });

      if (functionError) {
        let detailedError = functionError.message;
        try {
          const errorJson = JSON.parse(
            functionError.context?.responseText || "{}"
          );
          if (errorJson.error)
            detailedError = `Function error: ${errorJson.error}`;
        } catch (e) {
          /* Ignore */
        }
        throw new Error(detailedError);
      }

      if (functionResponse) {
        const { message, inserted, processed, duplicates_skipped, errors } =
          functionResponse;
        let summary = `${message}. Processed: ${processed}, Inserted: ${inserted}, Skipped: ${duplicates_skipped}, Errors: ${errors}`;
        setSuccessMessage(summary);
        setFile(null); // Clear file input on success
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear visually too
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [file, selectedAccountId, supabase, userId, bankAccounts]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Upload New Statement</h2>

      {/* Combined Dropzone and Fields */}
      <div className="mb-4 space-y-4">
        {/* Bank Account Selection */}
        <div>
          <label
            htmlFor="bankAccount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Select Bank Account
          </label>
          <select
            id="bankAccount"
            value={selectedAccountId}
            onChange={handleAccountChange}
            disabled={
              isLoading || isFetchingAccounts || bankAccounts.length === 0
            }
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingAccounts && <option>Loading accounts...</option>}
            {!isFetchingAccounts && bankAccounts.length === 0 && (
              <option value="" disabled>
                No bank accounts found
              </option>
            )}
            {!isFetchingAccounts &&
              bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name ||
                    `Account ID: ${account.id.substring(0, 6)}...`}{" "}
                  ({account.type || "N/A"})
                </option>
              ))}
          </select>
        </div>

        {/* Drag and Drop / File Input */}
        <div>
          <label
            htmlFor="statementFile"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Statement File
          </label>
          <div
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${
              isDragging
                ? "border-indigo-500 bg-indigo-50"
                : "border-gray-300 border-dashed"
            } rounded-md cursor-pointer transition-colors duration-150 ease-in-out`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <div className="space-y-1 text-center pointer-events-none">
              {" "}
              {/* Pointer events none for children so div click works */}
              <Icons.upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <span className="relative font-medium text-indigo-600 hover:text-indigo-500">
                  Upload a file
                </span>
                <input
                  ref={fileInputRef}
                  id="statementFile"
                  name="statementFile"
                  type="file"
                  className="sr-only"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">CSV (Revolut), XLSX (BPI)</p>
            </div>
          </div>
          {file && (
            <p className="mt-2 text-sm text-gray-700">
              Selected file: {file.name}
            </p>
          )}
        </div>
      </div>

      {/* Status Messages */}
      <div className="min-h-[2rem]">
        {" "}
        {/* Reserve space for messages */}
        {isLoading && (
          <div className="flex items-center text-sm text-blue-600">
            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" />
            Processing statement...
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
            Error: {error}
          </p>
        )}
        {successMessage && (
          <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
            {successMessage}
          </p>
        )}
      </div>

      {/* Upload Button */}
      <div className="mt-4">
        <button
          onClick={handleUpload}
          disabled={
            isLoading ||
            !file ||
            !selectedAccountId ||
            bankAccounts.length === 0
          }
          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Processing..." : "Upload and Process Statement"}
        </button>
      </div>
    </div>
  );
}
