"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid"; // For generating unique file names
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// Import components for Date Picker
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils"; // Import cn utility

type InvoiceMetadata = {
  amount: string;
  currency: string;
  vendor: string;
  invoice_date: string; // Keep as string YYYY-MM-DD for storage
};

export default function InvoiceUploader({ userId }: { userId: string }) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    path: string;
    name: string;
    type: string;
  } | null>(null);
  const [metadata, setMetadata] = useState<InvoiceMetadata>({
    amount: "",
    currency: "EUR", // Default currency
    vendor: "",
    invoice_date: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!userId) {
        setError("User not identified. Cannot upload.");
        return;
      }
      if (acceptedFiles.length === 0) {
        return;
      }
      const file = acceptedFiles[0];
      const fileExt = file.name.split(".").pop();
      const uniqueFileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${userId}/${uniqueFileName}`; // Path includes user ID for RLS policies

      setUploading(true);
      setError(null);
      setSuccessMessage(null);
      setUploadedFile(null);

      try {
        const { data, error: uploadError } = await supabase.storage
          .from("invoices")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false, // Don't overwrite existing files (though UUID makes collisions unlikely)
          });

        if (uploadError) {
          throw uploadError;
        }

        console.log("Upload successful:", data);
        setUploadedFile({ path: filePath, name: file.name, type: file.type });
        // Reset metadata for new entry
        setMetadata({
          amount: "",
          currency: "EUR",
          vendor: "",
          invoice_date: "",
        });
      } catch (err: unknown) {
        console.error("Error uploading file:", err);
        const message = err instanceof Error ? err.message : String(err);
        setError(`Upload failed: ${message}`);
      } finally {
        setUploading(false);
      }
    },
    [supabase, userId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"],
    },
    multiple: false, // Allow only single file upload at a time
  });

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMetadata((prev) => ({ ...prev, [name]: value }));
  };

  // Handle date selection from Calendar
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setMetadata((prev) => ({
        ...prev,
        invoice_date: format(date, "yyyy-MM-dd"),
      }));
      setCalendarOpen(false); // Close the popover after selecting a date
    }
  };

  const handleSubmitMetadata = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uploadedFile) {
      setError("No file uploaded yet.");
      return;
    }

    // Basic validation
    if (!metadata.amount || !metadata.vendor || !metadata.invoice_date) {
      setError("Please fill in all metadata fields.");
      return;
    }

    setUploading(true); // Use uploading state for form submission as well
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: insertError } = await supabase.from("invoices").insert({
        user_id: userId,
        storage_path: uploadedFile.path,
        file_name: uploadedFile.name,
        file_type: uploadedFile.type,
        amount: parseFloat(metadata.amount), // Convert to number
        currency: metadata.currency,
        vendor: metadata.vendor,
        invoice_date: metadata.invoice_date, // Store as string/date based on DB column
        status: "pending_match",
      });

      if (insertError) {
        throw insertError;
      }

      setSuccessMessage("Invoice metadata saved successfully!");
      setUploadedFile(null); // Clear uploaded file state after successful save
      setMetadata({
        amount: "",
        currency: "EUR",
        vendor: "",
        invoice_date: "",
      }); // Clear form
    } catch (err: unknown) {
      console.error("Error saving metadata:", err);
      // Better Supabase error handling:
      let message = "An unknown error occurred.";
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "object" && err !== null && "message" in err) {
        // Check if it's an object with a message property (like Supabase errors)
        message = String(err.message);
      } else {
        message = String(err);
      }
      setError(`Failed to save metadata: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 border rounded-md">
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-md text-center cursor-pointer
                  ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }
                  ${uploadedFile ? "bg-green-50 border-green-300" : ""}`}
      >
        <input {...getInputProps()} />
        {uploadedFile ? (
          <p className="text-green-700">
            File &quot;{uploadedFile.name}&quot; ready. Fill metadata below.
          </p>
        ) : isDragActive ? (
          <p>Drop the invoice file here ...</p>
        ) : (
          <p>
            Drag &apos;n&apos; drop an invoice file here, or click to select
            (PDF, JPG, PNG)
          </p>
        )}
      </div>

      {uploading && !uploadedFile && <p>Uploading file...</p>}

      {uploadedFile && (
        <form onSubmit={handleSubmitMetadata} className="space-y-4">
          <h3 className="text-lg font-semibold">Enter Invoice Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                placeholder="e.g., 123.45"
                value={metadata.amount}
                onChange={handleMetadataChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency *</Label>
              <Input
                id="currency"
                name="currency"
                type="text"
                placeholder="e.g., EUR"
                value={metadata.currency}
                onChange={handleMetadataChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="vendor">Vendor *</Label>
              <Input
                id="vendor"
                name="vendor"
                type="text"
                placeholder="e.g., Example Corp"
                value={metadata.vendor}
                onChange={handleMetadataChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="invoice_date">Invoice Date *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !metadata.invoice_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {metadata.invoice_date ? (
                      format(
                        new Date(metadata.invoice_date + "T00:00:00"),
                        "PPP"
                      ) // Add T00:00:00 to parse as local date
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      metadata.invoice_date
                        ? new Date(metadata.invoice_date + "T00:00:00")
                        : undefined
                    }
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {/* Hidden input to satisfy form requirement if needed, though Button triggers selection */}
              <input
                type="hidden"
                name="invoice_date"
                value={metadata.invoice_date}
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={uploading}>
            {uploading ? "Saving..." : "Save Invoice Metadata"}
          </Button>
        </form>
      )}

      {error && <p className="text-red-500">Error: {error}</p>}
      {successMessage && <p className="text-green-500">{successMessage}</p>}
    </div>
  );
}
