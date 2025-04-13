import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import Papa from "papaparse";
import * as xlsx from "xlsx";

interface Transaction {
  transaction_date: string;
  amount: number;
  currency: string;
  description: string;
}

interface TransactionInsert {
  user_id: string;
  source_bank: string;
  transaction_date: string;
  amount: number;
  currency: string;
  description: string;
  source_id?: string | null;
  category?: string;
  notes?: string;
  status: string;
}

interface RequestPayload {
  storagePath: string;
  bankType: "REVOLUT" | "BPI";
}

export async function POST(req: Request) {
  console.log("🟢 API: Starting process-statement");
  try {
    // 1. Initialize Supabase Client
    const cookieStore = await cookies();
    console.log("🟢 API: Got cookies");

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: Partial<ResponseCookie>) {
            cookieStore.set(name, value, options);
          },
          remove(name: string) {
            cookieStore.delete(name);
          },
        },
      }
    );
    console.log("🟢 API: Initialized Supabase client");

    // 2. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log("🟢 API: Auth check result:", {
      user: !!user,
      error: !!authError,
    });

    if (authError || !user) {
      console.log("🔴 API: Unauthorized - no user or auth error");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Get Input
    const payload: RequestPayload = await req.json();
    const { storagePath, bankType } = payload;
    console.log("🟢 API: Got payload:", { storagePath, bankType });

    if (!storagePath || !bankType) {
      console.log("🔴 API: Missing payload data");
      return NextResponse.json(
        { error: "Missing storagePath or bankType in request body" },
        { status: 400 }
      );
    }

    // 4. Download File from Storage
    console.log("🟢 API: Attempting to download file from storage");
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("statements")
      .download(storagePath);

    if (downloadError || !fileBlob) {
      console.error("🔴 API: Error downloading file:", downloadError);
      return NextResponse.json(
        { error: "Failed to download file from storage" },
        { status: 500 }
      );
    }
    console.log("🟢 API: File downloaded successfully");

    // 5. Get Existing Transactions
    const { data: existingDbTransactions, error: fetchError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .in("source_bank", ["REVOLUT", "BPI"])
      .order("transaction_date", { ascending: false });

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch existing transactions" },
        { status: 500 }
      );
    }

    // 6. Process File Based on Bank Type
    let transactionsToInsert: TransactionInsert[] = [];
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    if (bankType === "REVOLUT") {
      console.log(`Processing Revolut CSV`);
      const fileContent = await fileBlob.text();
      try {
        const parsedCsv = Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
        });

        // Debug: Log the parsed CSV structure
        console.log("CSV Parse Result:", {
          data: parsedCsv.data.length,
          errors: parsedCsv.errors,
          meta: parsedCsv.meta,
        });

        // Debug: Log the first row to see its structure
        if (parsedCsv.data.length > 0) {
          console.log("First row structure:", parsedCsv.data[0]);
        }

        for (const row of parsedCsv.data as any[]) {
          processedCount++;

          try {
            // Debug: Log each row being processed
            console.log("Raw row data:", row);

            const completedDate = row["Date completed (UTC)"];
            if (!completedDate) {
              console.warn("Skipping row without completed date");
              errorCount++;
              continue;
            }

            const transactionDate = new Date(completedDate);
            if (isNaN(transactionDate.getTime())) {
              console.warn(`Invalid date format: ${completedDate}`);
              errorCount++;
              continue;
            }

            const description = row["Description"] || "";
            const amount = parseFloat(row["Amount"]);
            const currency = row["Payment currency"];

            // Add debug logging
            console.log("Processing row:", {
              date: completedDate,
              description,
              amount,
              currency,
              state: row["State"],
              rawAmount: row["Amount"], // Debug: Log raw amount before parsing
            });

            if (!currency) {
              console.warn("Skipping row without currency");
              errorCount++;
              continue;
            }

            if (isNaN(amount)) {
              console.warn(`Invalid amount format: ${row["Amount"]}`);
              errorCount++;
              continue;
            }

            // Only process COMPLETED transactions
            if (row["State"] !== "COMPLETED") {
              console.log(
                `Skipping non-completed transaction: ${row["State"]}`
              );
              skippedCount++;
              continue;
            }

            // Check for duplicates
            const isDuplicate = existingDbTransactions?.some(
              (t: Transaction) =>
                t.transaction_date ===
                  transactionDate.toISOString().split("T")[0] &&
                t.amount === amount &&
                t.currency === currency &&
                t.description === description
            );

            if (isDuplicate) {
              console.log("Skipping duplicate transaction");
              skippedCount++;
              continue;
            }

            // Debug: Log transaction being added
            console.log("Adding transaction:", {
              date: transactionDate.toISOString().split("T")[0],
              description: description.trim(),
              amount,
              currency,
              source_bank: "REVOLUT",
              status: "unmatched",
              source_id: storagePath,
            });

            transactionsToInsert.push({
              user_id: user.id,
              transaction_date: transactionDate.toISOString().split("T")[0],
              description: description.trim(),
              amount,
              currency,
              source_bank: "REVOLUT",
              status: "unmatched",
              source_id: storagePath,
            });
          } catch (rowError: any) {
            console.error("Error processing row:", rowError);
            errorCount++;
          }
        }

        // Debug: Log final counts
        console.log("Final counts:", {
          processedCount,
          skippedCount,
          errorCount,
          transactionsToInsert: transactionsToInsert.length,
        });
      } catch (csvError: any) {
        console.error("Error processing Revolut CSV:", csvError);
        return NextResponse.json(
          { error: "Failed to process Revolut CSV data" },
          { status: 500 }
        );
      }
    } else if (bankType === "BPI") {
      console.log(`Processing BPI XLSX`);
      const fileBuffer = await fileBlob.arrayBuffer();
      try {
        const workbook = xlsx.read(fileBuffer, { type: "buffer" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = xlsx.utils.sheet_to_json(worksheet);

        for (const row of jsonData as any[]) {
          processedCount++;

          try {
            const dateStr = row["Data Mov."];
            if (!dateStr) {
              console.warn("Skipping row without date");
              errorCount++;
              continue;
            }

            // Parse date (assuming format DD-MM-YYYY)
            const [day, month, year] = dateStr.split("-").map(Number);
            const transactionDate = new Date(year, month - 1, day);
            if (isNaN(transactionDate.getTime())) {
              console.warn(`Invalid date format: ${dateStr}`);
              errorCount++;
              continue;
            }

            const transactionDateIso = transactionDate
              .toISOString()
              .split("T")[0];
            const description = row["Descrição"] || "";

            // Parse amount and determine if it's debit or credit
            let parsedAmount = 0;
            const debitStr = row["Débito"];
            const creditStr = row["Crédito"];

            if (debitStr && debitStr !== "") {
              parsedAmount = -Math.abs(parseFloat(debitStr.replace(",", ".")));
            } else if (creditStr && creditStr !== "") {
              parsedAmount = Math.abs(parseFloat(creditStr.replace(",", ".")));
            }

            if (isNaN(parsedAmount)) {
              console.warn(`Invalid amount format: ${debitStr || creditStr}`);
              errorCount++;
              continue;
            }

            const parsedCurrency = "EUR"; // BPI statements are in EUR

            // Check for duplicates
            const isDuplicate = existingDbTransactions?.some(
              (t: Transaction) =>
                t.transaction_date === transactionDateIso &&
                t.amount === parsedAmount &&
                t.currency === parsedCurrency &&
                t.description === description
            );

            if (isDuplicate) {
              console.log("Skipping duplicate transaction");
              skippedCount++;
              continue;
            }

            transactionsToInsert.push({
              user_id: user.id,
              transaction_date: transactionDateIso,
              description: description?.trim() ?? "",
              amount: parsedAmount,
              currency: parsedCurrency,
              source_bank: "BPI",
              status: "unmatched",
              source_id: storagePath,
            });
          } catch (rowError: any) {
            console.error("Error processing row:", rowError);
            errorCount++;
          }
        }
      } catch (xlsxError: any) {
        console.error("Error processing BPI XLSX:", xlsxError);
        return NextResponse.json(
          { error: "Failed to process BPI XLSX data" },
          { status: 500 }
        );
      }
    } else {
      console.error(`Unsupported bank type: ${bankType}`);
      return NextResponse.json(
        { error: `Unsupported bank type: ${bankType}` },
        { status: 400 }
      );
    }

    // 8. Batch Insert Transactions
    if (transactionsToInsert.length > 0) {
      console.log(
        `Attempting to insert ${transactionsToInsert.length} new transactions.`
      );

      // Log the first transaction for debugging
      console.log(
        "Sample transaction:",
        JSON.stringify(transactionsToInsert[0], null, 2)
      );

      const { error: insertError, data: insertedData } = await supabase
        .from("transactions")
        .insert(transactionsToInsert)
        .select("id");

      if (insertError) {
        console.error("*** Database Insert Error ***");
        console.error("Error Message:", insertError.message);
        console.error("Error Details:", insertError.details);
        console.error("Error Hint:", insertError.hint);
        console.error("Error Code:", insertError.code);

        // Log the full error object for debugging
        console.error(
          "Full error object:",
          JSON.stringify(insertError, null, 2)
        );

        // Update statement status to error
        await supabase
          .from("statements")
          .update({
            status: "error",
            error_message: insertError.message,
          })
          .eq("storage_path", storagePath);

        return NextResponse.json(
          { error: `Failed to insert transactions: ${insertError.message}` },
          { status: 500 }
        );
      }

      console.log(
        `Successfully inserted ${insertedData?.length ?? 0} transactions.`
      );

      // Update statement status to completed and set transaction count
      await supabase
        .from("statements")
        .update({
          status: "completed",
          transactions_count: insertedData?.length ?? 0,
          processed_at: new Date().toISOString(),
        })
        .eq("storage_path", storagePath);
    } else {
      // No transactions to insert (all skipped or errors)
      await supabase
        .from("statements")
        .update({
          status: errorCount > 0 ? "error" : "completed",
          transactions_count: 0,
          error_message:
            errorCount > 0 ? "Failed to process any transactions" : null,
          processed_at: new Date().toISOString(),
        })
        .eq("storage_path", storagePath);
    }

    // 9. Return Response
    return NextResponse.json({
      message: `Successfully processed statement`,
      details: `Processed ${processedCount} transactions: ${transactionsToInsert.length} inserted, ${skippedCount} duplicates skipped, ${errorCount} errors`,
      bankType: bankType,
      processed: processedCount,
      inserted: transactionsToInsert.length,
      duplicates_skipped: skippedCount,
      errors: errorCount,
    });
  } catch (error: any) {
    console.error(`Error in process-statement:`, error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
