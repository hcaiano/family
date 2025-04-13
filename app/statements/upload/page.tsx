"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";

type BankType = "REVOLUT" | "BPI";

export default function UploadStatementPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBankType, setSelectedBankType] = useState<BankType | "">("");
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedBankType) {
      toast.error("Please select a file and bank type");
      return;
    }

    setIsUploading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        toast.error("Please log in to upload statements");
        return;
      }

      // Upload file
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${
        sessionData.session.user.id
      }/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("statements")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Create statement record
      const { error: statementError } = await supabase
        .from("statements")
        .insert({
          user_id: sessionData.session.user.id,
          storage_path: fileName,
          source_bank: selectedBankType,
          filename: selectedFile.name,
          uploaded_at: new Date().toISOString(),
        });

      if (statementError) throw statementError;

      // Call process-statement API endpoint to trigger background processing
      const payload = {
        storagePath: fileName, // Use the correct storage path variable
        bankType: selectedBankType,
      };
      console.log("Calling /api/process-statement with payload:", payload);

      const response = await fetch("/api/process-statement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Check if the API call itself was successful (e.g., 200 OK)
      // The API route will handle the actual processing asynchronously
      if (!response.ok) {
        // Try to parse the error response from the API
        let apiError = "Failed to start statement processing.";
        try {
          const errorData = await response.json();
          apiError = errorData.error || apiError;
        } catch (parseError) {
          // If parsing fails, use the status text
          apiError = response.statusText;
        }
        console.error("API call failed:", response.status, apiError);
        throw new Error(apiError);
      }

      toast.success("Statement upload started", {
        description: "Processing will happen in the background.",
      });
      router.push("/statements");
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast.error(err.message || "Failed to upload statement");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Upload Bank Statement</CardTitle>
            <CardDescription>
              Upload your bank statement to import transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <Label htmlFor="bank">Select Bank</Label>
                <Select
                  value={selectedBankType}
                  onValueChange={(value: BankType) =>
                    setSelectedBankType(value)
                  }
                >
                  <SelectTrigger id="bank">
                    <SelectValue placeholder="Select a bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REVOLUT">Revolut</SelectItem>
                    <SelectItem value="BPI">BPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="file">Statement File</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    selectedFile ? "bg-muted" : "hover:bg-muted/50"
                  } transition-colors cursor-pointer relative`}
                  onClick={() =>
                    document.querySelector<HTMLInputElement>("#file")?.click()
                  }
                >
                  <input
                    type="file"
                    id="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                  />
                  <div className="space-y-2">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-medium">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click to change file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CSV, XLSX, or XLS (max 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/statements")}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || !selectedBankType || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Statement
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
