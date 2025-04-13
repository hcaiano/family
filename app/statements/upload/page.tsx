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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

type BankType = "REVOLUT" | "BPI";

export default function UploadStatementPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBankType, setSelectedBankType] = useState<BankType | "">("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedBankType) {
      setError("Please select a file and bank type");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        setError("Please log in to upload statements.");
        return;
      }

      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${
        sessionData.session.user.id
      }/${Math.random()}.${fileExt}`;

      console.log("Uploading file to storage:", {
        fileName,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
      });

      const { error: uploadError } = await supabase.storage
        .from("statements")
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      console.log("File uploaded successfully");

      // Create statement record in database
      const { error: dbError, data: statementData } = await supabase
        .from("statements")
        .insert({
          user_id: sessionData.session.user.id,
          filename: selectedFile.name,
          storage_path: fileName,
          source_bank: selectedBankType,
          status: "processing",
          transactions_count: 0,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database insert error:", dbError);
        throw dbError;
      }

      console.log("Statement record created:", statementData);

      // Call process-statement API endpoint
      const payload = {
        storagePath: fileName,
        bankType: selectedBankType,
      };
      console.log("Calling process-statement API with:", payload);

      const response = await fetch("/api/process-statement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("API Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error response:", errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || "Failed to process statement");
        } catch (e) {
          throw new Error("Failed to process statement: " + errorText);
        }
      }

      const responseData = await response.json();
      console.log("API Response data:", responseData);

      toast.success("Statement Uploaded", {
        description:
          "Your statement is being processed. You'll be notified when it's done.",
      });

      router.push("/statements");
    } catch (err: any) {
      console.error("Error in upload:", err);
      const errorMessage = err.message || "An unexpected error occurred";
      setError(errorMessage);
      toast.error("Upload Failed", {
        description: errorMessage,
      });
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
            <div className="space-y-6">
              <div className="space-y-2">
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

              <div className="space-y-2">
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

              {error && (
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/statements")}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
